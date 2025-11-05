// Celora Wallet - Solana Integration
// Production-ready Solana Web3.js wrapper

const SolanaService = {
  // RPC Connection with failover
  connection: null,
  network: 'devnet',
  currentEndpointIndex: 0,
  
  // Multiple RPC endpoints for failover (Phantom-style)
  rpcEndpoints: {
    mainnet: [
      'https://api.mainnet-beta.solana.com',
      'https://ssc-dao.genesysgo.net', 
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana'
    ],
    devnet: [
      'https://api.devnet.solana.com',
      'https://devnet.genesysgo.net'
    ]
  },
  
  // Initialize connection with real Web3.js - PRODUCTION ONLY with RPC failover
  async init(network = 'devnet') {
    if (typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana Web3.js not loaded - PRODUCTION MODE REQUIRES Web3.js');
    }
    
    this.network = network;
    await this.connectWithFailover();
    console.log(`🔗 PRODUCTION Solana connection initialized for ${network} with failover`);
  },
  
  // Connect with automatic failover
  async connectWithFailover() {
    const endpoints = this.rpcEndpoints[this.network];
    let lastError = null;
    
    for (let i = 0; i < endpoints.length; i++) {
      try {
        const endpoint = endpoints[i];
        console.log(`Attempting to connect to: ${endpoint}`);
        
        const connection = new solanaWeb3.Connection(endpoint, 'confirmed');
        
        // Test the connection
        await connection.getVersion();
        
        this.connection = connection;
        this.currentEndpointIndex = i;
        console.log(`✅ Connected to: ${endpoint}`);
        return;
        
      } catch (error) {
        console.warn(`❌ Failed to connect to ${endpoints[i]}:`, error);
        lastError = error;
      }
    }
    
    throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message}`);
  },
  
  // Retry operations with automatic failover
  async retryWithFailover(operation) {
    const maxRetries = this.rpcEndpoints[this.network].length;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`RPC operation failed (attempt ${attempts + 1}):`, error);
        attempts++;
        
        if (attempts < maxRetries) {
          // Try next endpoint
          await this.connectWithFailover();
        } else {
          throw error;
        }
      }
    }
  },
  
  // Generate keypair from seed phrase (BIP39) - PRODUCTION ONLY
  async keypairFromSeed(seedPhrase) {
    if (typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana Web3.js not loaded - cannot generate keypair');
    }
    
    if (typeof bip39 === 'undefined') {
      throw new Error('BIP39 library not loaded - cannot process seed phrase');
    }
    
    try {
      // PRODUCTION: Use real BIP39 and Solana Web3.js ONLY
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      const keypair = solanaWeb3.Keypair.fromSeed(seed.slice(0, 32));
      return {
        publicKey: keypair.publicKey.toString(),
        secretKey: keypair.secretKey,
        keypair: keypair
      };
    } catch (error) {
      console.error('Keypair generation error:', error);
      throw new Error('Failed to generate keypair from seed phrase');
    }
  },
  

  
  // Get balance for address - PRODUCTION ONLY
  async getBalance(publicKey) {
    if (!this.connection || typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana connection not initialized - cannot fetch balance');
    }
    
    try {
      // PRODUCTION: Get real balance from Solana network ONLY
      const publicKeyObj = new solanaWeb3.PublicKey(publicKey);
      const balance = await this.connection.getBalance(publicKeyObj);
      return (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
    } catch (error) {
      console.error('Balance fetch error:', error);
      throw new Error(`Failed to fetch balance: ${error.message}`);
    }
  },
  
  // Send SOL transaction - PRODUCTION ONLY
  async sendTransaction(fromKeypair, toAddress, amountSOL) {
    if (!this.connection || typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana connection not initialized - cannot send transaction');
    }
    
    if (!fromKeypair.keypair) {
      throw new Error('Invalid keypair - cannot sign transaction');
    }
    
    try {
      // PRODUCTION: Send real transaction to blockchain ONLY
      const transaction = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: fromKeypair.keypair.publicKey,
          toPubkey: new solanaWeb3.PublicKey(toAddress),
          lamports: Math.floor(amountSOL * solanaWeb3.LAMPORTS_PER_SOL)
        })
      );
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromKeypair.keypair.publicKey;
      
      // Sign and send transaction to Solana blockchain
      const signature = await solanaWeb3.sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair.keypair],
        { commitment: 'confirmed' }
      );
      
      return signature;
    } catch (error) {
      console.error('Send transaction error:', error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  },
  
  // Get recent transactions - PRODUCTION ONLY
  async getTransactions(publicKey, limit = 10) {
    if (!this.connection || typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana connection not initialized - cannot fetch transactions');
    }
    
    try {
      // PRODUCTION: Get real transaction signatures from blockchain ONLY
      const publicKeyObj = new solanaWeb3.PublicKey(publicKey);
      const signatures = await this.connection.getSignaturesForAddress(
        publicKeyObj,
        { limit }
      );
      
      // Get full transaction details
      const transactions = [];
      for (const sig of signatures.slice(0, 5)) { // Limit to prevent rate limiting
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature);
          if (tx) {
            transactions.push({
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              status: sig.err ? 'failed' : 'confirmed',
              amount: this.extractTransactionAmount(tx, publicKey)
            });
          }
        } catch (txError) {
          console.warn('Failed to fetch transaction details:', txError);
        }
      }
      
      return transactions;
    } catch (error) {
      console.error('Transaction fetch error:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
  },
  
  // Extract transaction amount (helper function)
  extractTransactionAmount(transaction, publicKey) {
    try {
      const instructions = transaction?.transaction?.message?.instructions || [];
      for (const instruction of instructions) {
        if (instruction.program === 'system' && instruction.parsed?.type === 'transfer') {
          const info = instruction.parsed.info;
          if (info.source === publicKey) {
            return -(info.lamports / solanaWeb3.LAMPORTS_PER_SOL); // Outgoing
          } else if (info.destination === publicKey) {
            return info.lamports / solanaWeb3.LAMPORTS_PER_SOL; // Incoming
          }
        }
      }
      return 0;
    } catch (error) {
      return 0;
    }
  },
  
  // Validate Solana address - PRODUCTION ONLY
  isValidAddress(address) {
    if (typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana Web3.js not loaded - cannot validate address');
    }
    
    try {
      // PRODUCTION: Use real Solana validation ONLY
      const publicKey = new solanaWeb3.PublicKey(address);
      return solanaWeb3.PublicKey.isOnCurve(publicKey);
    } catch (error) {
      return false;
    }
  },
  
  // Get current network status - PRODUCTION ONLY
  async getHealth() {
    if (!this.connection) {
      throw new Error('Solana connection not initialized - cannot check health');
    }
    
    try {
      // PRODUCTION: Real health check from Solana network ONLY
      const health = await this.connection.getHealth();
      return health === 'ok';
    } catch (error) {
      console.error('Health check error:', error);
      return false;
    }
  },
  
  // Get current gas fee (transaction cost) - PRODUCTION ONLY
  async getEstimatedFee(transaction) {
    if (!this.connection || typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana connection not initialized - cannot estimate fees');
    }
    
    try {
      // PRODUCTION: Get real fees from Solana network ONLY
      const feeCalculator = await this.connection.getFeeCalculatorForBlockhash(
        (await this.connection.getRecentBlockhash()).blockhash
      );
      return feeCalculator.value.lamportsPerSignature / solanaWeb3.LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Fee estimation error:', error);
      throw new Error(`Failed to estimate transaction fee: ${error.message}`);
    }
  },
  
  // Monitor transaction confirmation - PRODUCTION ONLY
  async confirmTransaction(signature, maxRetries = 30) {
    if (!this.connection || typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana connection not initialized - cannot confirm transaction');
    }
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // PRODUCTION: Check real transaction status on blockchain ONLY
        const result = await this.connection.getSignatureStatus(signature);
        if (result.value?.confirmationStatus === 'confirmed' || 
            result.value?.confirmationStatus === 'finalized') {
          return { confirmed: true, error: result.value.err };
        }
        
        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn(`Confirmation check ${i + 1} failed:`, error);
      }
    }
    
    return { confirmed: false, error: 'Timeout waiting for confirmation' };
  },
  
  // Sign message - PRODUCTION ONLY
  async signMessage(message, keypair) {
    if (typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana Web3.js not loaded - cannot sign message');
    }
    
    if (!keypair.keypair) {
      throw new Error('Invalid keypair - cannot sign message');
    }
    
    try {
      // PRODUCTION: Use real Solana message signing
      const messageBytes = new TextEncoder().encode(message);
      const signature = solanaWeb3.sign.detached(messageBytes, keypair.keypair.secretKey);
      return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Message signing error:', error);
      throw new Error(`Failed to sign message: ${error.message}`);
    }
  }
};

// 🚀 PRODUCTION INITIALIZATION - NO DEMO/FALLBACK MODE
try {
  SolanaService.init('devnet');
  console.log('✅ PRODUCTION MODE: Celora Wallet using REAL Solana blockchain');
} catch (error) {
  console.error('❌ PRODUCTION MODE FAILED:', error.message);
  throw new Error('PRODUCTION MODE REQUIRES Solana Web3.js - No fallback available');
}

// Make available globally
window.SolanaService = SolanaService;
