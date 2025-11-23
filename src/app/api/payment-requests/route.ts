import { NextRequest, NextResponse } from 'next/server';
import paymentRequestService from '@/server/services/paymentRequestService';
import { logger } from '@/lib/logger';
import { getUserIdFromRequest } from '@/lib/auth/serverAuth';
import { PaymentRequestListQuerySchema, PaymentRequestsResponseSchema, CreatePaymentRequestSchema, PaymentRequestResponseSchema } from '@/lib/validation/schemas';
import { validateQuery, validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate query parameters
    const query = validateQuery(request, PaymentRequestListQuerySchema);

    const requests = await paymentRequestService.getPendingRequests(userId);
    
    // Validate response
    const validatedResponse = PaymentRequestsResponseSchema.parse({ requests });

    return successResponse(validatedResponse, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error fetching payment requests', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch payment requests', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'User ID is required', 401, undefined, requestId);
    }

    // Validate request body
    const body = await validateBody(request, CreatePaymentRequestSchema);

    const paymentRequest = await paymentRequestService.createPaymentRequest(
      userId,
      body.receiverId,
      body.amount,
      body.blockchain,
      body.memo,
      body.tokenSymbol
    );

    // Validate response
    const validatedResponse = PaymentRequestResponseSchema.parse(paymentRequest);

    return successResponse({ request: validatedResponse }, 201, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error creating payment request', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to create payment request', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}


