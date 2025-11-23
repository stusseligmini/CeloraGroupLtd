/**
 * JWT Signature Verification for Azure AD B2C Tokens
 * 
 * Validates ID tokens and access tokens using Azure B2C's public JWKs.
 * Use this for critical operations (money transfers, vault unlock, etc.)
 */

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

const AZURE_B2C_TENANT = process.env.NEXT_PUBLIC_AZURE_B2C_TENANT || 'celora';
const AZURE_B2C_DOMAIN = process.env.NEXT_PUBLIC_AZURE_B2C_AUTHORITY_DOMAIN || 'celora.b2clogin.com';
const AZURE_B2C_POLICY = process.env.NEXT_PUBLIC_AZURE_B2C_SIGNIN_POLICY || 'B2C_1_SUSI';
const CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_B2C_CLIENT_ID;

// Construct JWKS URI for Azure B2C
const JWKS_URI = `https://${AZURE_B2C_DOMAIN}/${AZURE_B2C_TENANT}.onmicrosoft.com/${AZURE_B2C_POLICY}/discovery/v2.0/keys`;

// Create remote JWK Set (cached by jose library)
const JWKS = createRemoteJWKSet(new URL(JWKS_URI));

export interface VerifiedTokenPayload extends JWTPayload {
  oid?: string;
  sub?: string;
  email?: string;
  emails?: string[];
  preferred_username?: string;
  name?: string;
  roles?: string[];
  extension_Roles?: string[];
  tfp?: string;
  auth_time?: number;
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: VerifiedTokenPayload;
  error?: string;
}

/**
 * Verify JWT token signature using Azure B2C public keys
 * 
 * @param token - JWT token string
 * @param options - Verification options
 * @returns Verification result with decoded payload
 */
export async function verifyAzureB2CToken(
  token: string,
  options?: {
    clockTolerance?: number; // seconds
    maxTokenAge?: number; // seconds
  }
): Promise<TokenVerificationResult> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${AZURE_B2C_DOMAIN}/${AZURE_B2C_TENANT}.onmicrosoft.com/${AZURE_B2C_POLICY}/v2.0/`,
      audience: CLIENT_ID,
      clockTolerance: options?.clockTolerance ?? 30, // 30 seconds tolerance
      maxTokenAge: options?.maxTokenAge ? `${options.maxTokenAge}s` : undefined,
    });

    return {
      valid: true,
      payload: payload as VerifiedTokenPayload,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
}

/**
 * Verify token from request cookie with signature validation
 * Use this for critical operations requiring strong authentication
 * 
 * @param token - Token string from cookie
 * @returns Verification result
 */
export async function verifyTokenWithSignature(
  token: string | null
): Promise<TokenVerificationResult> {
  if (!token) {
    return {
      valid: false,
      error: 'No token provided',
    };
  }

  return verifyAzureB2CToken(token);
}

/**
 * Extract user ID from verified token payload
 */
export function extractUserIdFromPayload(payload: VerifiedTokenPayload): string | null {
  return payload.oid || payload.sub || null;
}

/**
 * Extract user email from verified token payload
 */
export function extractEmailFromPayload(payload: VerifiedTokenPayload): string | null {
  return (
    payload.email ||
    payload.preferred_username ||
    (Array.isArray(payload.emails) ? payload.emails[0] : null) ||
    null
  );
}

/**
 * Extract roles from verified token payload
 */
export function extractRolesFromPayload(payload: VerifiedTokenPayload): string[] {
  return (
    (Array.isArray(payload.roles) ? payload.roles : []) ||
    (Array.isArray(payload.extension_Roles) ? payload.extension_Roles : []) ||
    []
  );
}
