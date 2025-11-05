// Celora Wallet Provider - Injected into page context
// Provides window.solana API for Solana dApp compatibility

(function() {
  'use strict';
  
  let requestId = 0;
  const pendingRequests = new Map();
  
  // Create the Celora provider - Full Phantom compatibility
  class CeloraProvider {
    constructor() {
      this.isConnected = false;
      this.publicKey = null;
      this.isCelora = true;
      this.isPhantom = true; // Critical for dApp compatibility
      
      // Event system for Phantom compatibility
      this._events = new Map();
      
      // Phantom-compatible properties
      this.solana = this; // Self-reference for compatibility
      
      // Listen for responses from content script
      window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        
        const { type, id, payload } = event.data;
        
        if (type && type.endsWith('_RESPONSE')) {
          const resolver = pendingRequests.get(id);
          if (resolver) {
            pendingRequests.delete(id);
            if (payload.success) {
              resolver.resolve(payload);
            } else {
              resolver.reject(new Error(payload.error || 'Request failed'));
            }
          }
        }
      });
    }
    
    // Full Phantom event system
    on(event, callback) {
      if (!this._events.has(event)) {
        this._events.set(event, new Set());
      }
      this._events.get(event).add(callback);
    }
    
    off(event, callback) {
      if (this._events.has(event)) {
        this._events.get(event).delete(callback);
      }
    }
    
    removeListener(event, callback) {
      this.off(event, callback);
    }
    
    removeAllListeners(event) {
      if (event) {
        this._events.delete(event);
      } else {
        this._events.clear();
      }
    }
    
    emit(event, data) {
      if (this._events.has(event)) {
        for (const callback of this._events.get(event)) {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in ${event} event handler:`, error);
          }
        }
      }
    }
    
    // Connect wallet
    async connect() {
      const id = requestId++;
      
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        
        window.postMessage({
          type: 'CELORA_CONNECT',
          id
        }, '*');
        
        // Timeout after 60 seconds
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Connection timeout'));
          }
        }, 60000);
      }).then((response) => {
        this.isConnected = true;
        this.publicKey = { toString: () => response.address };
        return { publicKey: this.publicKey };
      });
    }
    
    // Disconnect wallet
    async disconnect() {
      this.isConnected = false;
      this.publicKey = null;
    }
    
    // Sign transaction
    async signTransaction(transaction) {
      if (!this.isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const id = requestId++;
      
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        
        window.postMessage({
          type: 'CELORA_SIGN_TRANSACTION',
          id,
          payload: transaction
        }, '*');
        
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Transaction signing timeout'));
          }
        }, 60000);
      }).then((response) => {
        return { signature: response.signature };
      });
    }
    
    // Sign all transactions
    async signAllTransactions(transactions) {
      if (!this.isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const signed = [];
      for (const tx of transactions) {
        const result = await this.signTransaction(tx);
        signed.push(result);
      }
      return signed;
    }
    
    // Sign message
    async signMessage(message) {
      if (!this.isConnected) {
        throw new Error('Wallet not connected');
      }
      
      const id = requestId++;
      
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        
        window.postMessage({
          type: 'CELORA_SIGN_MESSAGE',
          id,
          payload: message
        }, '*');
        
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Message signing timeout'));
          }
        }, 60000);
      }).then((response) => {
        return { signature: response.signature };
      });
    }
    
    // Get balance
    async getBalance() {
      const id = requestId++;
      
      return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        
        window.postMessage({
          type: 'CELORA_GET_BALANCE',
          id
        }, '*');
        
        setTimeout(() => {
          if (pendingRequests.has(id)) {
            pendingRequests.delete(id);
            reject(new Error('Balance request timeout'));
          }
        }, 30000);
      }).then((response) => {
        return parseFloat(response.balance);
      });
    }
  }
  
  // Create provider instance
  const celoraProvider = new CeloraProvider();
  
  // Inject into window
  Object.defineProperty(window, 'solana', {
    value: celoraProvider,
    writable: false,
    configurable: false
  });
  
  // Also provide as celora for branding
  Object.defineProperty(window, 'celora', {
    value: celoraProvider,
    writable: false,
    configurable: false
  });
  
  // Dispatch ready event
  window.dispatchEvent(new Event('celoraReady'));
  
  console.log('Celora Wallet provider injected');
})();
