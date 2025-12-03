(function () {
  var appUrl = document.body.dataset.appUrl || 'https://celora-7b552.web.app';
  var apiBase = document.body.dataset.apiBase;
  if (appUrl && appUrl.endsWith('/')) {
    appUrl = appUrl.slice(0, -1);
  }
  window.__CELORA_APP_URL__ = appUrl;
  window.__CELORA_API_BASE__ = apiBase || appUrl + '/api';

  // Firebase configuration
  window.__FIREBASE_CONFIG__ = {
    apiKey: "AIzaSyAnauWfK21qclea_kZM-GqDCHpzombR884",
    authDomain: "celora-7b552.firebaseapp.com",
    projectId: "celora-7b552",
    storageBucket: "celora-7b552.firebasestorage.app",
    messagingSenderId: "505448793868",
    appId: "1:505448793868:web:df0e3f80e669ab47a26b29"
  };

  // Storage keys
  window.__STORAGE_KEYS__ = {
    SESSION: 'celora_session',
    USER: 'celora_user',
    TOKEN: 'celora_token'
  };

  // API endpoints
  window.__API_ENDPOINTS__ = {
    WALLET: '/wallet/summary',
    CARDS: '/cards',
    TRANSACTIONS: '/solana/transactions',
    SETTINGS: '/settings',
    NOTIFICATIONS: '/notifications',
    STAKING: '/staking'
  };
})();
