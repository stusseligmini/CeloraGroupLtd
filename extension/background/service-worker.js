/**
 * Celora Extension - Background Service Worker (MV3)
 * 
 * Secure message handling between popup and content scripts
 */

// Message types enum
const MessageType = {
  GET_WALLET_DATA: 'GET_WALLET_DATA',
  WALLET_DATA_RESPONSE: 'WALLET_DATA_RESPONSE',
  GET_NOTIFICATIONS: 'GET_NOTIFICATIONS',
  NOTIFICATIONS_RESPONSE: 'NOTIFICATIONS_RESPONSE',
  SIGN_TRANSACTION: 'SIGN_TRANSACTION',
  TRANSACTION_SIGNED: 'TRANSACTION_SIGNED',
  CONNECT_WALLET: 'CONNECT_WALLET',
  WALLET_CONNECTED: 'WALLET_CONNECTED',
  DISCONNECT_WALLET: 'DISCONNECT_WALLET',
  WALLET_DISCONNECTED: 'WALLET_DISCONNECTED',
  ERROR: 'ERROR',
};

// Security: Validate message origin
function isValidOrigin(url) {
  try {
    const origin = new URL(url).origin;
    const allowedOrigins = [
      'https://celora-7b552.web.app',
      'https://app.celora.com',
      chrome.runtime.getURL(''),
    ];
    return allowedOrigins.some((allowed) => origin.startsWith(allowed.replace(/\/$/, '')));
  } catch {
    return false;
  }
}

// Security: Validate message structure
function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }
  if (!message.type || typeof message.type !== 'string') {
    return false;
  }
  if (!Object.values(MessageType).includes(message.type)) {
    return false;
  }
  return true;
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender origin
  if (sender.url && !isValidOrigin(sender.url)) {
    console.warn('[BG] Invalid sender origin:', sender.url);
    sendResponse({
      type: MessageType.ERROR,
      error: 'Invalid origin',
    });
    return false;
  }

  // Validate message structure
  if (!validateMessage(message)) {
    console.warn('[BG] Invalid message structure:', message);
    sendResponse({
      type: MessageType.ERROR,
      error: 'Invalid message format',
    });
    return false;
  }

  // Handle message based on type
  switch (message.type) {
    case MessageType.GET_WALLET_DATA:
      handleGetWalletData(message, sender, sendResponse);
      return true; // Keep channel open for async response

    case MessageType.GET_NOTIFICATIONS:
      handleGetNotifications(message, sender, sendResponse);
      return true;

    case MessageType.SIGN_TRANSACTION:
      handleSignTransaction(message, sender, sendResponse);
      return true;

    case MessageType.CONNECT_WALLET:
      handleConnectWallet(message, sender, sendResponse);
      return true;

    case MessageType.DISCONNECT_WALLET:
      handleDisconnectWallet(message, sender, sendResponse);
      return true;

    default:
      console.warn('[BG] Unknown message type:', message.type);
      sendResponse({
        type: MessageType.ERROR,
        error: 'Unknown message type',
      });
      return false;
  }
});

