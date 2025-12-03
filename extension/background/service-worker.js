/**
 * Celora Extension - Background Service Worker (MV3)
 * Simple initialization and message handling
 */

console.log('[Celora Extension] Background service worker initialized');

// Listen for extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Celora Extension] Installed:', details.reason);
  
  if (details.reason === 'install') {
    chrome.storage.local.set({
      installTimestamp: Date.now(),
      version: chrome.runtime.getManifest().version,
    });
  }
});

// Listen for extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[Celora Extension] Extension started');
});

// Simple message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Celora Extension] Message received:', message);
  sendResponse({ success: true });
  return true;
});
