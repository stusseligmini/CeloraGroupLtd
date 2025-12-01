/**
 * Example: Send Transaction with reCAPTCHA
 * 
 * This shows how to add reCAPTCHA verification to the SendSolana component
 * before allowing transactions
 */

'use client';

import { useState } from 'react';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { executeAndVerifyRecaptcha } from '@/lib/recaptcha/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';

export function SendSolanaWithRecaptcha() {
  const { executeRecaptcha, ready } = useRecaptcha();
  const [verifying, setVerifying] = useState(false);

  const handleSendTransaction = async () => {
    setVerifying(true);
    
    try {
      // Step 1: Execute and verify reCAPTCHA
      const verification = await executeAndVerifyRecaptcha(
        executeRecaptcha,
        'transaction'
      );

      // Step 2: Check verification result
      if (!verification.success) {
        toast.error('Security verification failed. Please try again.');
        return;
      }

      // Step 3: Check score threshold
      if (verification.score < 0.5) {
        toast.error(
          'Unusual activity detected. Please contact support if this persists.',
          { duration: 6000 }
        );
        console.warn('Low reCAPTCHA score:', verification.score, verification.reasons);
        return;
      }

      // Step 4: Proceed with transaction
      toast.success('Security check passed');
      
      // Your existing transaction logic here...
      // await sendSolanaTransaction(...);
      
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Transaction failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Button
      onClick={handleSendTransaction}
      disabled={!ready || verifying}
    >
      {verifying ? 'Verifying...' : 'Send SOL'}
    </Button>
  );
}

// Alternative: Add to existing SendSolana component
// Add this before your transaction submission:

/*
// In your existing handleSend or similar function:

const handleSend = async () => {
  // ... existing validation ...
  
  // Add reCAPTCHA verification
  if (ready) {
    const verification = await executeAndVerifyRecaptcha(
      executeRecaptcha,
      'transaction'
    );
    
    if (!verification.success || verification.score < 0.5) {
      toast.error('Security verification failed');
      return;
    }
  }
  
  // ... proceed with transaction ...
};
*/
