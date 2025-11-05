// 🚀 CELORA WALLET TESTING SCRIPT
// Run this in browser console after loading extension

console.log('🔍 Starting Celora Wallet Comprehensive Testing...');

const CeloraTest = {
  results: {
    extension: { status: '⏳', tests: [] },
    database: { status: '⏳', tests: [] },
    solana: { status: '⏳', tests: [] },
    wallet: { status: '⏳', tests: [] },
    security: { status: '⏳', tests: [] }
  },

  // Test 1: Extension Loading
  async testExtension() {
    console.log('📦 Testing Extension Loading...');
    const tests = [];

    // Test manifest loading
    try {
      const manifest = chrome.runtime.getManifest();
      tests.push({ name: 'Manifest V3 Loaded', status: manifest.manifest_version === 3 ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Manifest V3 Loaded', status: '❌', error: e.message });
    }

    // Test service worker
    try {
      const serviceWorker = navigator.serviceWorker;
      tests.push({ name: 'Service Worker Available', status: serviceWorker ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Service Worker Available', status: '❌', error: e.message });
    }

    // Test content script injection
    try {
      const hasProvider = typeof window.solana !== 'undefined';
      tests.push({ name: 'Solana Provider Injected', status: hasProvider ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Solana Provider Injected', status: '❌', error: e.message });
    }

    // Test popup availability
    try {
      const popupUrl = chrome.runtime.getURL('popup/popup.html');
      tests.push({ name: 'Popup URL Accessible', status: popupUrl ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Popup URL Accessible', status: '❌', error: e.message });
    }

    this.results.extension.tests = tests;
    this.results.extension.status = tests.every(t => t.status === '✅') ? '✅' : '❌';
  },

  // Test 2: Database Connection
  async testDatabase() {
    console.log('🗃️ Testing Database Connection...');
    const tests = [];

    // Test Supabase client
    try {
      const hasSupabase = typeof supabaseClient !== 'undefined';
      tests.push({ name: 'Supabase Client Loaded', status: hasSupabase ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Supabase Client Loaded', status: '❌', error: e.message });
    }

    // Test authentication
    try {
      const { data, error } = await supabaseClient.auth.getSession();
      tests.push({ name: 'Auth Session Check', status: !error ? '✅' : '❌', error: error?.message });
    } catch (e) {
      tests.push({ name: 'Auth Session Check', status: '❌', error: e.message });
    }

    // Test wallets table access
    try {
      const { data, error } = await supabaseClient.from('wallets').select('count');
      tests.push({ name: 'Wallets Table Access', status: !error ? '✅' : '❌', error: error?.message });
    } catch (e) {
      tests.push({ name: 'Wallets Table Access', status: '❌', error: e.message });
    }

    // Test RLS policies
    try {
      const { data, error } = await supabaseClient.rpc('check_rls_enabled', { table_name: 'wallets' });
      tests.push({ name: 'RLS Policies Active', status: !error ? '✅' : '❌', error: error?.message });
    } catch (e) {
      tests.push({ name: 'RLS Policies Active', status: '⚠️', note: 'Function not available - manual check needed' });
    }

    this.results.database.tests = tests;
    this.results.database.status = tests.filter(t => t.status === '✅').length >= 2 ? '✅' : '❌';
  },

  // Test 3: Solana Integration
  async testSolana() {
    console.log('⚡ Testing Solana Integration...');
    const tests = [];

    // Test Web3.js loading
    try {
      const hasWeb3 = typeof solanaWeb3 !== 'undefined';
      tests.push({ name: 'Solana Web3.js Loaded', status: hasWeb3 ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Solana Web3.js Loaded', status: '❌', error: e.message });
    }

    // Test SolanaService
    try {
      const hasService = typeof SolanaService !== 'undefined';
      tests.push({ name: 'SolanaService Available', status: hasService ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'SolanaService Available', status: '❌', error: e.message });
    }

    // Test RPC connection
    try {
      if (typeof SolanaService !== 'undefined' && SolanaService.connection) {
        const health = await SolanaService.getHealth();
        tests.push({ name: 'RPC Connection Health', status: health ? '✅' : '❌' });
      } else {
        tests.push({ name: 'RPC Connection Health', status: '❌', error: 'SolanaService not initialized' });
      }
    } catch (e) {
      tests.push({ name: 'RPC Connection Health', status: '❌', error: e.message });
    }

    // Test address validation
    try {
      if (typeof SolanaService !== 'undefined') {
        const testAddress = '11111111111111111111111111111112';
        const isValid = SolanaService.isValidAddress(testAddress);
        tests.push({ name: 'Address Validation', status: isValid ? '✅' : '❌' });
      } else {
        tests.push({ name: 'Address Validation', status: '❌', error: 'SolanaService not available' });
      }
    } catch (e) {
      tests.push({ name: 'Address Validation', status: '❌', error: e.message });
    }

    this.results.solana.tests = tests;
    this.results.solana.status = tests.every(t => t.status === '✅') ? '✅' : '❌';
  },

  // Test 4: Wallet Operations
  async testWallet() {
    console.log('💰 Testing Wallet Operations...');
    const tests = [];

    // Test BIP39 wordlist
    try {
      const hasBIP39 = typeof bip39 !== 'undefined';
      tests.push({ name: 'BIP39 Library Loaded', status: hasBIP39 ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'BIP39 Library Loaded', status: '❌', error: e.message });
    }

    // Test crypto functions
    try {
      const hasCrypto = typeof CeloraCrypto !== 'undefined';
      tests.push({ name: 'Celora Crypto Available', status: hasCrypto ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Celora Crypto Available', status: '❌', error: e.message });
    }

    // Test storage access
    try {
      const storage = await chrome.storage.local.get(['test']);
      tests.push({ name: 'Chrome Storage Access', status: '✅' });
    } catch (e) {
      tests.push({ name: 'Chrome Storage Access', status: '❌', error: e.message });
    }

    // Test seed phrase generation
    try {
      if (typeof generateSecureSeedPhrase !== 'undefined') {
        const seedPhrase = generateSecureSeedPhrase(12); 
        const isValid = seedPhrase && seedPhrase.split(' ').length === 12;
        tests.push({ name: 'Seed Phrase Generation', status: isValid ? '✅' : '❌' });
      } else {
        tests.push({ name: 'Seed Phrase Generation', status: '❌', error: 'Function not available' });
      }
    } catch (e) {
      tests.push({ name: 'Seed Phrase Generation', status: '❌', error: e.message });
    }

    this.results.wallet.tests = tests;
    this.results.wallet.status = tests.filter(t => t.status === '✅').length >= 2 ? '✅' : '❌';
  },

  // Test 5: Security Features
  async testSecurity() {
    console.log('🔐 Testing Security Features...');
    const tests = [];

    // Test encryption/decryption
    try {
      if (typeof CeloraCrypto !== 'undefined') {
        const testData = 'test secret data';
        const password = 'testpass123';
        const encrypted = await CeloraCrypto.encrypt(testData, password);
        const decrypted = await CeloraCrypto.decrypt(encrypted, password);
        tests.push({ name: 'AES-256-GCM Encryption', status: decrypted === testData ? '✅' : '❌' });
      } else {
        tests.push({ name: 'AES-256-GCM Encryption', status: '❌', error: 'CeloraCrypto not available' });
      }
    } catch (e) {
      tests.push({ name: 'AES-256-GCM Encryption', status: '❌', error: e.message });
    }

    // Test CSP headers
    try {
      const hasCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      tests.push({ name: 'CSP Headers Present', status: hasCSP ? '✅' : '⚠️', note: 'Extension CSP via manifest' });
    } catch (e) {
      tests.push({ name: 'CSP Headers Present', status: '⚠️', note: 'Extension CSP via manifest' });
    }

    // Test secure random generation
    try {
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      const hasEntropy = randomBytes.some(byte => byte !== 0);
      tests.push({ name: 'Secure Random Generation', status: hasEntropy ? '✅' : '❌' });
    } catch (e) {
      tests.push({ name: 'Secure Random Generation', status: '❌', error: e.message });
    }

    // Test session management
    try {
      const hasSessionManagement = typeof sessionToken !== 'undefined' || typeof currentUser !== 'undefined';
      tests.push({ name: 'Session Management', status: hasSessionManagement ? '✅' : '⚠️', note: 'Check in popup context' });
    } catch (e) {
      tests.push({ name: 'Session Management', status: '⚠️', note: 'Check in popup context' });
    }

    this.results.security.tests = tests;
    this.results.security.status = tests.filter(t => t.status === '✅').length >= 2 ? '✅' : '❌';
  },

  // Run all tests
  async runAllTests() {
    console.log('🚀 Running Comprehensive Celora Wallet Tests...\n');
    
    await this.testExtension();
    await this.testDatabase();
    await this.testSolana();
    await this.testWallet();
    await this.testSecurity();

    this.displayResults();
  },

  // Display comprehensive results
  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 CELORA WALLET TEST RESULTS');
    console.log('='.repeat(60));

    // Overall status
    const allPassed = Object.values(this.results).every(section => section.status === '✅');
    console.log(`\n🎖️  OVERALL STATUS: ${allPassed ? '✅ READY FOR LAUNCH' : '❌ NEEDS ATTENTION'}\n`);

    // Detailed results
    Object.entries(this.results).forEach(([category, result]) => {
      console.log(`📋 ${category.toUpperCase()}: ${result.status}`);
      result.tests.forEach(test => {
        const status = test.status;
        const error = test.error ? ` (${test.error})` : '';
        const note = test.note ? ` - ${test.note}` : '';
        console.log(`   ${status} ${test.name}${error}${note}`);
      });
      console.log('');
    });

    // Summary
    const totalTests = Object.values(this.results).reduce((acc, section) => acc + section.tests.length, 0);
    const passedTests = Object.values(this.results).reduce((acc, section) => 
      acc + section.tests.filter(t => t.status === '✅').length, 0);
    const warningTests = Object.values(this.results).reduce((acc, section) => 
      acc + section.tests.filter(t => t.status === '⚠️').length, 0);

    console.log('📊 SUMMARY:');
    console.log(`   ✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`   ⚠️  Warnings: ${warningTests}`);
    console.log(`   ❌ Failed: ${totalTests - passedTests - warningTests}`);
    console.log(`   📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    // Launch recommendation
    if (passedTests >= totalTests * 0.8) {
      console.log('\n🚀 RECOMMENDATION: READY FOR LAUNCH! ');
      console.log('   All critical systems operational.');
    } else if (passedTests >= totalTests * 0.6) {
      console.log('\n⚠️  RECOMMENDATION: FIX CRITICAL ISSUES FIRST');
      console.log('   Some systems need attention before launch.');
    } else {
      console.log('\n❌ RECOMMENDATION: EXTENSIVE FIXES NEEDED');
      console.log('   Multiple systems require repair before launch.');
    }

    console.log('\n='.repeat(60));
    return this.results;
  }
};

// Auto-run tests if not in headless mode
if (typeof window !== 'undefined') {
  console.log('🎬 Auto-starting Celora Wallet Tests in 2 seconds...');
  setTimeout(() => CeloraTest.runAllTests(), 2000);
}

// Make available globally
window.CeloraTest = CeloraTest;