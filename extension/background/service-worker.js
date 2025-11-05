// Celora Wallet Extension - Background Service Worker
// Handles background operations, notifications, and state management

// Import required scripts for production operations
importScripts('../lib/config.js');
importScripts('../lib/solana.js');
importScripts('../lib/crypto.js');

console.log('Celora Wallet Service Worker initialized');

// Store pending connection requests
const pendingConnections = new Map();
const pendingTransactions = new Map();

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Celora Wallet installed');
    
    // Set default settings
    await chrome.storage.local.set({
      network: 'devnet',
      autoLock: true,
      lockTimeout: 15 // minutes
    });
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'SIGN_TRANSACTION':
      handleSignTransaction(message.data, sendResponse);
      return true; // Keep channel open for async response
      
    case 'CONNECT_WALLET':
      handleConnectWallet(message.data, sendResponse);
      return true;
      
    case 'GET_BALANCE':
      handleGetBalance(sendResponse);
      return true;
      
    case 'SIGN_MESSAGE':
      handleSignMessage(message.data, sendResponse);
      return true;
      
    case 'TRANSACTION_UPDATE':
      handleTransactionUpdate(message.data);
      break;
      
    case 'CONNECTION_APPROVED':
    case 'CONNECTION_REJECTED':
      handleConnectionResponse(message.data);
      break;
      
    case 'TRANSACTION_APPROVED':
    case 'TRANSACTION_REJECTED':
      handleTransactionResponse(message.data);
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
});

