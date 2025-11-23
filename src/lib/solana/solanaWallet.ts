/**
 * Solana-Focused Non-Custodial Wallet Library
 * Optimized for gambling use case with instant transactions
 */

import { Keypair, PublicKey, Connection, Transaction, VersionedTransaction, LAMPORTS_PER_SOL, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { deriveWallet, hashMnemonic, type WalletKey, WalletEncryption, type SupportedBlockchain } from '@/lib/wallet/nonCustodialWallet';

export interface SolanaWallet {
  publicKey: PublicKey;
  address: string;
  privateKey: Uint8Array;
}

export interface SolanaTransactionOptions {
  priorityFee?: number; // Priority fee in lamports (for instant tx confirmation)
  maxRetries?: number;
  skipPreflight?: boolean;
}

/**
 * Derive Solana wallet from mnemonic
 */
export function deriveSolanaWallet(mnemonic: string, accountIndex: number = 0): SolanaWallet {
  const wallet = deriveWallet(mnemonic, 'solana', accountIndex);
  
  // Convert hex private key to Uint8Array
  const privateKeyBytes = Uint8Array.from(
    Buffer.from(wallet.privateKey.replace('0x', ''), 'hex')
  );
  
  // Create keypair (Solana uses first 32 bytes for Ed25519 seed)
  const keypair = Keypair.fromSeed(privateKeyBytes.slice(0, 32));
  
  return {
    publicKey: keypair.publicKey,
    address: keypair.publicKey.toBase58(),
    privateKey: keypair.secretKey,
  };
}

/**
 * Get Solana connection with Helius RPC
 */
export function getSolanaConnection(rpcUrl?: string): Connection {
  // Use Helius or QuickNode for better performance (especially for gambling)
  const url = rpcUrl || 
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
    process.env.HELIUS_RPC_URL ||
    'https://api.mainnet-beta.solana.com';
  
  return new Connection(url, 'confirmed');
}

/**
 * Get Solana balance
 */
export async function getSolanaBalance(address: string, connection?: Connection): Promise<number> {
  const conn = connection || getSolanaConnection();
  const publicKey = new PublicKey(address);
  const balance = await conn.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Send SOL with priority fee for instant confirmation
 * Perfect for gambling where speed matters
 */
export async function sendSol(
  fromWallet: SolanaWallet,
  toAddress: string,
  amount: number, // In SOL
  options?: SolanaTransactionOptions
): Promise<{ signature: string; slot?: number }> {
  const connection = getSolanaConnection();
  const toPublicKey = new PublicKey(toAddress);
  
  // Build transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: toPublicKey,
      lamports: Math.floor(amount * LAMPORTS_PER_SOL),
    })
  );

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromWallet.publicKey;

  // Add priority fee for instant confirmation (gambling requirement)
  if (options?.priorityFee) {
    // Priority fees in Solana are added via compute budget instructions
    const { ComputeBudgetProgram } = await import('@solana/web3.js');
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: options.priorityFee * 1000, // Convert lamports to microLamports
      })
    );
  }

  // Sign transaction
  transaction.sign(fromWallet as any); // Using keypair's sign method

  // Send and confirm
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromWallet as any],
    {
      commitment: 'confirmed',
      maxRetries: options?.maxRetries || 3,
      skipPreflight: options?.skipPreflight || false,
    }
  );

  return { signature };
}

/**
 * Estimate priority fee for instant confirmation
 * Checks current network congestion and suggests optimal fee
 */
export async function estimatePriorityFee(
  connection?: Connection
): Promise<number> {
  const conn = connection || getSolanaConnection();
  
  try {
    // Get recent priority fee from network
    const feeCalculator = await conn.getRecentPrioritizationFees();
    
    if (feeCalculator && feeCalculator.length > 0) {
      // Use median fee for instant confirmation
      const fees = feeCalculator
        .map(f => f.prioritizationFee)
        .sort((a, b) => a - b);
      const medianFee = fees[Math.floor(fees.length / 2)];
      
      // Add 20% buffer for gambling use case (want instant confirmation)
      return Math.ceil(medianFee * 1.2);
    }
  } catch (error) {
    console.warn('Failed to estimate priority fee', error);
  }
  
  // Default priority fee for instant confirmation (1000 microLamports = 0.001 SOL per CU)
  return 1000;
}

/**
 * Subscribe to account balance changes (WebSocket)
 * Perfect for real-time updates when user wins/loses bets
 */
export function subscribeToBalance(
  address: string,
  callback: (balance: number) => void,
  connection?: Connection
): () => void {
  const conn = connection || getSolanaConnection();
  const publicKey = new PublicKey(address);
  
  // Subscribe to account changes
  const subscriptionId = conn.onAccountChange(
    publicKey,
    (accountInfo) => {
      const balance = accountInfo.lamports / LAMPORTS_PER_SOL;
      callback(balance);
    },
    'confirmed'
  );
  
  // Return unsubscribe function
  return () => {
    conn.removeAccountChangeListener(subscriptionId);
  };
}

/**
 * Subscribe to transaction updates
 * Get real-time transaction confirmations
 */
export function subscribeToTransaction(
  signature: string,
  callback: (status: 'confirmed' | 'failed' | 'pending') => void,
  connection?: Connection
): () => void {
  const conn = connection || getSolanaConnection();
  
  // Subscribe to signature notifications
  const subscriptionId = conn.onSignature(
    signature,
    (result, context) => {
      if (result.err) {
        callback('failed');
      } else {
        callback('confirmed');
      }
    },
    'confirmed'
  );
  
  // Return unsubscribe function
  return () => {
    conn.removeSignatureListener(subscriptionId);
  };
}

/**
 * Build and sign transaction (returns signed transaction for client-side signing)
 */
export async function buildSolanaTransaction(
  fromWallet: SolanaWallet,
  toAddress: string,
  amount: number,
  options?: SolanaTransactionOptions
): Promise<{ transaction: Transaction; signature?: string }> {
  const connection = getSolanaConnection();
  const toPublicKey = new PublicKey(toAddress);
  
  // Build transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: toPublicKey,
      lamports: Math.floor(amount * LAMPORTS_PER_SOL),
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromWallet.publicKey;

  // Add priority fee if specified
  if (options?.priorityFee) {
    const { ComputeBudgetProgram } = await import('@solana/web3.js');
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: options.priorityFee * 1000,
      })
    );
  }

  // Sign transaction
  transaction.sign(fromWallet as any);

  // Serialize for sending
  const serialized = transaction.serialize({
    requireAllSignatures: true,
    verifySignatures: false,
  });

  return {
    transaction,
    signature: undefined, // Will be set after confirmation
  };
}

/**
 * Broadcast signed transaction (non-custodial)
 */
export async function broadcastSignedTransaction(
  signedTransaction: string | Uint8Array,
  connection?: Connection
): Promise<{ signature: string; slot?: number }> {
  const conn = connection || getSolanaConnection();
  
  // Convert to Buffer if string
  const txBuffer = typeof signedTransaction === 'string'
    ? Buffer.from(signedTransaction, 'base64')
    : Buffer.from(signedTransaction);
  
  // Send raw transaction bytes
  const signature = await conn.sendRawTransaction(txBuffer, {
    skipPreflight: false,
    maxRetries: 3,
  });
  
  // Wait for confirmation
  await conn.confirmTransaction(signature, 'confirmed');
  
  // Get transaction details
  const tx = await conn.getTransaction(signature, {
    commitment: 'confirmed',
  });
  
  return {
    signature,
    slot: tx?.slot,
  };
}

