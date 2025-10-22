/**
 * Password-based Signup API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { signupWithPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('[PasswordSignup] Signup attempt for:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await signupWithPassword(email, password);

    console.log('[PasswordSignup] Result:', { success: result.success, error: result.error, hasUser: !!result.user });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Signup failed - unknown error' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error: any) {
    console.error('[PasswordSignup] Exception:', error);
    console.error('[PasswordSignup] Stack:', error.stack);
    return NextResponse.json(
      { error: 'Signup failed', details: error.message },
      { status: 500 }
    );
  }
}
