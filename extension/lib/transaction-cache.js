// Transaction Cache Service for instant balance (Phantom-style)
// Caches transactions in Supabase for fast loading

const TransactionCacheService = {
  // Initialize transaction caching
  async init() {
    console.log('🔄 Transaction cache service initialized');
  },

  // Get cached balance (instant like Phantom)
  async getCachedBalance(address) {
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance, last_sync')
        .eq('address', address)
        .single();

      if (wallet) {
        const age = Date.now() - new Date(wallet.last_sync).getTime();
        // Cache is valid for 30 seconds
        if (age < 30000) {
          console.log('📦 Using cached balance:', wallet.balance);
          return {
            balance: parseFloat(wallet.balance),
            cached: true,
            age: Math.round(age / 1000)
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting cached balance:', error);
      return null;
    }
  },

  // Get cached transactions (instant like Phantom)
  async getCachedTransactions(address, limit = 20) {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_address', address)
        .order('block_time', { ascending: false })
        .limit(limit);

      return transactions || [];
    } catch (error) {
      console.error('Error getting cached transactions:', error);
      return [];
    }
  },

  // Sync with blockchain (background)
  async syncTransactions(address) {
    try {
      console.log('🔄 Syncing transactions for', address);
      
      // Call our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('transaction-indexer', {
        body: { 
          walletAddress: address,
          network: 'devnet'
        }
      });

      if (error) {
        console.error('Sync error:', error);
        return false;
      }

      console.log(`✅ Synced ${data.newTransactions} new transactions`);
      return true;
    } catch (error) {
      console.error('Transaction sync failed:', error);
      return false;
    }
  },

  // Get balance with cache-first approach (Phantom-style)
  async getBalance(address) {
    // First, try cached balance
    const cached = await this.getCachedBalance(address);
    if (cached) {
      // Start background sync but return cached immediately
      this.syncTransactions(address).catch(console.error);
      return cached;
    }

    // No cache, get from blockchain
    try {
      await SolanaService.init();
      const publicKey = new window.solanaWeb3.PublicKey(address);
      const balance = await SolanaService.connection.getBalance(publicKey);
      const solBalance = balance / 1e9;

      // Update cache
      await supabase
        .from('wallets')
        .upsert({
          address: address,
          balance: solBalance,
          last_sync: new Date().toISOString()
        });

      return {
        balance: solBalance,
        cached: false
      };
    } catch (error) {
      console.error('Balance fetch failed:', error);
      throw error;
    }
  },

  // Get transactions with cache-first approach  
  async getTransactions(address, limit = 20) {
    // First, show cached transactions
    const cached = await this.getCachedTransactions(address, limit);
    
    // Start background sync
    this.syncTransactions(address).catch(console.error);
    
    return cached;
  },

  // Real-time transaction updates (like Phantom)
  subscribeToTransactions(address, callback) {
    const channel = supabase
      .channel(`transactions:${address}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `wallet_address=eq.${address}`
        },
        (payload) => {
          console.log('📨 Real-time transaction update:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  }
};

// Export for use in popup
window.TransactionCacheService = TransactionCacheService;