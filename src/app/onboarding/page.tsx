"use client";

import { useState } from 'react';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { CreateVsImportChoice } from '@/components/onboarding/CreateVsImportChoice';

export default function OnboardingPage() {
  const [step, setStep] = useState<'welcome' | 'choice'>('welcome');

  if (step === 'welcome') {
    return <WelcomeScreen onContinue={() => setStep('choice')} />;
  }

  return <CreateVsImportChoice onBack={() => setStep('welcome')} />;
}
