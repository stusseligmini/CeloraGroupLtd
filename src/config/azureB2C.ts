const tenantName = process.env.NEXT_PUBLIC_AZURE_B2C_TENANT?.trim();
const authorityDomain = process.env.NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN?.trim();
const signInPolicy = process.env.NEXT_PUBLIC_AZURE_B2C_SIGNIN_POLICY?.trim();
const resetPolicy = process.env.NEXT_PUBLIC_AZURE_B2C_PASSWORD_RESET_POLICY?.trim();
const clientId = process.env.NEXT_PUBLIC_AZURE_B2C_CLIENT_ID?.trim();
const apiScope = process.env.NEXT_PUBLIC_AZURE_B2C_API_SCOPE?.trim();
const redirectUri = process.env.NEXT_PUBLIC_AZURE_B2C_REDIRECT_URI?.trim() || (typeof window !== 'undefined' ? window.location.origin : undefined);
const postLogoutRedirectUri = process.env.NEXT_PUBLIC_AZURE_B2C_LOGOUT_URI?.trim() || redirectUri;

if (!tenantName || !authorityDomain || !signInPolicy || !clientId || !apiScope) {
  console.warn('[Azure B2C] Missing one or more B2C environment variables. Authentication will be degraded.');
}

const baseAuthority = tenantName && authorityDomain
  ? `https://${authorityDomain}/${tenantName}.onmicrosoft.com`
  : undefined;

export const b2cPolicies = {
  names: {
    signUpSignIn: signInPolicy,
    passwordReset: resetPolicy,
  },
  authorities: {
    signUpSignIn: {
      authority: baseAuthority && signInPolicy ? `${baseAuthority}/${signInPolicy}` : undefined,
    },
    passwordReset: {
      authority: baseAuthority && resetPolicy ? `${baseAuthority}/${resetPolicy}` : undefined,
    },
  },
  authorityDomain,
};

export const msalConfig = {
  auth: {
    clientId: clientId ?? '',
    authority: b2cPolicies.authorities.signUpSignIn.authority,
    knownAuthorities: authorityDomain ? [authorityDomain] : [],
    redirectUri,
    postLogoutRedirectUri,
    // PKCE is enabled by default in MSAL.js 2.0+
    // navigateToLoginRequestUrl: false, // Set to false to prevent double redirect
  },
  cache: {
    cacheLocation: 'localStorage' as const,
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) return;
        switch (level) {
          case 0: // LogLevel.Error
            console.error('[MSAL]', message);
            break;
          case 1: // LogLevel.Warning
            console.warn('[MSAL]', message);
            break;
          case 2: // LogLevel.Info
            if (process.env.NODE_ENV === 'development') {
              console.info('[MSAL]', message);
            }
            break;
          case 3: // LogLevel.Verbose
            if (process.env.NODE_ENV === 'development') {
              console.debug('[MSAL]', message);
            }
            break;
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? 2 : 1, // Info in dev, Warning in prod
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    asyncPopups: false,
  },
};

// Request offline_access scope to get refresh tokens
const defaultScopes = apiScope ? [apiScope, 'offline_access'] : ['offline_access'];

export const loginRequest = {
  scopes: defaultScopes,
  authority: b2cPolicies.authorities.signUpSignIn.authority,
  // Enable PKCE (Proof Key for Code Exchange) - enabled by default
  // prompt: 'select_account', // Uncomment to force account selection
};

export const passwordResetRequest = resetPolicy
  ? {
      scopes: defaultScopes,
      authority: b2cPolicies.authorities.passwordReset.authority,
    }
  : null;

export const tokenRequest = {
  scopes: defaultScopes,
  authority: b2cPolicies.authorities.signUpSignIn.authority,
  forceRefresh: false, // Use cached tokens when available
};

export const azureB2CConfig = {
  tenantName,
  authorityDomain,
  clientId,
  apiScope,
  redirectUri,
  postLogoutRedirectUri,
};

