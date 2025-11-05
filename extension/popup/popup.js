// Celora Wallet Extension - Main Logic
// Integrated with Supabase backend

let supabaseClient;
let currentUser = null;
let sessionToken = null;
let lockTimeoutId = null;

// Initialize Supabase client
async function initSupabase() {
  const { createClient } = supabase;
  supabaseClient = createClient(
    CELORA_CONFIG.supabase.url,
    CELORA_CONFIG.supabase.anonKey
  );
}

// Initialize extension
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initSupabase();
    await TransactionCacheService.init();
    await SPLTokenService.init();
    await checkAuth();
    setupActivityListeners();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize wallet. Please refresh.');
  }
});

// Setup activity listeners to reset auto-lock
function setupActivityListeners() {
  // Track mouse movement, clicks, and keyboard activity
  ['click', 'keypress', 'mousemove', 'scroll'].forEach(eventType => {
    document.addEventListener(eventType, resetAutoLockTimer, { passive: true });
  });
  
  // Track input changes
  document.addEventListener('input', resetAutoLockTimer, { passive: true });
}

// Check if user is already logged in
async function checkAuth() {
  try {
    // Check for valid session token first
    const storedSession = await chrome.storage.local.get(['sessionToken', 'sessionExpiry']);
    
    if (storedSession.sessionToken && storedSession.sessionExpiry > Date.now()) {
      // Valid session token exists
      sessionToken = storedSession.sessionToken;
      
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        currentUser = session.user;
        await loadWalletData();
        showWalletScreen();
        startAutoLockTimer();
        return;
      }
    }
    
    // No valid session, check Supabase auth
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) throw error;
    
    if (session) {
      currentUser = session.user;
      await createSessionToken();
      await loadWalletData();
      showWalletScreen();
      startAutoLockTimer();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showLoginScreen();
  }
}

// Create secure session token
async function createSessionToken() {
  try {
    sessionToken = await generateSecureToken();
    const expiry = Date.now() + (15 * 60 * 1000); // 15 minutes
    
    await chrome.storage.local.set({
      sessionToken: sessionToken,
      sessionExpiry: expiry
    });
  } catch (error) {
    console.error('Error creating session token:', error);
  }
}

// Generate cryptographically secure token
async function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Start auto-lock timer
function startAutoLockTimer() {
  clearTimeout(lockTimeoutId);
  
  // Auto-lock after 15 minutes of inactivity
  lockTimeoutId = setTimeout(async () => {
    await lockWallet();
  }, 15 * 60 * 1000);
}

// Reset auto-lock timer on user activity
function resetAutoLockTimer() {
  if (currentUser) {
    startAutoLockTimer();
  }
}

// Lock wallet
async function lockWallet() {
  try {
    // Clear session data
    await chrome.storage.local.remove(['sessionToken', 'sessionExpiry']);
    sessionToken = null;
    currentUser = null;
    
    // Clear UI
    showLoginScreen();
    
    // Show lock notification
    showNotification('Wallet Locked', 'Your wallet has been locked for security.', 'info');
    
  } catch (error) {
    console.error('Error locking wallet:', error);
  }
}

// Screen Navigation
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function showLoginScreen() {
  showScreen('loginScreen');
}

function showWalletScreen() {
  showScreen('walletScreen');
}

function showSendScreen() {
  showScreen('sendScreen');
}

function showImportScreen() {
  showScreen('importScreen');
}

// Auth Tab Switching
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.tab');
  
  tabs.forEach(t => t.classList.remove('active'));
  
  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabs[0].classList.add('active');
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabs[1].classList.add('active');
  }
}

// Generate secure seed phrase using proper BIP39 wordlist - PRODUCTION ONLY
function generateSeedPhrase() {
  if (typeof generateSecureSeedPhrase === 'undefined') {
    throw new Error('BIP39 wordlist not loaded - PRODUCTION MODE REQUIRES secure seed generation');
  }
  
  try {
    return generateSecureSeedPhrase(12);
  } catch (error) {
    console.error('Error generating seed phrase:', error);
    throw new Error('Failed to generate secure seed phrase - PRODUCTION MODE has no fallback');
  }
}

