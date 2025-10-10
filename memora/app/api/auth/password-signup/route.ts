/**
 * Password-based Signup API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { signupWithPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const result = await signupWithPassword(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error: any) {
    console.error('[PasswordSignup] Error:', error);
    return NextResponse.json(
      { error: 'Signup failed', details: error.message },
      { status: 500 }
    );
  }
}
