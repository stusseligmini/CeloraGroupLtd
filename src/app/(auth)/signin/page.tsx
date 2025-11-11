"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export default function SignInPage() {
  const { signIn, triggerPasswordReset, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    const result = await signIn();
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    const result = await triggerPasswordReset();
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/25 via-slate-950/40 to-blue-950/25" />
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/65 backdrop-blur-lg border border-cyan-400/25 rounded-2xl px-10 py-12 space-y-8 shadow-[0_25px_80px_-25px_rgba(0,220,255,0.45)]"
        >
          <div className="space-y-2">
            <p className="uppercase tracking-[0.3em] text-xs text-cyan-300/80">Celora Identity</p>
            <h1 className="text-3xl font-mono font-bold text-cyan-200">Secure Sign-In</h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Du sendes til Azure AD B2C for autentisering. Dette gir enterprise-sikkerhet,
              automatisk policyhåndhevelse og sømløs SSO på tvers av Celora-plattformen.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:via-sky-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-mono font-semibold py-3 rounded-md transition-all"
            >
              {isLoading ? 'Redirecting…' : 'Sign in with Celora ID'}
            </button>

            <button
              onClick={handlePasswordReset}
              disabled={isLoading}
              className="w-full border border-cyan-400/40 hover:border-cyan-400 text-cyan-200 hover:text-white font-mono py-3 rounded-md transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <div className="text-sm text-gray-400 flex items-center justify-between">
            <span>Har du ikke konto?</span>
            <Link href="/signup" className="text-cyan-300 hover:text-cyan-200 font-medium">
              Registrer deg
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