// Generate Solana address from seed phrase
async function generateAddressFromSeed(seedPhrase) {
  try {
    const keypair = await SolanaService.keypairFromSeed(seedPhrase);
    return keypair.publicKey;
  } catch (error) {
    console.error('Error generating address from seed:', error);
    throw new Error('Failed to generate wallet address');
  }
}

// Handle Login
async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  errorDiv.style.display = 'none';
  
  if (!email || !password) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    currentUser = data.user;
    await createSessionToken();
    await loadWalletData();
    showWalletScreen();
    startAutoLockTimer();
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  }
}

// Handle Register
async function handleRegister() {
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  errorDiv.style.display = 'none';
  
  if (!email || !password) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (password.length < 8) {
    errorDiv.textContent = 'Password must be at least 8 characters';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    // 1. Generate seed phrase
    const seedPhrase = generateSeedPhrase();
    const walletAddress = generateAddressFromSeed(seedPhrase);
    
    // 2. Register user in Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // 3. Encrypt seed phrase with user password
    const encryptedSeed = await CeloraCrypto.encrypt(seedPhrase, password);
    
    // 4. Store wallet data
    const { error: walletError } = await supabaseClient
      .from('wallets')
      .insert({
        user_id: authData.user.id,
        public_key: walletAddress,
        encrypted_private_key: encryptedSeed,
        network: 'devnet',
        is_primary: true
      });
    
    if (walletError) throw walletError;
    
    // 5. Store encrypted seed phrase securely in extension storage
    await chrome.storage.local.set({
      encryptedSeed: encryptedSeed,
      walletAddress: walletAddress
    });
    
    // 6. Show seed phrase to user (important!)
    alert(`IMPORTANT: Save your seed phrase!\n\n${seedPhrase}\n\nYou will need this to recover your wallet.`);
    
    currentUser = authData.user;
    await createSessionToken();
    await loadWalletData();
    showWalletScreen();
    startAutoLockTimer();
    
  } catch (error) {
    console.error('Registration error:', error);
    errorDiv.textContent = error.message || 'Registration failed';
    errorDiv.style.display = 'block';
  }
}

// Handle Import Wallet
async function handleImport() {
  const email = document.getElementById('importEmail').value;
  const password = document.getElementById('importPassword').value;
  const seedPhrase = document.getElementById('importSeed').value.trim();
  const errorDiv = document.getElementById('importError');
  const successDiv = document.getElementById('importSuccess');
  
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  
  if (!email || !password || !seedPhrase) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Validate seed phrase using BIP39 wordlist
  const validation = validateSeedPhrase(seedPhrase);
  if (!validation.valid) {
    errorDiv.textContent = validation.error;
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    const walletAddress = generateAddressFromSeed(seedPhrase);
    
    // Encrypt seed phrase
    const encryptedSeed = await CeloraCrypto.encrypt(seedPhrase, password);
    
    // Register user
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // Store wallet
    const { error: walletError } = await supabaseClient
      .from('wallets')
      .insert({
        user_id: authData.user.id,
        public_key: walletAddress,
        encrypted_private_key: encryptedSeed,
        network: 'devnet',
        is_primary: true
      });
    
    if (walletError) throw walletError;
    
    // Store in extension
    await chrome.storage.local.set({
      encryptedSeed: encryptedSeed,
      walletAddress: walletAddress
    });
    
    successDiv.textContent = 'Wallet imported successfully!';
    successDiv.style.display = 'block';
    
    setTimeout(async () => {
      currentUser = authData.user;
      await createSessionToken();
      await loadWalletData();
      showWalletScreen();
      startAutoLockTimer();
    }, 1500);
    
  } catch (error) {
    console.error('Import error:', error);
    errorDiv.textContent = error.message || 'Import failed';
    errorDiv.style.display = 'block';
  }
}

