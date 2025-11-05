// Supabase Edge Function: Transaction Indexer
// Mimics Phantom's instant balance/transaction mirroring
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js@1.78.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransactionData {
  signature: string;
  slot: number;
  err: any;
  memo: string | null;
  blockTime: number | null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { walletAddress, network = 'devnet' } = await req.json()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'walletAddress required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to Solana RPC with multiple fallbacks
    const RPC_ENDPOINTS = {
      mainnet: [
        'https://api.mainnet-beta.solana.com',
        'https://ssc-dao.genesysgo.net',
        'https://solana-api.projectserum.com'
      ],
      devnet: [
        'https://api.devnet.solana.com',
        'https://devnet.genesysgo.net'
      ]
    }

    let connection: Connection | null = null
    const endpoints = RPC_ENDPOINTS[network as keyof typeof RPC_ENDPOINTS] || RPC_ENDPOINTS.devnet

    // Try endpoints until one works
    for (const endpoint of endpoints) {
      try {
        connection = new Connection(endpoint, 'confirmed')
        await connection.getVersion() // Test connection
        break
      } catch (e) {
        console.log(`Failed to connect to ${endpoint}:`, e)
      }
    }

    if (!connection) {
      throw new Error('All RPC endpoints failed')
    }

    const publicKey = new PublicKey(walletAddress)

    // Get latest transactions
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 100 })
    
    // Process each transaction
    const processedTransactions = []
    for (const sigInfo of signatures) {
      try {
        // Check if we already have this transaction
        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('signature', sigInfo.signature)
          .single()

        if (existing) continue // Skip if already processed

        // Get full transaction details
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0
        })

        if (!tx) continue

        // Parse transaction details
        const preBalance = tx.meta?.preBalances?.[0] || 0
        const postBalance = tx.meta?.postBalances?.[0] || 0
        const amount = (postBalance - preBalance) / 1e9 // Convert lamports to SOL

        const transactionData = {
          signature: sigInfo.signature,
          wallet_address: walletAddress,
          amount: amount,
          status: sigInfo.err ? 'failed' : 'confirmed',
          type: amount > 0 ? 'receive' : 'send',
          block_time: sigInfo.blockTime ? new Date(sigInfo.blockTime * 1000).toISOString() : null,
          slot: sigInfo.slot,
          fee: tx.meta?.fee ? tx.meta.fee / 1e9 : 0,
          network: network,
          created_at: new Date().toISOString()
        }

        // Insert into Supabase
        const { error } = await supabase
          .from('transactions')
          .insert([transactionData])

        if (error) {
          console.error('Error inserting transaction:', error)
        } else {
          processedTransactions.push(transactionData)
        }

      } catch (e) {
        console.error(`Error processing transaction ${sigInfo.signature}:`, e)
      }
    }

    // Get current balance
    const balance = await connection.getBalance(publicKey)
    const solBalance = balance / 1e9

    // Update wallet balance in Supabase
    await supabase
      .from('wallets')
      .update({ 
        balance: solBalance,
        last_sync: new Date().toISOString()
      })
      .eq('address', walletAddress)

    return new Response(
      JSON.stringify({
        success: true,
        balance: solBalance,
        newTransactions: processedTransactions.length,
        processed: processedTransactions
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Transaction indexer error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})