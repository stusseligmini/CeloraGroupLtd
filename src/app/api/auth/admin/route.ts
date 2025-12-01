/**
 * Admin-only test endpoint.
 */
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { requireRole } from '@/lib/auth/roles';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const nextReq = (request as any);
  const { user, error } = await requireAuth(nextReq);
  if (error || !user) {
    return NextResponse.json({ error: 'unauthorized', detail: error }, { status: 401 });
  }
  try {
    requireRole(user as any, 'admin');
  } catch (e: any) {
    return NextResponse.json({ error: 'forbidden', detail: e.message }, { status: e.status || 403 });
  }
  return NextResponse.json({ ok: true, message: 'Admin access granted', uid: user.uid });
}
