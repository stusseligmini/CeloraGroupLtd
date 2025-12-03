import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const distDir = path.join(extensionDir, 'dist');

/**
 * Build extension - popup.html contains inline React app (no bundling needed)
 */
async function run() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await mkdir(path.join(distDir, 'background'), { recursive: true });

  console.log('🔨 Building extension (inline React in popup.html)...');

  // Create minimal popup.js stub (React app is inline in popup.html)
  const popupStub = `// Extension popup - React app loads inline from popup.html
console.log('[Celora Extension] Popup loaded - v1.0.0');`;

  await writeFile(path.join(distDir, 'popup.js'), popupStub, 'utf-8');
  console.log('✅ popup.js stub created');

  // Copy or create background service worker
  try {
    const bgSource = path.join(extensionDir, 'background', 'service-worker.js');
    const bgContent = await readFile(bgSource, 'utf-8');
    await writeFile(path.join(distDir, 'background', 'service-worker.js'), bgContent, 'utf-8');
    console.log('✅ Background worker copied');
  } catch (e) {
    // Create minimal service worker if source doesn't exist
    const bgStub = `// Celora Extension Background Service Worker
console.log('[Celora Extension] Background service worker initialized');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Celora Extension] Installed:', details.reason);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Celora Extension] Message received:', message);
  sendResponse({ success: true });
  return true;
});`;
    await writeFile(path.join(distDir, 'background', 'service-worker.js'), bgStub, 'utf-8');
    console.log('✅ Background worker stub created');
  }

  console.log('\n✅ Extension build complete!');
  console.log('   Load in Chrome: chrome://extensions → Developer mode → Load unpacked → extension folder');
}

run().catch((error) => {
  console.error('❌ Failed to build extension:', error);
  process.exitCode = 1;
});
