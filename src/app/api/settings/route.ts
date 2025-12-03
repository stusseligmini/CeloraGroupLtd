/**
 * User Settings API
 * GET: Fetch user settings
 * POST: Update user settings
 * 
 * Integrates with:
 * - Firestore (real-time sync for extension/telegram)
 * - PostgreSQL (persistent storage)
 * - Firebase Auth (user identification)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { errorResponse, successResponse, ValidationError, validationErrorResponse } from '@/lib/validation/validate';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { updateUserSettings, getUserSettings } from '@/lib/firebase/firestore';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

/**
 * GET /api/settings
 * Fetch current user settings
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User authentication required', 401, undefined, requestId);
    }

    // Try to fetch from Firestore first (for real-time sync)
    let settings = await getUserSettings(userId);

    // If not in Firestore, create defaults
    if (!settings) {
      const defaultSettings = {
        defaultCurrency: 'USD',
        language: 'en',
        notifications: {
          telegram: true,
          push: true,
        },
      };
      
      // Store in Firestore
      await updateUserSettings(userId, defaultSettings);
      settings = { userId, ...defaultSettings, updatedAt: new Date() } as any;
    }

    logger.info('Fetched user settings', { userId, requestId });
    return successResponse({ settings }, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error fetching settings', error instanceof Error ? error : undefined, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch settings',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/settings
 * Update user settings
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User authentication required', 401, undefined, requestId);
    }

    const body = await request.json();
    
    // Validate update payload
    const allowedFields = ['defaultCurrency', 'language', 'notifications'];
    const updates: any = {};
    
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('VALIDATION_ERROR', 'No valid fields to update', 400, undefined, requestId);
    }

    // Update in Firestore
    await updateUserSettings(userId, updates);

    // Also update in PostgreSQL if needed for audit/backup
    try {
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (existingUser) {
        // Store preferred currency in user profile if needed
        // Can extend user schema to include preferences
      }
    } catch (dbError) {
      logger.warn('Could not update PostgreSQL user settings', { userId, requestId });
      // Continue anyway - Firestore is the primary store
    }

    logger.info('Updated user settings', { userId, fields: Object.keys(updates), requestId });
    
    const updatedSettings = await getUserSettings(userId);
    return successResponse({ settings: updatedSettings }, 200, requestId);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid JSON in request body', 400, undefined, requestId);
    }
    
    logger.error('Error updating settings', error instanceof Error ? error : undefined, { requestId });
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to update settings',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
  } finally {
    await prisma.$disconnect();
  }
}
