import { NextResponse } from 'next/server';
// Placeholder Telegram linking endpoint
export async function POST() {
  // In real implementation validate Telegram login hash & user id
  return NextResponse.json({ linked: true });
}