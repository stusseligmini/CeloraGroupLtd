'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { CeloraLogo } from '@/components/ui/CeloraLogo';

export default function SplashPage() {
  const router = useRouter();
  const { user, isLoading, signIn } = useAuth();

  useEffect(() => {
    // If already authenticated, go straight to dashboard
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleGetStarted = async () => {
    try {
      console.log('[Splash] Starting sign in...');
      const result = await signIn();
      console.log('[Splash] Sign in result:', result);
      if (result.success !== false) {
        console.log('[Splash] Sign in successful, user should be set');
      } else {
        console.error('[Splash] Sign in failed:', result.error);
        alert('Login failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[Splash] Sign in exception:', error);
      alert('Login error: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-bg relative flex flex-col items-center justify-start pt-24 px-8">
      {/* Soft neon radial overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-radial from-cyan-500/10 via-transparent to-purple-500/10"
        aria-hidden="true"
      />
      {/* Main content container */}
      <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center space-y-0">
        {/* Lock + wordmark act as the single CTA (accessible button) */}
        <button
          type="button"
          onClick={handleGetStarted}
          disabled={isLoading}
          aria-label="Get started"
          aria-busy={isLoading}
          className="group rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1022] motion-safe:animate-neon-pulse transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.985] disabled:opacity-60 disabled:cursor-not-allowed filter drop-shadow-[0_0_30px_rgba(10,245,211,.15)] hover:drop-shadow-[0_0_40px_rgba(10,245,211,.25)]"
        >
          <CeloraLogo
            size="hero"
            layout="stack"
            src="/images/celora-lock.png"
            wordmarkSrc="/images/celora-wordmark.png"
            wordmarkClassName="brightness-110 contrast-105"
          />
        </button>
      </div>
    </div>
  );
}
