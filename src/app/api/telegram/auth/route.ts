/**
 * Telegram Firebase Auth Endpoint
 * Generates custom Firebase tokens for Telegram users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdmin } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

// Ensure admin initialized via shared helper
getFirebaseAdmin();

/**
 * POST /api/telegram/auth
 * Generate custom Firebase token for Telegram user
 */
export async function POST(request: NextRequest) {
  try {
    const { telegramId } = await request.json();
    
    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      );
    }
    
    // Create custom UID from Telegram ID
    const uid = `telegram_${telegramId}`;
    
    // Generate custom token
    const auth = getAuth();
    const customToken = await auth.createCustomToken(uid, {
      telegramId: telegramId.toString(),
      provider: 'telegram',
    });
    
    return NextResponse.json({
      token: customToken,
      uid,
    });
    
  } catch (error) {
    console.error('Error generating custom token:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