// Load Wallet Data
async function loadWalletData() {
  try {
    // Get wallet from database
    const { data: wallet, error } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('is_primary', true)
      .single();
    
    if (error) throw error;
    
    // Display wallet address
    document.getElementById('walletAddress').textContent = 
      wallet.public_key.substring(0, 6) + '...' + wallet.public_key.substring(wallet.public_key.length - 4);
    document.getElementById('walletAddress').setAttribute('data-full-address', wallet.public_key);
    
    // Get real balance from Solana blockchain
    await refreshBalance();
    
    // Load transactions
    await loadTransactions();
    
  } catch (error) {
    console.error('Error loading wallet:', error);
    showError('Failed to load wallet data');
  }
}

// Refresh Balance (Phantom-style with caching)
async function refreshBalance() {
  try {
    // Get wallet address from storage or DOM
    const addressElement = document.getElementById('walletAddress');
    const walletAddress = addressElement.getAttribute('data-full-address');
    
    if (!walletAddress) {
      throw new Error('Wallet address not found');
    }
    
    // Get balance with cache-first approach (like Phantom)
    const balanceResult = await TransactionCacheService.getBalance(walletAddress);
    const balance = balanceResult.balance;
    
    // Show cached indicator
    if (balanceResult.cached) {
      console.log(`📦 Showing cached balance (${balanceResult.age}s old)`);
    }
    
    const usdPrice = 150; // Get from CoinGecko API in production
    const balanceUSD = (parseFloat(balance) * usdPrice).toFixed(2);
    
    document.getElementById('balance').textContent = `${balance} SOL`;
    document.getElementById('balanceUSD').textContent = `$${balanceUSD} USD`;
    
    // Load SPL tokens
    await loadSPLTokens(walletAddress);
    
  } catch (error) {
    console.error('Error refreshing balance:', error);
    document.getElementById('balance').textContent = '-- SOL';
    document.getElementById('balanceUSD').textContent = '$-- USD';
  }
}

