# 🚀 Celora Extension - Quick Test Guide

## ✅ PRE-FLIGHT CHECKLIST

Alle kritiske problemer er løst:
- ✅ Icons generert (icon16.png, icon48.png, icon128.png)
- ✅ CSP fikset (tillater Supabase CDN)
- ✅ AES-256-GCM kryptering implementert
- ✅ Error handling i alle async funksjoner
- ✅ Solana service integrert

---

## 📦 LOAD EXTENSION

### Steg 1: Åpne Chrome Extensions
```
1. Åpne Chrome
2. Gå til: chrome://extensions/
3. Aktiver "Developer mode" (toggle øverst til høyre)
```

### Steg 2: Last inn Extension
```
1. Klikk "Load unpacked"
2. Naviger til: d:\CeloraV2\extension
3. Klikk "Select Folder"
```

### Steg 3: Verifiser Last
```
✅ Extension vises i listen
✅ Ingen feilmeldinger
✅ Purple gradient icon synlig
```

---

## 🧪 TEST SCENARIOS

### Test 1: Register New Account
```
1. Klikk Celora icon i toolbar
2. Klikk "Register" tab
3. Email: test@example.com
4. Password: testpass123
5. Klikk "Register"

FORVENTET:
- Alert med 12-word seed phrase
- Automatisk login
- Wallet screen vises
- Balance vises (simulated)
```

### Test 2: Login Existing Account
```
1. Klikk Celora icon
2. Klikk "Login" tab
3. Email: (din email)
4. Password: (ditt password)
5. Klikk "Login"

FORVENTET:
- Automatisk navigasjon til wallet screen
- Wallet address vises (truncated)
- Balance hentes
- Transaction history lastes
```

### Test 3: Wallet Display
```
1. Sjekk at wallet screen viser:
   ✓ Wallet address (format: XXX...XXXX)
   ✓ Balance i SOL
   ✓ Balance i USD
   ✓ Copy address button
   ✓ Send button
   ✓ Refresh button

2. Klikk "Copy" button
   FORVENTET: Button text endres til "Copied!"

3. Klikk "Refresh" button
   FORVENTET: Balance oppdateres (ny random verdi)
```

### Test 4: Send Transaction
```
1. Klikk "Send" button
2. Send screen vises
3. Enter recipient: (hvilken som helst Solana address)
4. Enter amount: 0.5
5. Klikk "Send SOL"

FORVENTET:
- Success message vises
- Navigerer tilbake til wallet
- Transaction vises i history
- Balance oppdatert
```

### Test 5: Import Wallet
```
1. Klikk "Import Wallet" på login screen
2. Email: newuser@example.com
3. Password: newpass123
4. Seed phrase: (12 words separated by spaces)
5. Klikk "Import Wallet"

FORVENTET:
- Success message
- Wallet importert
- Automatisk login
```

### Test 6: Logout
```
1. På wallet screen, finn logout button (hvis implementert)
2. Klikk logout
3. Eller lukk popup og åpne igjen

FORVENTET:
- Session huskes (auto-login)
- Eller login screen vises
```

---

## 🐛 DEBUGGING

### Console Logs
```
1. Høyreklikk på extension icon
2. Velg "Inspect popup"
3. Sjekk Console tab for errors
```

### Common Issues

**Issue: Extension ikke synlig**
```
Løsning:
- Sjekk at Developer mode er aktivert
- Refresh extension listen
- Sjekk at icons finnes i assets/
```

**Issue: Supabase connection error**
```
Løsning:
- Sjekk internett tilkobling
- Verifiser Supabase credentials i lib/config.js
- Sjekk CSP i manifest.json
```

**Issue: "Failed to initialize wallet"**
```
Løsning:
- Åpne Console i popup
- Sjekk full error message
- Verifiser Supabase er oppe
```

**Issue: Encryption error**
```
Løsning:
- Sjekk at crypto.js er lastet
- Verifiser Web Crypto API er tilgjengelig
- Åpne Console for details
```

---

## 📊 SUCCESS CRITERIA

Extension er klar for testing hvis:
- ✅ Loads i Chrome uten errors
- ✅ Register fungerer og genererer wallet
- ✅ Login fungerer med existing account
- ✅ Wallet address vises riktig
- ✅ Balance hentes (selv om simulated)
- ✅ Send transaction records i database
- ✅ Transaction history vises
- ✅ Copy address fungerer
- ✅ Logout fungerer
- ✅ Ingen console errors under normal bruk

---

## 🔐 SECURITY CHECK

Verifiser følgende:
- ✅ Seed phrases encrypted med AES-256-GCM
- ✅ No plaintext seed in storage
- ✅ Password ikke synlig i console logs
- ✅ HTTPS connections til Supabase
- ✅ No credentials hardcoded (anon key er OK)

---

## 🚧 KNOWN ISSUES (Accept for MVP)

1. **Balance er simulert**: Venter på real Solana Web3.js CDN
2. **Send transaction ikke on-chain**: Records kun i database
3. **Seed wordlist begrenset**: Trenger full BIP39 wordlist
4. **No transaction confirmation**: Polling ikke implementert
5. **No gas fees**: Estimation ikke implementert

Disse er **akseptable for MVP testing** ✅

---

## 📝 TEST REPORT TEMPLATE

```
DATO: _______________
TESTER: _______________

TEST 1 - Register: [ ] PASS [ ] FAIL
Kommentar: _______________________

TEST 2 - Login: [ ] PASS [ ] FAIL
Kommentar: _______________________

TEST 3 - Wallet Display: [ ] PASS [ ] FAIL
Kommentar: _______________________

TEST 4 - Send Transaction: [ ] PASS [ ] FAIL
Kommentar: _______________________

TEST 5 - Import Wallet: [ ] PASS [ ] FAIL
Kommentar: _______________________

TEST 6 - Logout: [ ] PASS [ ] FAIL
Kommentar: _______________________

CONSOLE ERRORS: [ ] JA [ ] NEI
Hvis ja, list: _______________________

OVERALL STATUS: [ ] READY [ ] NEEDS WORK
```

---

## 🎯 NEXT STEPS AFTER TESTING

If all tests pass:
1. ✅ Test på Supabase devnet
2. ✅ Verify database schema (wallets, transactions tables)
3. ✅ Deploy RLS policies for extension
4. 📦 Add real Solana Web3.js CDN
5. 🎨 Improve icons (professional design)
6. 📱 Test på Edge browser
7. 🚀 Prepare for Chrome Web Store

---

**God testing!** 🚀