// Handle transaction signing requests from dApps
async function handleSignTransaction(data, sendResponse) {
  try {
    const { transaction, origin } = data;
    
    // Get current wallet from storage
    const { walletAddress, seedPhrase } = await chrome.storage.local.get(['walletAddress', 'seedPhrase']);
    
    if (!walletAddress || !seedPhrase) {
      sendResponse({ success: false, error: 'No wallet found' });
      return;
    }
    
    // Show notification to user for approval
    const approved = await showTransactionApproval(transaction, origin);
    
    if (!approved) {
      sendResponse({ success: false, error: 'Transaction rejected by user' });
      return;
    }
    
    // PRODUCTION: Use real Solana Web3.js to sign and send transaction
    if (typeof SolanaService === 'undefined') {
      throw new Error('SolanaService not available - cannot sign transaction');
    }
    
    const keypair = await SolanaService.keypairFromSeed(seedPhrase);
    const signature = await SolanaService.sendTransaction(keypair, transaction.recipient, transaction.amount);
    
    sendResponse({
      success: true,
      signature
    });
    
  } catch (error) {
    console.error('Error signing transaction:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle wallet connection requests from dApps
async function handleConnectWallet(data, sendResponse) {
  try {
    const { origin } = data;
    
    // Get current wallet
    const { walletAddress } = await chrome.storage.local.get(['walletAddress']);
    
    if (!walletAddress) {
      sendResponse({ success: false, error: 'No wallet found' });
      return;
    }
    
    // Check if this origin is already connected
    const { connectedSites = {} } = await chrome.storage.local.get(['connectedSites']);
    
    if (connectedSites[origin]) {
      sendResponse({ success: true, address: walletAddress });
      return;
    }
    
    // Show connection approval
    const approved = await showConnectionApproval(origin);
    
    if (!approved) {
      sendResponse({ success: false, error: 'Connection rejected by user' });
      return;
    }
    
    // Store connected site
    connectedSites[origin] = {
      address: walletAddress,
      connectedAt: Date.now()
    };
    
    await chrome.storage.local.set({ connectedSites });
    
    sendResponse({
      success: true,
      address: walletAddress
    });
    
  } catch (error) {
    console.error('Error connecting wallet:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle balance requests
async function handleGetBalance(sendResponse) {
  try {
    const { walletAddress } = await chrome.storage.local.get(['walletAddress']);
    
    if (!walletAddress) {
      sendResponse({ success: false, error: 'No wallet found' });
      return;
    }
    
    // PRODUCTION: Fetch real balance from Solana network
    if (typeof SolanaService === 'undefined') {
      throw new Error('SolanaService not available - cannot fetch balance');
    }
    
    const balance = await SolanaService.getBalance(walletAddress);
    
    sendResponse({
      success: true,
      balance
    });
    
  } catch (error) {
    console.error('Error getting balance:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle transaction status updates
function handleTransactionUpdate(data) {
  const { signature, status } = data;
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/icons/icon48.png',
    title: 'Transaction Update',
    message: `Transaction ${signature.substring(0, 8)}... is ${status}`
  });
}

// Show transaction approval popup
async function showTransactionApproval(transaction, origin) {
  return new Promise((resolve, reject) => {
    const requestId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    
    // Store the resolver for this request
    pendingTransactions.set(requestId, { resolve, reject });
    
    // Create popup URL with parameters
    const txData = encodeURIComponent(JSON.stringify({
      transaction,
      origin,
      requestId
    }));
    
    const popupUrl = chrome.runtime.getURL(
      `popup/transaction-approval.html?data=${txData}`
    );
    
    // Open popup window
    chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    }, (window) => {
      if (chrome.runtime.lastError) {
        pendingTransactions.delete(requestId);
        reject(new Error('Failed to open approval popup'));
        return;
      }
      
      // Set timeout for user response (60 seconds)
      setTimeout(() => {
        if (pendingTransactions.has(requestId)) {
          pendingTransactions.delete(requestId);
          resolve(false); // Default to rejection on timeout
        }
      }, 60000);
    });
  });
}

// Show connection approval popup
async function showConnectionApproval(origin) {
  return new Promise((resolve, reject) => {
    const requestId = 'conn_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    
    // Store the resolver for this request
    pendingConnections.set(requestId, { resolve, reject });
    
    // Create popup URL with parameters
    const popupUrl = chrome.runtime.getURL(
      `popup/connection-approval.html?origin=${encodeURIComponent(origin)}&requestId=${requestId}`
    );
    
    // Open popup window
    chrome.windows.create({
      url: popupUrl,
      type: 'popup',
      width: 400,
      height: 500,
      focused: true
    }, (window) => {
      if (chrome.runtime.lastError) {
        pendingConnections.delete(requestId);
        reject(new Error('Failed to open approval popup'));
        return;
      }
      
      // Set timeout for user response (60 seconds)
      setTimeout(() => {
        if (pendingConnections.has(requestId)) {
          pendingConnections.delete(requestId);
          resolve(false); // Default to rejection on timeout
        }
      }, 60000);
    });
  });
}

// Handle message signing
async function handleSignMessage(data, sendResponse) {
  try {
    const { message } = data;
    
    // Get wallet keypair
    const { seedPhrase } = await chrome.storage.local.get(['seedPhrase']);
    if (!seedPhrase) {
      sendResponse({ success: false, error: 'Wallet locked - no seed phrase available' });
      return;
    }
    
    // PRODUCTION: Use real Solana message signing
    if (typeof SolanaService === 'undefined') {
      throw new Error('SolanaService not available - cannot sign message');
    }
    
    const keypair = await SolanaService.keypairFromSeed(seedPhrase);
    const signature = await SolanaService.signMessage(message, keypair);
    
    sendResponse({
      success: true,
      signature
    });
    
  } catch (error) {
    console.error('Message signing error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Periodic balance updates (every 30 seconds)
setInterval(async () => {
  const { walletAddress } = await chrome.storage.local.get(['walletAddress']);
  
  if (walletAddress) {
    // In production, fetch real balance from Solana network
    // await updateBalance(walletAddress);
  }
}, 30000);

// Auto-lock functionality
let lockTimer = null;

function resetLockTimer() {
  const { autoLock, lockTimeout } = chrome.storage.local.get(['autoLock', 'lockTimeout']);
  
  if (!autoLock) return;
  
  if (lockTimer) clearTimeout(lockTimer);
  
  lockTimer = setTimeout(() => {
    // Lock the wallet by clearing sensitive data
    chrome.storage.local.remove(['seedPhrase']);
    console.log('Wallet auto-locked');
  }, (lockTimeout || 15) * 60 * 1000);
}

// Handle connection approval/rejection responses
function handleConnectionResponse(data) {
  const { requestId, approved } = data;
  
  if (pendingConnections.has(requestId)) {
    const { resolve } = pendingConnections.get(requestId);
    pendingConnections.delete(requestId);
    resolve(approved);
  }
}

// Handle transaction approval/rejection responses
function handleTransactionResponse(data) {
  const { requestId, approved, signedTransaction } = data;
  
  if (pendingTransactions.has(requestId)) {
    const { resolve } = pendingTransactions.get(requestId);
    pendingTransactions.delete(requestId);
    
    if (approved && signedTransaction) {
      resolve(signedTransaction);
    } else {
      resolve(false);
    }
  }
}

// Reset lock timer on user activity
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'USER_ACTIVITY') {
    resetLockTimer();
  }
});
