"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export default function UpdatePasswordPage() {
  const { triggerPasswordReset, isLoading } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordReset = async () => {
    setStatus(null);
    setError(null);
    const result = await triggerPasswordReset();

    if (!result.success && result.error) {
      setError(result.error);
      return;
    }

    setStatus(
      'A secure Azure AD B2C password reset flow has been started. Complete the steps in the new window to finish updating your password.',
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-gray-950 to-blue-950 opacity-80" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl bg-gray-900/70 backdrop-blur-xl border border-cyan-400/25 rounded-2xl px-10 py-12 space-y-8 shadow-[0_25px_80px_-25px_rgba(0,220,255,0.35)]"
      >
        <div className="space-y-2">
          <p className="uppercase tracking-[0.3em] text-xs text-cyan-300/80">Celora Identity</p>
          <h1 className="text-3xl font-mono font-bold text-cyan-200">Update Your Password</h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            Celora bruker Azure AD B2C for passordadministrasjon. Klikk på knappen under for å starte den
            sikre B2C-reset flyten. Du blir sendt til Microsoft sitt passordskjema og returnerer hit når
            prosessen er fullført.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {status && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {status}
          </div>
        )}

        <button
          onClick={handlePasswordReset}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:via-sky-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-mono font-semibold py-3 rounded-md transition-all"
        >
          {isLoading ? 'Redirecting…' : 'Start Azure Password Reset'}
        </button>

        <div className="text-sm text-gray-400 flex items-center justify-between">
          <Link href="/signin" className="text-cyan-300 hover:text-cyan-200 font-medium">
            Tilbake til innlogging
          </Link>
          <Link href="/signup" className="text-cyan-300 hover:text-cyan-200 font-medium">
            Opprett konto
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
