'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  validateMnemonicPhrase,
  deriveWallet, 
  hashMnemonic,
  WalletEncryption,
  storeWalletLocally,
} from '@/lib/wallet/nonCustodialWallet';
import { deriveSolanaWallet } from '@/lib/solana/solanaWallet';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider';
import api from '@/lib/apiClient';

type Step = 'import' | 'password' | 'complete';

interface PasswordStrength {
  score: number;
  feedback: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, feedback: 'Enter a password' };
  }

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else if (password.length > 0) feedback.push('Use both uppercase and lowercase letters');

  if (/\d/.test(password)) score += 1;
  else if (password.length > 0) feedback.push('Add numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else if (password.length > 0) feedback.push('Add special characters (!@#$%^&*)');

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Very Strong'];

  return {
    score: Math.min(score, 4),
    feedback: feedback.length > 0 ? feedback.join('. ') : strengthLabels[score],
  };
}

export function ImportSolanaWallet() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [step, setStep] = useState<Step>('import');
  const [mnemonic, setMnemonic] = useState('');
  const [mnemonicError, setMnemonicError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');

  // SECURITY: Cleanup sensitive data on unmount
  useEffect(() => {
    return () => {
      setMnemonic('');
      setPassword('');
      setConfirmPassword('');
    };
  }, []);

  // Validate mnemonic as user types
  const handleMnemonicChange = (value: string) => {
    setMnemonic(value);
    setMnemonicError('');
    
    const trimmed = value.trim();
    if (trimmed) {
      const words = trimmed.split(/\s+/);
      if (words.length !== 12 && words.length !== 24) {
        setMnemonicError(`Recovery phrase must be 12 or 24 words (currently ${words.length})`);
      } else if (!validateMnemonicPhrase(trimmed)) {
        setMnemonicError('Invalid recovery phrase. Please check your words.');
      }
    }
  };

  // Validate password strength
  React.useEffect(() => {
    if (step === 'password') {
      setPasswordStrength(calculatePasswordStrength(password));
    }
  }, [password, step]);

  // Proceed to password step
  const handleProceedToPassword = () => {
    const trimmed = mnemonic.trim();
    
    if (!trimmed) {
      setMnemonicError('Please enter your recovery phrase');
      return;
    }

    const words = trimmed.split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setMnemonicError(`Recovery phrase must be 12 or 24 words (currently ${words.length})`);
      return;
    }

    if (!validateMnemonicPhrase(trimmed)) {
      setMnemonicError('Invalid recovery phrase. Please check your words and try again.');
      return;
    }

    setMnemonicError('');
    setStep('password');
  };

  // Import wallet
  const handleImportWallet = async () => {
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength.score < 2) {
      setError('Please use a stronger password');
      return;
    }

    if (!user) {
      setError('Please sign in to import a wallet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const trimmed = mnemonic.trim();
      
      // Step 1: Derive Solana wallet from mnemonic
      const solanaWallet = deriveSolanaWallet(trimmed, 0);
      const publicKeyHex = Buffer.from(solanaWallet.publicKey.toBytes()).toString('hex');
      
      setWalletAddress(solanaWallet.address);

      // Step 2: Encrypt mnemonic with password
      const encryptionResult = await WalletEncryption.encrypt(trimmed, password);

      // Step 3: Hash mnemonic for server verification
      const mnemonicHash = hashMnemonic(trimmed);

      // Step 4: Import wallet via API (uses shared api client to include auth)
      const walletData = await api.post<{ data: { id: string } }>(
        '/wallet/import',
        {
          blockchain: 'solana',
          mnemonic: trimmed,
          label: 'Imported Solana Wallet',
          isDefault: true,
        }
      );

      // Step 5: Store encrypted mnemonic locally
      await storeWalletLocally(
        walletData.data.id,
        encryptionResult.encrypted,
        encryptionResult.salt,
        encryptionResult.iv,
        localStorage
      );

      // Step 6: Move to complete step
      setStep('complete');
      
      // SECURITY: Clear sensitive data from memory
      setMnemonic('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet');
      console.error('Error importing wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'import':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Import Recovery Phrase</h3>
              <p className="text-gray-600">
                Enter your 12 or 24-word recovery phrase to restore your wallet.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-semibold mb-1">⚠️ Security Warning</p>
              <p className="text-sm text-yellow-700">
                Never share your recovery phrase with anyone. We will never ask for it.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Recovery Phrase</label>
              <textarea
                value={mnemonic}
                onChange={(e) => handleMnemonicChange(e.target.value)}
                placeholder="Enter your 12 or 24-word recovery phrase separated by spaces"
                className="w-full min-h-[120px] p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                autoComplete="off"
                spellCheck={false}
              />
              {mnemonicError && (
                <p className="text-red-600 text-sm">{mnemonicError}</p>
              )}
              {mnemonic.trim() && !mnemonicError && (
                <p className="text-green-600 text-sm">✓ Valid recovery phrase</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToPassword}
                disabled={!mnemonic.trim() || !!mnemonicError}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'password':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Secure Your Wallet</h3>
              <p className="text-gray-600">
                Create a password to encrypt your recovery phrase on this device.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full"
                />
                {password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            passwordStrength.score === 0 ? 'bg-red-500 w-0'
                            : passwordStrength.score === 1 ? 'bg-red-500 w-1/4'
                            : passwordStrength.score === 2 ? 'bg-yellow-500 w-1/2'
                            : passwordStrength.score === 3 ? 'bg-green-500 w-3/4'
                            : 'bg-green-600 w-full'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score === 0 ? 'text-red-600'
                        : passwordStrength.score === 1 ? 'text-red-600'
                        : passwordStrength.score === 2 ? 'text-yellow-600'
                        : passwordStrength.score === 3 ? 'text-green-600'
                        : 'text-green-700'
                      }`}>
                        {passwordStrength.feedback}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('import')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleImportWallet}
                disabled={loading || !password || !confirmPassword || password !== confirmPassword || passwordStrength.score < 2}
                className="flex-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Importing...
                  </span>
                ) : 'Import Wallet'}
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6 text-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-semibold mb-2 text-green-800">Wallet Imported Successfully!</h3>
              <p className="text-gray-600">
                Your Solana wallet has been restored. Your recovery phrase is encrypted and stored locally.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Your Wallet Address</p>
              <p className="font-mono text-sm break-all bg-white p-2 rounded border">
                {walletAddress}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(walletAddress);
                  alert('Address copied to clipboard!');
                }}
                className="mt-2"
              >
                Copy Address
              </Button>
            </div>

            <Button
              onClick={() => router.push('/wallet')}
              className="w-full"
            >
              Go to Wallet Dashboard
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Import Wallet</CardTitle>
        <CardDescription>
          {step === 'import' && 'Enter your recovery phrase'}
          {step === 'password' && 'Set your password'}
          {step === 'complete' && 'Wallet imported successfully'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['import', 'password', 'complete'].map((s, index) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  ['import', 'password', 'complete'].indexOf(step) >= index
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div
                  className={`w-12 h-1 ${
                    ['import', 'password', 'complete'].indexOf(step) > index
                      ? 'bg-cyan-600'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {renderStepContent()}
      </CardContent>
    </Card>
  );
}
