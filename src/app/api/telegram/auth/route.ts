/**
 * Telegram Firebase Auth Endpoint
 * Generates custom Firebase tokens for Telegram users
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

// Initialize Firebase Admin (only once)
if (getApps().length === 0) {
  const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH || './firebase-admin-key.json';
  const absolutePath = path.resolve(process.cwd(), keyPath);
  
  if (fs.existsSync(absolutePath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Fallback: use project ID only (limited functionality)
    console.warn('Firebase Admin key not found, using project ID only');
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'celora-7b552',
    });
  }
}

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
