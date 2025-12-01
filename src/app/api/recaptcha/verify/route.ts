/**
 * API Route: POST /api/recaptcha/verify
 * 
 * Verifies a reCAPTCHA token and returns assessment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAssessment } from '@/lib/recaptcha/assessmentClient';
import { recaptchaConfig } from '@/config/recaptcha';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action, expectedAction } = body;

    if (!token || !action) {
      return NextResponse.json(
        { error: 'Missing token or action' },
        { status: 400 }
      );
    }

    // Get user info for enhanced detection
    const userAgent = request.headers.get('user-agent') || undefined;
    const userIpAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;

    // Create assessment
    const assessment = await createAssessment({
      token,
      action,
      expectedAction: expectedAction || action,
      userAgent,
      userIpAddress,
    });

    // Return assessment details
    return NextResponse.json({
      success: assessment.success,
      score: assessment.score,
      action: assessment.action,
      reasons: assessment.reasons,
      // Include assessment name for future annotation
      assessmentName: assessment.tokenProperties?.hostname 
        ? `projects/${recaptchaConfig.projectId}/assessments/${Date.now()}`
        : undefined,
    });
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed', success: false, score: 0 },
      { status: 500 }
    );
  }
}
