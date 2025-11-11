/**
 * Advanced Card Controls API
 * BETTER than Revolut: MCC filtering, location controls, disposable cards, cashback
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ApiResponseHelper, HttpStatusCode } from '@/types/api';
import { logError } from '@/lib/logger';
import { z } from 'zod';

const prisma = new PrismaClient();

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Validation schemas
const UpdateControlsSchema = z.object({
  allowedMCC: z.array(z.string()).optional(),
  blockedMCC: z.array(z.string()).optional(),
  allowedCountries: z.array(z.string().length(2)).optional(),
  blockedCountries: z.array(z.string().length(2)).optional(),
  cashbackRate: z.number().min(0).max(0.2).optional(), // Max 20%
  isOnline: z.boolean().optional(),
  isContactless: z.boolean().optional(),
  isATM: z.boolean().optional(),
});

/**
 * PATCH /api/cards/[id]/controls - Update advanced card controls
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const validation = UpdateControlsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseHelper.error('Invalid request body', 'VALIDATION_ERROR', validation.error.flatten()),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    // Verify card ownership
    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Update controls
    const updatedCard = await prisma.card.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json(
      ApiResponseHelper.success({
        controls: {
          allowedMCC: updatedCard.allowedMCC,
          blockedMCC: updatedCard.blockedMCC,
          allowedCountries: updatedCard.allowedCountries,
          blockedCountries: updatedCard.blockedCountries,
          cashbackRate: updatedCard.cashbackRate ? Number(updatedCard.cashbackRate) : 0.02,
          isOnline: updatedCard.isOnline,
          isContactless: updatedCard.isContactless,
          isATM: updatedCard.isATM,
        },
      }, 'Card controls updated'),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to update card controls', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * GET /api/cards/[id]/controls - Get current card controls
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const card = await prisma.card.findFirst({
      where: { id, userId },
      select: {
        allowedMCC: true,
        blockedMCC: true,
        allowedCountries: true,
        blockedCountries: true,
        cashbackRate: true,
        isOnline: true,
        isContactless: true,
        isATM: true,
        isDisposable: true,
        autoFreezeRules: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    return NextResponse.json(
      ApiResponseHelper.success({
        controls: {
          allowedMCC: card.allowedMCC,
          blockedMCC: card.blockedMCC,
          allowedCountries: card.allowedCountries,
          blockedCountries: card.blockedCountries,
          cashbackRate: card.cashbackRate ? Number(card.cashbackRate) : 0.02,
          isOnline: card.isOnline,
          isContactless: card.isContactless,
          isATM: card.isATM,
          isDisposable: card.isDisposable,
          autoFreezeRules: card.autoFreezeRules,
        },
      }),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to get card controls', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * POST /api/cards/[id]/controls/block-mcc - Quick block merchant category
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        ApiResponseHelper.error('Unauthorized', 'UNAUTHORIZED'),
        { status: HttpStatusCode.UNAUTHORIZED }
      );
    }

    const body = await request.json();
    const { mccCodes, action } = body; // action: 'block' | 'allow'

    if (!Array.isArray(mccCodes) || mccCodes.length === 0) {
      return NextResponse.json(
        ApiResponseHelper.error('mccCodes must be a non-empty array', 'VALIDATION_ERROR'),
        { status: HttpStatusCode.BAD_REQUEST }
      );
    }

    const card = await prisma.card.findFirst({
      where: { id, userId },
    });

    if (!card) {
      return NextResponse.json(
        ApiResponseHelper.error('Card not found', 'NOT_FOUND'),
        { status: HttpStatusCode.NOT_FOUND }
      );
    }

    // Update MCC lists
    const updateData: any = {};
    
    if (action === 'block') {
      const newBlockedMCC = [...new Set([...card.blockedMCC, ...mccCodes])];
      updateData.blockedMCC = newBlockedMCC;
    } else if (action === 'allow') {
      const newAllowedMCC = [...new Set([...card.allowedMCC, ...mccCodes])];
      updateData.allowedMCC = newAllowedMCC;
    }

    const updatedCard = await prisma.card.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      ApiResponseHelper.success({
        blockedMCC: updatedCard.blockedMCC,
        allowedMCC: updatedCard.allowedMCC,
      }, `MCC codes ${action}ed successfully`),
      { status: HttpStatusCode.OK }
    );

  } catch (error) {
    logError('Failed to update MCC controls', error);
    return NextResponse.json(
      ApiResponseHelper.error('Internal server error', 'INTERNAL_ERROR'),
      { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
