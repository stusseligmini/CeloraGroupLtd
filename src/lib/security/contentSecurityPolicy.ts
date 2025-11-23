/**
 * Content Security Policy (CSP) Configuration
 * 
 * Production-ready CSP with nonce support, strict directives, and reporting.
 */

import { NextResponse } from 'next/server';

export interface CspConfig {
  nonce?: string;
  reportUri?: string;
  reportOnly?: boolean;
}

/**
 * Generate cryptographically secure nonce for CSP (Edge Runtime compatible)
 */
export function generateCspNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // Convert to base64 without Buffer (Edge Runtime compatible)
  return btoa(String.fromCharCode(...array));
}

/**
 * Build CSP directives
 */
export function buildCspDirectives(config: CspConfig = {}): Record<string, string[]> {
  const { nonce } = config;
  
  // Azure B2C domains
  const azureB2CDomain = process.env.NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN || '*.b2clogin.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    'default-src': ["'self'"],
    
    // Scripts: strict with nonce
    'script-src': [
      "'self'",
      nonce ? `'nonce-${nonce}'` : "'unsafe-inline'", // Fallback to unsafe-inline if no nonce
      "'strict-dynamic'", // Allow dynamically loaded scripts from trusted sources
      // Azure Application Insights
      'https://js.monitor.azure.com',
      'https://az416426.vo.msecnd.net',
    ].filter(Boolean),
    
    // Styles: Next.js requires unsafe-inline
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js CSS-in-JS
      'https://fonts.googleapis.com',
    ],
    
    // Images: allow data URIs and https
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      // Azure CDN
      'https://*.azureedge.net',
    ],
    
    // Fonts
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    
    // Connect: API, auth, telemetry
    'connect-src': [
      "'self'",
      appUrl,
      // Azure B2C
      `https://${azureB2CDomain}`,
      'https://login.microsoftonline.com',
      // Application Insights
      'https://dc.services.visualstudio.com',
      'https://eastus-8.in.applicationinsights.azure.com',
      // Blockchain RPC endpoints (add specific domains)
      'https://*.infura.io',
      'https://*.alchemy.com',
      'wss://*.infura.io',
      'wss://*.alchemy.com',
    ],
    
    // Object/embed: block
    'object-src': ["'none'"],
    
    // Base URI: restrict
    'base-uri': ["'self'"],
    
    // Form actions: same origin only
    'form-action': ["'self'"],
    
    // Frames: allow Azure B2C
    'frame-src': [
      "'self'",
      `https://${azureB2CDomain}`,
      'https://login.microsoftonline.com',
    ],
    
    // Frame ancestors: prevent clickjacking
    'frame-ancestors': ["'none'"],
    
    // Workers: allow blobs for Service Workers
    'worker-src': ["'self'", 'blob:'],
    
    // Manifest
    'manifest-src': ["'self'"],
    
    // Media
    'media-src': ["'self'"],
    
    // Upgrade insecure requests in production
    ...(process.env.NODE_ENV === 'production' && {
      'upgrade-insecure-requests': [],
    }),
  };
}

/**
 * Build CSP header value
 */
export function buildCspHeader(config: CspConfig = {}): string {
  const directives = buildCspDirectives(config);
  
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key; // Directives without values (e.g., upgrade-insecure-requests)
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Additional security headers
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Prevent MIME sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Clickjacking protection
    'X-Frame-Options': 'DENY',
    
    // HSTS (only in production with HTTPS)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy (restrict browser features)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()', // Disable FLoC
      'payment=(self)',
      'usb=()',
    ].join(', '),
    
    // Cross-Origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  };
}

/**
 * Add CSP and security headers to response
 */
export function addCspHeaders(
  response: NextResponse,
  nonce?: string,
  reportOnly = false
): NextResponse {
  const cspValue = buildCspHeader({ nonce, reportOnly });
  const headerName = reportOnly 
    ? 'Content-Security-Policy-Report-Only' 
    : 'Content-Security-Policy';
  
  // Set CSP header
  response.headers.set(headerName, cspValue);
  
  // Set additional security headers
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  
  // Add nonce to headers for access in components
  if (nonce) {
    response.headers.set('x-nonce', nonce);
  }
  
  return response;
}

/**
 * Helper to get nonce from request headers
 */
export function getNonceFromHeaders(headers: Headers): string | null {
  return headers.get('x-nonce');
}
