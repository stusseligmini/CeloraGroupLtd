/**
 * Example: Login/Signup with reCAPTCHA
 * 
 * This shows how to add reCAPTCHA to authentication flows
 */

'use client';

import { useState } from 'react';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { executeAndVerifyRecaptcha, annotateRecaptcha } from '@/lib/recaptcha/client';
import { toast } from '@/lib/toast';

export function LoginFormWithRecaptcha() {
  const { executeRecaptcha, ready } = useRecaptcha();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Execute reCAPTCHA
      const verification = await executeAndVerifyRecaptcha(
        executeRecaptcha,
        'login'
      );

      if (!verification.success || verification.score < 0.5) {
        toast.error('Security verification failed');
        
        // Annotate as failed verification
        if (verification.assessmentName) {
          await annotateRecaptcha({
            assessmentName: verification.assessmentName,
            annotation: 'FRAUDULENT',
            reasons: ['LOW_SCORE', 'FAILED_VERIFICATION'],
          });
        }
        
        return;
      }

      // Step 2: Attempt login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Success - annotate as legitimate
        if (verification.assessmentName) {
          await annotateRecaptcha({
            assessmentName: verification.assessmentName,
            annotation: 'PASSWORD_CORRECT',
            hashedAccountId: email, // Or hash: crypto.createHash('sha256').update(email).digest('hex')
          });
        }
        
        toast.success('Login successful');
        // Redirect...
      } else {
        // Failed login - annotate as incorrect password
        if (verification.assessmentName) {
          await annotateRecaptcha({
            assessmentName: verification.assessmentName,
            annotation: 'PASSWORD_INCORRECT',
            reasons: ['INVALID_CREDENTIALS'],
          });
        }
        
        toast.error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={!ready || loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

// For signup, use action: 'signup' instead of 'login'
// For password reset, use action: 'password_reset'
