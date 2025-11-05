// SPL Token Service - Phantom-compatible token support
// Handles SPL tokens, metadata, and NFTs

const SPLTokenService = {
  // Popular SPL tokens (like Phantom's built-in list)
  knownTokens: {
    // Devnet tokens for testing
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
      symbol: 'BONK',
      name: 'Bonk',
      decimals: 5,
      logoURI: '/assets/tokens/bonk.png'
    },
    'So11111111111111111111111111111111111111112': {
      symbol: 'SOL',
      name: 'Wrapped SOL',
      decimals: 9,
      logoURI: '/assets/tokens/sol.png'
    }
  },

  // Initialize SPL token support
  async init() {
    console.log('🪙 SPL Token service initialized');
  },

  // Get all token accounts for a wallet
  async getTokenAccounts(address) {
    try {
      await SolanaService.init();
      
      const publicKey = new window.solanaWeb3.PublicKey(address);
      
      // Get all token accounts
      const tokenAccounts = await SolanaService.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens = [];
      
      for (const account of tokenAccounts.value) {
        const accountInfo = account.account.data.parsed.info;
        const mint = accountInfo.mint;
        const balance = accountInfo.tokenAmount;
        
        if (balance.uiAmount > 0) {
          // Get token metadata
          const metadata = await this.getTokenMetadata(mint);
          
          tokens.push({
            mint,
            balance: balance.uiAmount,
            decimals: balance.decimals,
            symbol: metadata.symbol,
            name: metadata.name,
            logoURI: metadata.logoURI,
            address: account.pubkey.toString()
          });
        }
      }

      return tokens;
    } catch (error) {
      console.error('Error getting token accounts:', error);
      return [];
    }
  },

  // Get token metadata (symbol, name, logo)
  async getTokenMetadata(mint) {
    // Check known tokens first
    if (this.knownTokens[mint]) {
      return this.knownTokens[mint];
    }

    try {
      // Try to get from Solana Token List API
      const response = await fetch(`https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json`);
      const tokenList = await response.json();
      
      const token = tokenList.tokens.find(t => t.address === mint);
      if (token) {
        return {
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI
        };
      }
    } catch (error) {
      console.warn('Failed to fetch token metadata:', error);
    }

    // Fallback
    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 9,
      logoURI: '/assets/tokens/unknown.png'
    };
  },

  // Send SPL token
  async sendToken(fromAddress, toAddress, mint, amount, decimals) {
    try {
      await SolanaService.init();
      
      // Get keypair (this would need to be passed from popup)
      // For now, throw error - implement proper key management
      throw new Error('SPL token sending requires secure key management implementation');
      
    } catch (error) {
      console.error('SPL token send failed:', error);
      throw error;
    }
  },

  // Get NFTs for wallet
  async getNFTs(address) {
    try {
      // This would integrate with Metaplex for full NFT support
      // For now, return empty array
      console.log('🖼️ NFT support coming in v2.0');
      return [];
    } catch (error) {
      console.error('Error getting NFTs:', error);
      return [];
    }
  },

  // Cache token balances for instant loading
  async cacheTokenBalances(address) {
    try {
      const tokens = await this.getTokenAccounts(address);
      
      // Store in Supabase for caching
      const { error } = await supabase
        .from('token_balances')
        .upsert({
          wallet_address: address,
          tokens: tokens,
          last_sync: new Date().toISOString()
        });

      if (error) {
        console.error('Error caching token balances:', error);
      } else {
        console.log(`📦 Cached ${tokens.length} token balances`);
      }

      return tokens;
    } catch (error) {
      console.error('Token balance caching failed:', error);
      return [];
    }
  },

  // Get cached token balances (instant like Phantom)
  async getCachedTokenBalances(address) {
    try {
      const { data } = await supabase
        .from('token_balances')
        .select('tokens, last_sync')
        .eq('wallet_address', address)
        .single();

      if (data) {
        const age = Date.now() - new Date(data.last_sync).getTime();
        // Cache valid for 2 minutes
        if (age < 120000) {
          console.log('📦 Using cached token balances');
          return data.tokens || [];
        }
      }

      // Cache expired, refresh in background
      this.cacheTokenBalances(address).catch(console.error);
      return data?.tokens || [];
    } catch (error) {
      console.error('Error getting cached token balances:', error);
      return [];
    }
  }
};

// Export for use in popup
window.SPLTokenService = SPLTokenService;