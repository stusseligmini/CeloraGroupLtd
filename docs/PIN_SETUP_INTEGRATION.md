# PIN Setup Integration Guide

## Overview

The wallet creation flow now includes a mandatory PIN setup step that occurs after password configuration. This adds an extra layer of security by allowing users to quickly unlock their wallet with a PIN instead of typing a full password.

## Wallet Creation Flow

The complete wallet creation process follows this sequence:

1. **Generate** - Create a new 12 or 24-word recovery phrase
2. **Backup** - Review and copy the recovery phrase to a safe location
3. **Verify** - Confirm the recovery phrase by entering words at random positions
4. **Password** - Set an encryption password for the wallet (8+ characters, strong complexity required)
5. **PIN Setup** - Create a 4-8 digit PIN for quick wallet access ✨ NEW
6. **Complete** - Success message with wallet address and option to go to dashboard

## PIN Setup Step Details

### PIN Requirements

- **Length**: 4-8 digits
- **Format**: Numbers only (0-9)
- **Strength**: Score must be at least "Fair" (2/4)

### PIN Strength Validation

The PIN strength calculator evaluates PINs based on:

| Requirement | Feedback |
|---|---|
| Too short | Shows "Need X more digits" |
| Repeating digits | Warns "Avoid repeating digits (like 1111)" |
| Sequential numbers | Warns "Avoid sequential numbers" (e.g., 1234, 5678) |
| 4-5 digits | Fair (score: 2) ✓ Minimum accepted |
| 6+ digits | Good (score: 3) ✓ |
| 8 digits | Very Strong (score: 4) ✓ |

### User Experience

The PIN setup screen includes:

- **Input fields** with digit-only validation (automatically strips non-digits)
- **Confirmation field** that must match the first PIN exactly
- **Visual strength indicator** showing PIN quality with color-coded feedback
- **Mismatch warning** when confirmation doesn't match initial PIN
- **Security note** explaining PIN encryption and local storage
- **Back button** to return to password configuration
- **Complete Setup button** that:
  - Validates PIN strength
  - Checks PIN confirmation matches
  - Encrypts and stores PIN locally using `setWalletPin()`
  - Proceeds to success screen

## Implementation Details

### Component Changes

**File**: `src/components/solana/CreateSolanaWallet.tsx`

#### Type Definition Update

```typescript
type Step = 'generate' | 'backup' | 'verify' | 'password' | 'pin-setup' | 'complete';
```

#### New State Variables

```typescript
const [pin, setPin] = useState('');
const [confirmPin, setConfirmPin] = useState('');
const [pinStrength, setPinStrength] = useState<PasswordStrength>({ score: 0, feedback: '' });
const [pinError, setPinError] = useState<string | null>(null);
```

#### PIN Strength Calculator Function

```typescript
function calculatePinStrength(pin: string): PasswordStrength {
  // Returns score (0-4) and feedback message
  // Checks: length, repeating digits, sequential patterns
}
```

#### handleSetupPin Handler

```typescript
const handleSetupPin = async () => {
  // Validates PIN format and strength
  // Calls setWalletPin(pin) to encrypt and store
  // Clears sensitive data from memory
  // Moves to complete step on success
};
```

#### PIN Setup Render Case

The `renderStepContent()` switch statement includes the new case:

```typescript
case 'pin-setup':
  return (
    <div className="space-y-6">
      {/* Security note */}
      {/* PIN input with strength indicator */}
      {/* Confirmation input with mismatch warning */}
      {/* Back and Complete Setup buttons */}
    </div>
  );
```

#### Progress Indicator Update

The step progress bar now shows 6 steps instead of 5:

```typescript
{['generate', 'backup', 'verify', 'password', 'pin-setup', 'complete'].map(...)}
```

### PIN Management Integration

**File**: `src/lib/wallet/pinManagement.ts`

The PIN setup uses the existing PIN management service:

```typescript
import { setWalletPin } from '@/lib/wallet/pinManagement';

// In handleSetupPin:
await setWalletPin(pin);
```

**What happens when `setWalletPin()` is called**:

1. Generates a cryptographic salt using SubtleCrypto API
2. Hashes the PIN with PBKDF2 (100,000 iterations)
3. Stores encrypted PIN in `localStorage` (key: `wallet_pin_hash`)
4. Stores salt in `localStorage` (key: `wallet_pin_salt`)
5. Creates unlock session in `sessionStorage` (expires in 30 minutes)

## User Flows

### First-Time User (New Wallet)

1. User starts onboarding
2. Chooses "Create New Wallet"
3. Completes 4 initial steps (generate → backup → verify → password)
4. **PIN Setup screen appears** with empty fields
5. User enters a strong PIN (e.g., "4726")
6. Confirms PIN by entering it again
7. Sees strength indicator showing "Good" or better
8. Clicks "Complete Setup"
9. PIN is encrypted and stored locally
10. Success screen shows with wallet address
11. User can now access wallet from lock screen with PIN

### Returning User (PIN Unlock)

