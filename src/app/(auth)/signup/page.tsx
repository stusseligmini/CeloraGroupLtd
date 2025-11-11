"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export default function SignUpPage() {
  const { signUp, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    const result = await signUp();
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 via-slate-950/40 to-cyan-950/30" />
      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/65 backdrop-blur-lg border border-purple-400/25 rounded-2xl px-10 py-12 space-y-8 shadow-[0_25px_80px_-25px_rgba(168,85,247,0.45)]"
        >
          <div className="space-y-2">
            <p className="uppercase tracking-[0.3em] text-xs text-purple-300/80">Celora Identity</p>
            <h1 className="text-3xl font-mono font-bold text-purple-200">Create your Celora ID</h1>
            <p className="text-sm text-gray-300 leading-relaxed">
              Registreringen håndteres av Azure AD B2C. Du blir sendt til Microsoft sitt sikre grensesnitt for å fullføre prosessen.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleSignUp}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 hover:from-purple-400 hover:via-pink-400 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-mono font-semibold py-3 rounded-md transition-all"
          >
            {isLoading ? 'Opening Azure AD B2C…' : 'Register with Celora ID'}
          </button>

          <div className="text-sm text-gray-400 flex items-center justify-between">
            <span>Har du allerede konto?</span>
            <Link href="/signin" className="text-cyan-300 hover:text-cyan-200 font-medium">
              Logg inn
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
