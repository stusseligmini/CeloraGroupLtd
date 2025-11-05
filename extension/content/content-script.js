// Celora Wallet Extension - Content Script
// Injected into web pages to provide window.solana API for dApp compatibility

console.log('Celora Wallet content script loaded');

// Inject the provider script into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('content/provider.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the injected provider
window.addEventListener('message', async (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;
  
  // Only accept messages from our provider
  if (!event.data.type || !event.data.type.startsWith('CELORA_')) return;
  
  console.log('Content script received:', event.data);
  
  switch (event.data.type) {
    case 'CELORA_CONNECT':
      handleConnect(event.data.id);
      break;
      
    case 'CELORA_SIGN_TRANSACTION':
      handleSignTransaction(event.data.id, event.data.payload);
      break;
      
    case 'CELORA_SIGN_MESSAGE':
      handleSignMessage(event.data.id, event.data.payload);
      break;
      
    case 'CELORA_GET_BALANCE':
      handleGetBalance(event.data.id);
      break;
      
    default:
      console.warn('Unknown message type:', event.data.type);
  }
});

// Handle connection request
async function handleConnect(requestId) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CONNECT_WALLET',
      data: {
        origin: window.location.origin
      }
    });
    
    window.postMessage({
      type: 'CELORA_CONNECT_RESPONSE',
      id: requestId,
      payload: response
    }, '*');
    
  } catch (error) {
    window.postMessage({
      type: 'CELORA_CONNECT_RESPONSE',
      id: requestId,
      payload: { success: false, error: error.message }
    }, '*');
  }
}

// Handle transaction signing
async function handleSignTransaction(requestId, transaction) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SIGN_TRANSACTION',
      data: {
        transaction,
        origin: window.location.origin
      }
    });
    
    window.postMessage({
      type: 'CELORA_SIGN_TRANSACTION_RESPONSE',
      id: requestId,
      payload: response
    }, '*');
    
  } catch (error) {
    window.postMessage({
      type: 'CELORA_SIGN_TRANSACTION_RESPONSE',
      id: requestId,
      payload: { success: false, error: error.message }
    }, '*');
  }
}

// Handle message signing
async function handleSignMessage(requestId, message) {
  try {
    // PRODUCTION: Implement real message signing via background script
    const response = await chrome.runtime.sendMessage({
      type: 'SIGN_MESSAGE',
      data: { message }
    });
    
    window.postMessage({
      type: 'CELORA_SIGN_MESSAGE_RESPONSE',
      id: requestId,
      payload: response
    }, '*');
    
  } catch (error) {
    window.postMessage({
      type: 'CELORA_SIGN_MESSAGE_RESPONSE',
      id: requestId,
      payload: { success: false, error: error.message }
    }, '*');
  }
}

// Handle balance request
async function handleGetBalance(requestId) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_BALANCE'
    });
    
    window.postMessage({
      type: 'CELORA_GET_BALANCE_RESPONSE',
      id: requestId,
      payload: response
    }, '*');
    
  } catch (error) {
    window.postMessage({
      type: 'CELORA_GET_BALANCE_RESPONSE',
      id: requestId,
      payload: { success: false, error: error.message }
    }, '*');
  }
}

// Notify background of user activity
document.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'USER_ACTIVITY' });
});

document.addEventListener('keypress', () => {
  chrome.runtime.sendMessage({ type: 'USER_ACTIVITY' });
});
