/**
 * Auth Status Endpoint
 * Returns decoded Firebase ID token claims if authorized.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const nextReq = (request as any);
  const { user, error } = await requireAuth(nextReq);
  if (error || !user) {
    return NextResponse.json({ authorized: false, error }, { status: 401 });
  }
  // Strip potentially large custom claims
  const { uid, email, name, picture, iss, aud, auth_time, iat, exp } = user as any;
  return NextResponse.json({
    authorized: true,
    user: { uid, email: email || null, name: name || null, picture: picture || null },
    token: { iss, aud, auth_time, iat, exp },
  });
}
