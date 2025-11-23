import { NextRequest, NextResponse } from 'next/server';
import contactService from '@/server/services/contactService';
import { logger } from '@/lib/logger';
import { ResolveContactRequestSchema, ResolvedContactResponseSchema } from '@/lib/validation/schemas';
import { validateBody, ValidationError, validationErrorResponse, errorResponse, successResponse } from '@/lib/validation/validate';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    // Validate request body
    const body = await validateBody(request, ResolveContactRequestSchema);

    let resolved = null;

    if (body.type === 'username') {
      resolved = await contactService.resolveUsername(body.value);
    } else if (body.type === 'phone') {
      resolved = await contactService.resolvePhone(body.value);
    }

    if (!resolved) {
      return errorResponse('NOT_FOUND', 'Contact not found', 404, undefined, requestId);
    }

    // Validate response
    const validatedResponse = ResolvedContactResponseSchema.parse(resolved);

    return successResponse({ resolved: validatedResponse }, 200, requestId);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, requestId);
    }
    
    logger.error('Error resolving contact', error, { requestId });
    return errorResponse('INTERNAL_SERVER_ERROR', 'Failed to resolve contact', 500, process.env.NODE_ENV === 'development' ? error : undefined, requestId);
  }
}


