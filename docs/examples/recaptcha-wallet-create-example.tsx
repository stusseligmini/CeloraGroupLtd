/**
 * Example: Wallet Creation with reCAPTCHA Protection
 * 
 * This wraps the existing CreateSolanaWallet component with reCAPTCHA verification
 */

'use client';

import { withRecaptchaProtection } from '@/components/recaptcha/withRecaptchaProtection';
import { CreateSolanaWallet } from '@/components/solana/CreateSolanaWallet';
import { RecaptchaBadge } from '@/components/recaptcha/RecaptchaBadge';

// Wrap with reCAPTCHA protection
const ProtectedCreateWallet = withRecaptchaProtection(CreateSolanaWallet, {
  action: 'wallet_create',
  minScore: 0.7, // Higher threshold for wallet creation (70% human confidence)
  onVerificationFailed: (score, reasons) => {
    console.warn('Wallet creation blocked - reCAPTCHA score:', score, reasons);
    // Optional: Send to analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'recaptcha_failed', {
        action: 'wallet_create',
        score,
        reasons: reasons.join(','),
      });
    }
  },
});

export default function WalletCreatePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <ProtectedCreateWallet />
      <RecaptchaBadge />
    </div>
  );
}