// Fetch wallet data from API
async function handleGetWalletData(message, sender, sendResponse) {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/wallet/summary`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    sendResponse({
      type: MessageType.WALLET_DATA_RESPONSE,
      data,
    });
  } catch (error) {
    console.error('[BG] Failed to fetch wallet data:', error);
    sendResponse({
      type: MessageType.ERROR,
      error: error.message,
    });
  }
}

// Fetch notifications from API
async function handleGetNotifications(message, sender, sendResponse) {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const { limit = 10, unreadOnly = false } = message.payload || {};
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(unreadOnly && { unreadOnly: 'true' }),
    });

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/notifications?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    sendResponse({
      type: MessageType.NOTIFICATIONS_RESPONSE,
      data,
    });
  } catch (error) {
    console.error('[BG] Failed to fetch notifications:', error);
    sendResponse({
      type: MessageType.ERROR,
      error: error.message,
    });
  }
}

// Handle transaction signing
async function handleSignTransaction(message, sender, sendResponse) {
  try {
    const { transaction, metadata } = message.payload || {};
    if (!transaction) {
      throw new Error('No transaction provided');
    }

    // Store transaction for approval UI
    const approvalId = generateApprovalId();
    await chrome.storage.local.set({
      [`approval_${approvalId}`]: {
        transaction,
        metadata,
        timestamp: Date.now(),
        sender: sender.url,
      },
    });

    // Open approval popup
    await chrome.windows.create({
      url: chrome.runtime.getURL(`popup/transaction-approval.html?id=${approvalId}`),
      type: 'popup',
      width: 400,
      height: 600,
    });

    // Wait for approval (will be handled by approval popup)
    const approval = await waitForApproval(approvalId);

    if (approval.approved) {
      sendResponse({
        type: MessageType.TRANSACTION_SIGNED,
        signature: approval.signature,
      });
    } else {
      throw new Error('Transaction rejected by user');
    }
  } catch (error) {
    console.error('[BG] Failed to sign transaction:', error);
    sendResponse({
      type: MessageType.ERROR,
      error: error.message,
    });
  }
}

// Handle wallet connection
async function handleConnectWallet(message, sender, sendResponse) {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Store connected origin
    const { origin } = new URL(sender.url);
    await chrome.storage.local.set({
      connectedOrigins: {
        [origin]: {
          connected: true,
          timestamp: Date.now(),
        },
      },
    });

    sendResponse({
      type: MessageType.WALLET_CONNECTED,
      origin,
    });
  } catch (error) {
    console.error('[BG] Failed to connect wallet:', error);
    sendResponse({
      type: MessageType.ERROR,
      error: error.message,
    });
  }
}

// Handle wallet disconnection
async function handleDisconnectWallet(message, sender, sendResponse) {
  try {
    const { origin } = new URL(sender.url);
    await chrome.storage.local.remove(`connectedOrigins.${origin}`);

    sendResponse({
      type: MessageType.WALLET_DISCONNECTED,
      origin,
    });
  } catch (error) {
    console.error('[BG] Failed to disconnect wallet:', error);
    sendResponse({
      type: MessageType.ERROR,
      error: error.message,
    });
  }
}

// Helper: Get auth token from storage
async function getAuthToken() {
  const result = await chrome.storage.local.get(['authToken']);
  return result.authToken || null;
}

// Helper: Generate approval ID
function generateApprovalId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Wait for approval
function waitForApproval(approvalId, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const checkInterval = 500;
    let elapsed = 0;

    const interval = setInterval(async () => {
      elapsed += checkInterval;

      if (elapsed >= timeout) {
        clearInterval(interval);
        reject(new Error('Approval timeout'));
        return;
      }

      const result = await chrome.storage.local.get([`approval_result_${approvalId}`]);
      const approval = result[`approval_result_${approvalId}`];

      if (approval) {
        clearInterval(interval);
        await chrome.storage.local.remove([
          `approval_${approvalId}`,
          `approval_result_${approvalId}`,
        ]);
        resolve(approval);
      }
    }, checkInterval);
  });
}

// Periodic cleanup of expired approvals
chrome.alarms.create('cleanupApprovals', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanupApprovals') {
    cleanupExpiredApprovals();
  }
});

async function cleanupExpiredApprovals() {
  const storage = await chrome.storage.local.get(null);
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  const keysToRemove = Object.keys(storage)
    .filter((key) => {
      if (key.startsWith('approval_')) {
        const approval = storage[key];
        return approval.timestamp && now - approval.timestamp > maxAge;
      }
      return false;
    });

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log('[BG] Cleaned up expired approvals:', keysToRemove.length);
  }
}

// Initialize service worker
console.log('[BG] Service worker initialized');

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('[BG] Extension started');
});

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[BG] Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // First install
    chrome.storage.local.set({
      installTimestamp: Date.now(),
      version: chrome.runtime.getManifest().version,
    });
  } else if (details.reason === 'update') {
    // Update
    console.log('[BG] Extension updated to:', chrome.runtime.getManifest().version);
  }
});
