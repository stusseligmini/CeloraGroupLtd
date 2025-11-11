/**
 * Workbox Configuration
 * 
 * Production-ready service worker with advanced caching strategies
 */

module.exports = {
  globDirectory: '.next/',
  globPatterns: [
    '**/*.{html,js,css,png,svg,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'
  ],
  // Files to exclude from pre-caching
  globIgnores: [
    '**/node_modules/**/*',
    'sw.js',
    'workbox-*.js',
    '**/cache/**/*'
  ],
  swDest: 'public/sw.js',
  // Inject manifest into custom service worker
  swSrc: 'public/sw-template.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
};