1. User visits `/wallet` page
2. If PIN is configured (detected via `isPinConfigured()`)
3. WalletUnlock component appears instead of dashboard
4. User enters their PIN to unlock
5. Session becomes valid for 30 minutes
6. Dashboard is shown

## Security Considerations

### What's Protected

✅ PIN is encrypted before storage  
✅ Encryption uses cryptographic salt  
✅ PIN is never sent to server  
✅ PIN is cleared from memory after use  
✅ Session automatically locks after 30 minutes  
✅ Failed unlock attempts are counted (lockout after 5)  

### What's NOT Protected (by design)

⚠️ PIN is stored on client device (localStorage)  
⚠️ If device is physically compromised, PIN could be extracted  
⚠️ Password is still required to decrypt wallet seed phrase  

### Recommendations

- Educate users to use strong PINs (6-8 digits minimum recommended)
- Warn users not to use birthdays, phone numbers, or sequential digits
- Recommend using PIN only on trusted devices
- Emphasize that password is still the primary security layer

## Migration Notes

### For Existing Users

Existing users without a configured PIN will:

1. See the PIN unlock screen on first wallet access
2. Have option to set PIN or skip (determined by business logic in `WalletUnlock`)
3. Cannot access wallet without either PIN or alternative unlock method

### For New Users

All new users created through onboarding will:

1. Be required to set PIN during wallet creation
2. Cannot skip this step
3. Will have PIN configured before accessing wallet dashboard

## Testing Checklist

- [ ] PIN setup screen appears after password step
- [ ] PIN input field only accepts digits (0-9)
- [ ] Strength indicator updates in real-time
- [ ] PIN with < 4 digits shows weakness warning
- [ ] Repeating digits (1111) shows warning
- [ ] Sequential digits (1234) shows warning
- [ ] 6+ digit PIN shows "Good" strength
- [ ] Confirmation mismatch shows error message
- [ ] Back button returns to password step
- [ ] Complete Setup button disabled until requirements met
- [ ] PIN is successfully stored in localStorage
- [ ] PIN hash key exists: `wallet_pin_hash`
- [ ] PIN salt key exists: `wallet_pin_salt`
- [ ] Success screen appears after PIN setup
- [ ] User can proceed to wallet dashboard
- [ ] On next wallet access, unlock screen appears if PIN configured
- [ ] Correct PIN unlocks wallet
- [ ] Incorrect PIN shows error and counts attempts

## API Reference

### setWalletPin(pin: string)

Encrypts and stores a wallet PIN locally.

```typescript
await setWalletPin('1234567');
// Returns: void (throws on error)
// Side effects: 
//   - Stores hash in localStorage['wallet_pin_hash']
//   - Stores salt in localStorage['wallet_pin_salt']
//   - Creates unlock session in sessionStorage
```

### verifyWalletPin(pin: string)

Verifies a PIN against the stored hash.

```typescript
const isCorrect = await verifyWalletPin('1234567');
// Returns: boolean
// Side effects: 
//   - Updates attempt counter if wrong
//   - Creates unlock session if correct
//   - Returns false if locked out (5+ failed attempts)
```

### isPinConfigured()

Checks if a PIN has been set up.

```typescript
const hasPin = isPinConfigured();
// Returns: boolean (checks if hash exists in localStorage)
```

### isWalletUnlocked()

Checks if the current session is unlocked.

```typescript
const isUnlocked = isWalletUnlocked();
// Returns: boolean (checks sessionStorage unlock timestamp)
```

### lockWallet()

Manually locks the wallet by clearing the unlock session.

```typescript
lockWallet();
// Returns: void
// Side effects: Clears sessionStorage unlock timestamp
```

## Future Enhancements

1. **Biometric Unlock** - Add fingerprint/face ID as alternative to PIN
2. **PIN Reset** - Allow users to reset forgotten PIN with password verification
3. **PIN Expiration** - Implement periodic PIN changes for enhanced security
4. **Offline PIN** - Ensure PIN works when offline
5. **PIN Analytics** - Track PIN unlock patterns for anomaly detection
6. **Hardware Wallet Integration** - Sync PIN with hardware devices

## Troubleshooting

### User Forgets PIN

Current behavior: User must re-create wallet or use password to access seed phrase.

Future enhancement: Implement PIN reset via password verification.

### PIN Not Storing

1. Check localStorage is enabled in browser
2. Check browser isn't in private/incognito mode
3. Verify `setWalletPin()` isn't throwing errors
4. Check browser console for errors

### PIN Unlock Not Working

1. Verify `isPinConfigured()` returns true
2. Check `verifyWalletPin()` is being called
3. Check sessionStorage for `wallet_unlock_timestamp`
4. Verify 30-minute session timeout hasn't expired

## References

- PIN Management Service: `src/lib/wallet/pinManagement.ts`
- Wallet Unlock Component: `src/components/wallet/WalletUnlock.tsx`
- Wallet Page: `src/app/wallet/page.tsx`
- Wallet Creation Component: `src/components/solana/CreateSolanaWallet.tsx`
