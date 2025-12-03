import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const distDir = path.join(extensionDir, 'dist');

/**
 * Simple bundle script - creates minimal shims for extension
 * React popup loads from the fallback HTML; this just ensures dist/ exists
 */
async function run() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await mkdir(path.join(distDir, 'background'), { recursive: true });

  // Create minimal popup.js stub (React loads from fallback in popup.html)
  const popupStub = `
// Extension popup stub - React app loads from fallback in popup.html
// This file satisfies the manifest requirement for dist/popup.js
console.log('[Celora Extension] Popup script loaded');

// Re-export anything the fallback might need
if (typeof window !== 'undefined') {
  window.__CELORA_EXTENSION_VERSION__ = '1.0.0';
}
`;

  await writeFile(path.join(distDir, 'popup.js'), popupStub, 'utf-8');
  console.log('✅ Extension popup stub written to extension/dist/popup.js');

  // Copy or create background service worker
  try {
    const bgSource = path.join(extensionDir, 'background', 'service-worker.js');
    const bgContent = await readFile(bgSource, 'utf-8');
    await writeFile(path.join(distDir, 'background', 'service-worker.js'), bgContent, 'utf-8');
    console.log('✅ Extension background worker copied to extension/dist/background/service-worker.js');
  } catch (e) {
    // Create minimal service worker if source doesn't exist
    const bgStub = `
// Celora Extension Background Service Worker
console.log('[Celora Extension] Background service worker initialized');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Celora Extension] Installed:', details.reason);
});

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Celora Extension] Message received:', message);
  sendResponse({ success: true });
  return true;
});
`;
    await writeFile(path.join(distDir, 'background', 'service-worker.js'), bgStub, 'utf-8');
    console.log('✅ Extension background worker stub created');
  }
}

run().catch((error) => {
  console.error('❌ Failed to build extension bundle');
  console.error(error);
  process.exitCode = 1;
});

