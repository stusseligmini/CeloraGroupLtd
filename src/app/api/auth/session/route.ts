import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = /__session=([^;]+)/.exec(cookieHeader);
  if (!match) return NextResponse.json({ user: null });
  try {
    const decoded = await verifyIdToken(decodeURIComponent(match[1]));
    return NextResponse.json({ user: decoded });
  } catch {
    return NextResponse.json({ user: null });
  }
}