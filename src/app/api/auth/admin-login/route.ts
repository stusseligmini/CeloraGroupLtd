import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-config';

// Use service role to bypass all rate limits
const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // First, check if user exists in our database directly (bypassing auth)
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('public_email', email.toLowerCase())
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Use admin client to sign in directly (bypasses rate limits since it's service role)
    const { data: adminSignIn, error: adminSignInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password
    });

    if (adminSignInError || !adminSignIn.session) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.public_email,
        full_name: userRecord.full_name,
        wallet_type: userRecord.wallet_type,
        created_at: userRecord.created_at
      },
      session: {
        access_token: adminSignIn.session.access_token,
        refresh_token: adminSignIn.session.refresh_token,
        expires_at: adminSignIn.session.expires_at
      }
    });
  } catch (err) {
    // Log error without exposing details to client
    return NextResponse.json({ error: 'Server error during login' }, { status: 500 });
  }
}
