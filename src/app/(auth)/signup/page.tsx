'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import authService from '@/lib/auth';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!fullName.trim()) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('🚀 Creating account with email and password...');
      const result = await authService.signUpWithEmail(email, password, fullName);
      
      if (result.success) {
        setSuccess('🎉 Account created successfully! Welcome to Celora!');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(result.error || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      console.error('Account creation error:', err);
      setError('Network error. Please check your connection and try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950/30 to-purple-950/30 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-cyan-950/10 to-purple-950/10"></div>
      </div>
      <div className="max-w-md w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/60 backdrop-blur-xl border-2 border-cyan-400/30 rounded-2xl p-8 shadow-[0_0_80px_rgba(6,182,212,0.3)]"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(6,24,44,0.8) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 0 80px rgba(6,182,212,0.3), inset 0 0 40px rgba(6,182,212,0.05)',
          }}
        >
          {/* Header with Logo - FULL CELORA DESIGN */}
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <div className="relative w-48 h-48">
                {/* Background glow effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>

                {/* Use static logo from public */}
                <Image
                  src="/celora-logo-full.svg"
                  alt="Celora"
                  width={192}
                  height={192}
                  priority
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
            <h1 className="text-3xl font-mono font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent mb-2 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]">
              CELORA
            </h1>
            <p className="text-cyan-300/80 font-mono text-sm tracking-wider">CREATE YOUR WALLET</p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 p-4 bg-red-500/10 border-2 border-red-500/40 rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.3)] backdrop-blur"
              >
                <p className="text-red-400 text-sm font-mono">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-4 p-4 bg-green-500/10 border-2 border-green-500/40 rounded-lg shadow-[0_0_30px_rgba(34,197,94,0.3)] backdrop-blur"
              >
                <p className="text-green-400 text-sm font-mono">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-black/50 border-2 border-cyan-400/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] focus:outline-none transition-all backdrop-blur"
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border-2 border-cyan-400/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] focus:outline-none transition-all backdrop-blur"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                PASSWORD
              </label>
                <input
                  type="password"
                  autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border-2 border-cyan-400/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] focus:outline-none transition-all backdrop-blur"
                placeholder="Choose a strong password"
                disabled={loading}
                minLength={8}
              />
              <p className="text-xs text-cyan-300/60 mt-1 font-mono">
                Must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-mono text-cyan-400 mb-2 tracking-wider drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                CONFIRM PASSWORD
              </label>
                <input
                  type="password"
                  autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/50 border-2 border-cyan-400/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:shadow-[0_0_20px_rgba(6,182,212,0.4)] focus:outline-none transition-all backdrop-blur"
                placeholder="Repeat your password"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 hover:from-cyan-300 hover:via-blue-300 hover:to-purple-400 text-black font-mono font-bold py-4 px-4 rounded-lg transition-all disabled:opacity-50 shadow-[0_0_40px_rgba(6,182,212,0.6)] hover:shadow-[0_0_60px_rgba(6,182,212,0.8)] border-2 border-cyan-300/50 overflow-hidden group disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                    CREATING WALLET...
                  </div>
                ) : (
                  'CREATE WALLET'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/20 to-purple-300/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 pt-6 border-t-2 border-cyan-400/30 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link 
                href="/signin" 
                className="text-cyan-400 hover:text-cyan-300 transition-all font-mono drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] hover:drop-shadow-[0_0_12px_rgba(6,182,212,1)]"
              >
                SIGN IN
              </Link>
            </p>
          </div>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-purple-500/10 border-2 border-purple-500/30 rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] backdrop-blur">
            <h3 className="text-purple-400 font-mono font-medium text-sm mb-2 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">🔒 PROFESSIONAL SECURITY</h3>
            <p className="text-gray-400 text-xs">
              After creating your account, you'll have the option to set up a 12-word 
              seed phrase backup for ultimate security. This follows industry best practices 
              for professional fintech platforms.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
