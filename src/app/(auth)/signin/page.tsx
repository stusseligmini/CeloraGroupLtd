'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

export default function SignInPage() {
  const router = useRouter();
  const { user, signIn, isLoading } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="cel-loading">
          <div className="cel-loading__spinner"></div>
          <span className="cel-loading__label">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0a0e17] via-[#1a1f2e] to-[#0a0e17]">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-glow/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero section */}
        <div className="text-center mb-12">
          {/* Logo - Celora "C" with gradient effect */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-glow to-cyan-primary rounded-full opacity-20 blur-2xl animate-pulse"></div>
              <div className="relative flex items-center justify-center w-full h-full rounded-full border-4 border-cyan-primary/30 bg-dark-surface/50 backdrop-blur-sm">
                <span className="logo-text text-6xl sm:text-7xl font-bold">C</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold mb-6">
            <span className="neon-text-purple">CELORA</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl lg:text-3xl font-medium mb-4 text-cyan-primary text-shadow-neon">
            Your Non-Custodial Crypto Wallet
          </p>

          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-12">
            Multi-chain wallet, virtual cards, instant casino deposits, and more. 
            <br className="hidden sm:block" />
            Your keys, your crypto, your control.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="modern-card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cyan-primary/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Non-Custodial</h3>
            <p className="text-sm text-gray-400">Your keys never leave your device</p>
          </div>

          <div className="modern-card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cyan-primary/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Virtual Cards</h3>
            <p className="text-sm text-gray-400">VISA & Mastercard with crypto cashback</p>
          </div>

          <div className="modern-card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cyan-primary/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Instant Deposits</h3>
            <p className="text-sm text-gray-400">Lightning-fast casino deposits</p>
          </div>

          <div className="modern-card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-cyan-primary/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Multi-Chain</h3>
            <p className="text-sm text-gray-400">Solana, Ethereum, Bitcoin & more</p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="btn-primary w-full sm:w-auto px-12 py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Sign In / Sign Up'}
          </button>

          <button
            onClick={() => router.push('/onboarding')}
            className="btn-outline w-full sm:w-auto px-12 py-4 text-lg font-bold"
          >
            Learn More
          </button>
        </div>

        {/* Security badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-5 h-5 text-cyan-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Secured with Firebase Authentication & End-to-End Encryption</span>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-primary to-transparent opacity-30"></div>
    </div>
  );
}
