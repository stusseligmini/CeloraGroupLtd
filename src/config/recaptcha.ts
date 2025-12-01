/**
 * reCAPTCHA Enterprise Configuration
 * 
 * Security: Site keys are public, secret keys MUST be server-side only
 */

export const recaptchaConfig = {
  // Google Cloud Project ID for reCAPTCHA Enterprise
  projectId: process.env.NEXT_PUBLIC_RECAPTCHA_PROJECT_ID || 'celora-7b552',
  
  // reCAPTCHA v3 (invisible) - for background scoring
  v3: {
    siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY || '',
    // Minimum score threshold (0.0 = bot, 1.0 = human)
    scoreThreshold: 0.5,
    // Actions to track
    actions: {
      LOGIN: 'login',
      SIGNUP: 'signup',
      WALLET_CREATE: 'wallet_create',
      WALLET_IMPORT: 'wallet_import',
      TRANSACTION: 'transaction',
      SWAP: 'swap',
      USERNAME_REGISTER: 'username_register',
      PASSWORD_RESET: 'password_reset',
      LINK_TELEGRAM: 'link_telegram',
    },
  },
  
  // Server-side secret key (NEVER expose to client)
  // Accessed only in API routes/functions
  secretKey: process.env.RECAPTCHA_SECRET_KEY,
  
  // API endpoint
  apiEndpoint: 'https://recaptchaenterprise.googleapis.com/v1',
} as const;

export type RecaptchaAction = typeof recaptchaConfig.v3.actions[keyof typeof recaptchaConfig.v3.actions];
