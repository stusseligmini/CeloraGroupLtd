import { NextRequest, NextResponse } from 'next/server';
import { fetchNotifications } from '@/server/services/notificationService';
import {
  NotificationListQuerySchema,
  NotificationResponseSchema,
  NotificationMarkAsReadRequestSchema,
} from '@/lib/validation/schemas';
import {
  validateQuery,
  validateBody,
  ValidationError,
  validationErrorResponse,
  errorResponse,
  successResponse,
} from '@/lib/validation/validate';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const allowedOrigins = new Set(
  [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_EXTENSION_ORIGIN]
    .filter((value): value is string => Boolean(value))
);

function resolveAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin');
  if (!origin) {
    return process.env.NEXT_PUBLIC_APP_URL ?? '*';
  }

  if (allowedOrigins.size === 0) {
    return origin;
  }

  if (allowedOrigins.has(origin)) {
    return origin;
  }

  return null;
}

function withCors(response: NextResponse, request: NextRequest): NextResponse {
  const origin = resolveAllowedOrigin(request);

  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  } else {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Headers', 'authorization, content-type');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  return response;
}

function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, request);
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Validate query parameters
    const query = validateQuery(request, NotificationListQuerySchema);

    const token = extractBearerToken(request.headers.get('authorization'));
    const notifications = await fetchNotifications(token, query);

    // In development, enrich minimal notifications to match schema
    const devUserId = '00000000-0000-0000-0000-000000000000';
    const enriched = notifications.map((n) => {
      const createdAt = n.createdAt ?? new Date().toISOString();
      const idCandidate = (() => {
        try {
          // If already a uuid, keep; else generate
          if (z.string().uuid().safeParse(n.id).success) return n.id;
        } catch {}
        return crypto.randomUUID();
      })();
      return {
        id: idCandidate,
        userId: devUserId,
        type: 'system',
        title: n.title ?? 'Account update',
        body: n.body ?? '',
        channels: ['in-app'],
        status: n.read ? 'read' : 'delivered',
        priority: 'normal',
        actionUrl: null,
        actionLabel: null,
        sentAt: createdAt,
        deliveredAt: createdAt,
        readAt: n.read ? createdAt : null,
        createdAt,
      };
    });

    // Validate response array
    const validatedNotifications = z.array(NotificationResponseSchema).parse(enriched);

    const response = successResponse(
      {
        notifications: validatedNotifications,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: notifications.length,
        },
      },
      200,
      requestId
    );

    return withCors(response, request);
  } catch (error) {
    if (error instanceof ValidationError) {
      return withCors(validationErrorResponse(error, requestId), request);
    }

    logger.error('Notifications GET error', error, { requestId });
    const response = errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to fetch notifications',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
    return withCors(response, request);
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Validate request body
    const body = await validateBody(request, NotificationMarkAsReadRequestSchema);

    // Get user ID from token
    const token = extractBearerToken(request.headers.get('authorization'));
    if (!token) {
      const response = errorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        401,
        undefined,
        requestId
      );
      return withCors(response, request);
    }

    // Get userId from JWT token
    const { getUserIdFromRequest } = await import('@/lib/auth/serverAuth');
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      const response = errorResponse(
        'UNAUTHORIZED',
        'Invalid authentication token',
        401,
        undefined,
        requestId
      );
      return withCors(response, request);
    }

    // Mark notifications as read in database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: body.notificationIds },
          userId, // Ensure users can only mark their own notifications as read
        },
        data: {
          status: 'read',
          readAt: new Date(),
        },
      });

      await prisma.$disconnect();

      const response = successResponse(
        {
          success: true,
          message: `${result.count} notification(s) marked as read`,
          count: result.count,
          timestamp: new Date().toISOString(),
        },
        200,
        requestId
      );

      return withCors(response, request);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return withCors(validationErrorResponse(error, requestId), request);
    }

    logger.error('Notifications POST error', error, { requestId });
    const response = errorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to update notifications',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined,
      requestId
    );
    return withCors(response, request);
  }
}
