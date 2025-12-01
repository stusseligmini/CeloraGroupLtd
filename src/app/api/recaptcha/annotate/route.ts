/**
 * API Route: POST /api/recaptcha/annotate
 * 
 * Annotates a previous assessment with outcome
 * Call this after determining if an event was legitimate or fraudulent
 */

import { NextRequest, NextResponse } from 'next/server';
import { annotateAssessment } from '@/lib/recaptcha/assessmentClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      assessmentName, 
      annotation, 
      reasons,
      hashedAccountId,
      transactionEvent,
    } = body;

    if (!assessmentName || !annotation) {
      return NextResponse.json(
        { error: 'Missing assessmentName or annotation' },
        { status: 400 }
      );
    }

    // Valid annotation values
    const validAnnotations = [
      'LEGITIMATE',
      'FRAUDULENT', 
      'PASSWORD_CORRECT',
      'PASSWORD_INCORRECT',
    ];

    if (!validAnnotations.includes(annotation)) {
      return NextResponse.json(
        { error: 'Invalid annotation value' },
        { status: 400 }
      );
    }

    await annotateAssessment({
      assessmentName,
      annotation,
      reasons,
      hashedAccountId,
      transactionEvent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('reCAPTCHA annotation error:', error);
    return NextResponse.json(
      { error: 'Annotation failed' },
      { status: 500 }
    );
  }
}