// Load Transactions
async function loadTransactions() {
  try {
    const { data: transactions, error } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const listDiv = document.getElementById('transactionList');
    
    if (!transactions || transactions.length === 0) {
      listDiv.innerHTML = '<div class="loading">No recent transactions</div>';
      return;
    }
    
    listDiv.innerHTML = transactions.map(tx => {
      const statusColor = tx.status === 'confirmed' ? '#10b981' : 
                          tx.status === 'failed' ? '#ef4444' : 
                          tx.status === 'pending' ? '#f59e0b' : '#6b7280';
      
      const statusIcon = tx.status === 'confirmed' ? '✅' : 
                         tx.status === 'failed' ? '❌' : 
                         tx.status === 'pending' ? '⏳' : '❓';
      
      return `
        <div class="transaction-item">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div><strong>${tx.transaction_type.toUpperCase()}</strong></div>
            <div style="color: ${statusColor};">${statusIcon} ${tx.status}</div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px;">
            <div>${Math.abs(tx.amount)} SOL</div>
            <div style="opacity: 0.7; font-size: 11px;">${new Date(tx.created_at).toLocaleDateString()}</div>
          </div>
          ${tx.signature ? `<div style="opacity: 0.5; font-size: 10px; margin-top: 2px;">Tx: ${tx.signature.substring(0, 8)}...</div>` : ''}
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error loading transactions:', error);
    const listDiv = document.getElementById('transactionList');
    if (listDiv) {
      listDiv.innerHTML = '<div class="loading">Failed to load transactions</div>';
    }
  }
}

// Load SPL Tokens (new Phantom-level feature)
async function loadSPLTokens(walletAddress) {
  try {
    // Get cached token balances first
    const tokens = await SPLTokenService.getCachedTokenBalances(walletAddress);
    
    if (tokens.length > 0) {
      console.log(`🪙 Loaded ${tokens.length} SPL tokens`);
      // For now, just log them - full UI in v2.0
      tokens.forEach(token => {
        console.log(`${token.symbol}: ${token.balance}`);
      });
    }
    
  } catch (error) {
    console.error('Error loading SPL tokens:', error);
  }
}

// Handle Send Transaction with real-time monitoring
async function handleSend() {
  const recipient = document.getElementById('recipientAddress').value.trim();
  const amount = document.getElementById('sendAmount').value;
  const errorDiv = document.getElementById('sendError');
  const successDiv = document.getElementById('sendSuccess');
  
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  
  if (!recipient || !amount) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (parseFloat(amount) <= 0) {
    errorDiv.textContent = 'Amount must be greater than 0';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Validate recipient address
  if (!SolanaService.isValidAddress(recipient)) {
    errorDiv.textContent = 'Invalid recipient address';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    // Show loading state
    successDiv.textContent = 'Calculating fees...';
    successDiv.style.display = 'block';
    
    // PRODUCTION: Estimate real transaction fee from blockchain
    let estimatedFee;
    try {
      estimatedFee = await SolanaService.getEstimatedFee();
    } catch (error) {
      errorDiv.textContent = `Failed to estimate transaction fee: ${error.message}`;
      errorDiv.style.display = 'block';
      successDiv.style.display = 'none';
      return;
    }
    
    const totalCost = parseFloat(amount) + estimatedFee;
    
    // Check if user has enough balance
    const currentBalance = parseFloat(document.getElementById('balance').textContent.replace(' SOL', ''));
    if (totalCost > currentBalance) {
      errorDiv.textContent = `Insufficient balance. Need ${totalCost.toFixed(4)} SOL (${amount} + ${estimatedFee.toFixed(6)} fee)`;
      errorDiv.style.display = 'block';
      successDiv.style.display = 'none';
      return;
    }
    
    // Show fee confirmation
    const confirmFee = confirm(
      `Transaction Details:\n\n` +
      `Send: ${amount} SOL\n` +
      `Network Fee: ${estimatedFee.toFixed(6)} SOL\n` +
      `Total: ${totalCost.toFixed(4)} SOL\n\n` +
      `Continue with transaction?`
    );
    
    if (!confirmFee) {
      successDiv.style.display = 'none';
      return;
    }
    
    successDiv.textContent = 'Preparing transaction...';
    successDiv.style.display = 'block';
    
    // Get user's wallet keypair
    const { data: wallet } = await supabaseClient
      .from('wallets')
      .select('encrypted_private_key')
      .eq('user_id', currentUser.id)
      .eq('is_primary', true)
      .single();
    
    if (!wallet) throw new Error('Wallet not found');
    
    // Get password from user (in production, use session storage or ask user)
    const password = prompt('Enter your password to sign this transaction:');
    if (!password) {
      errorDiv.textContent = 'Password required to sign transaction';
      errorDiv.style.display = 'block';
      successDiv.style.display = 'none';
      return;
    }
    
    // Decrypt seed phrase
    const seedPhrase = await CeloraCrypto.decrypt(wallet.encrypted_private_key, password);
    const keypair = await SolanaService.keypairFromSeed(seedPhrase);
    
    successDiv.textContent = 'Sending transaction...';
    
    // Send transaction using SolanaService
    const signature = await SolanaService.sendTransaction(keypair, recipient, parseFloat(amount));
    
    // Record in database
    const txRecord = {
      user_id: currentUser.id,
      amount: parseFloat(amount),
      currency: 'SOL',
      transaction_type: 'send',
      status: 'pending',
      signature: signature,
      metadata: { recipient }
    };
    
    const { data: dbTx, error: txError } = await supabaseClient
      .from('transactions')
      .insert(txRecord)
      .select()
      .single();
    
    if (txError) throw txError;
    
    successDiv.textContent = 'Transaction sent! Waiting for confirmation...';
    
    // Start monitoring transaction confirmation
    monitorTransactionConfirmation(signature, dbTx.id);
    
    // Clear form and return to wallet screen
    setTimeout(() => {
      document.getElementById('recipientAddress').value = '';
      document.getElementById('sendAmount').value = '';
      showWalletScreen();
      refreshBalance();
      loadTransactions();
    }, 2000);
    
  } catch (error) {
    console.error('Send transaction error:', error);
    errorDiv.textContent = error.message || 'Transaction failed';
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
  }
}

// Monitor transaction confirmation in real-time
async function monitorTransactionConfirmation(signature, dbTransactionId) {
  try {
    console.log('Monitoring transaction:', signature);
    
    // Use SolanaService to confirm transaction
    const result = await SolanaService.confirmTransaction(signature);
    
    // Update database with confirmation status
    const status = result.confirmed ? 'confirmed' : 'failed';
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({ 
        status: status,
        confirmed_at: result.confirmed ? new Date().toISOString() : null,
        error_message: result.error ? JSON.stringify(result.error) : null
      })
      .eq('id', dbTransactionId);
    
    if (updateError) {
      console.error('Error updating transaction status:', updateError);
    }
    
    // Show notification
    if (result.confirmed && !result.error) {
      showNotification('Transaction Confirmed', 'Your SOL transaction has been confirmed on the blockchain!', 'success');
    } else {
      showNotification('Transaction Failed', 'Your transaction could not be confirmed. Please try again.', 'error');
    }
    
    // Refresh UI
    refreshBalance();
    loadTransactions();
    
  } catch (error) {
    console.error('Error monitoring transaction:', error);
    showNotification('Transaction Status Unknown', 'Unable to confirm transaction status. Check your transaction history.', 'warning');
  }
}

// Show notification helper
function showNotification(title, message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 300px;
    font-size: 12px;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
    <div>${message}</div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
  
  // Also try browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: message, icon: '/assets/icon48.png' });
  }
}

// Copy Address
function copyAddress() {
  try {
    const addressElement = document.getElementById('walletAddress');
    const fullAddress = addressElement.getAttribute('data-full-address') || addressElement.textContent;
    
    navigator.clipboard.writeText(fullAddress);
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = originalText, 2000);
  } catch (error) {
    console.error('Copy error:', error);
  }
}

// Handle Logout
async function handleLogout() {
  try {
    // Clear auto-lock timer
    clearTimeout(lockTimeoutId);
    
    // Sign out from Supabase
    await supabaseClient.auth.signOut();
    
    // Clear all sensitive data
    currentUser = null;
    sessionToken = null;
    
    await chrome.storage.local.remove([
      'encryptedSeed',
      'walletAddress',
      'sessionToken',
      'sessionExpiry'
    ]);
    
    showLoginScreen();
    
    showNotification('Logged Out', 'You have been securely logged out.', 'info');
    
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Show error message helper
function showError(message) {
  const errorDiv = document.getElementById('loginError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Update fee estimate in real-time
async function updateFeeEstimate() {
  const amountInput = document.getElementById('sendAmount');
  const feeEstimateDiv = document.getElementById('feeEstimate');
  const feeAmountSpan = document.getElementById('feeAmount');
  const feeNetworkSpan = document.getElementById('feeNetwork');
  const feeTotalSpan = document.getElementById('feeTotal');
  
  const amount = parseFloat(amountInput.value) || 0;
  
  if (amount > 0) {
    try {
      const networkFee = await SolanaService.getEstimatedFee();
      const total = amount + networkFee;
      
      feeAmountSpan.textContent = `${amount.toFixed(6)} SOL`;
      feeNetworkSpan.textContent = `~${networkFee.toFixed(6)} SOL`;
      feeTotalSpan.textContent = `${total.toFixed(6)} SOL`;
      
      feeEstimateDiv.style.display = 'block';
    } catch (error) {
      console.error('Error estimating fee:', error);
      feeEstimateDiv.style.display = 'none';
    }
  } else {
    feeEstimateDiv.style.display = 'none';
  }
}

// Make functions available globally
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.handleImport = handleImport;
window.showImportScreen = showImportScreen;
window.showLoginScreen = showLoginScreen;
window.showWalletScreen = showWalletScreen;
window.showSendScreen = showSendScreen;
window.refreshBalance = refreshBalance;
window.handleSend = handleSend;
window.copyAddress = copyAddress;
window.handleLogout = handleLogout;
window.updateFeeEstimate = updateFeeEstimate;
window.lockWallet = lockWallet;
