/**
 * Send Passcode API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendPasscode } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email and type are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['login', 'signup', 'reset'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be login, signup, or reset' },
        { status: 400 }
      );
    }

    const result = await sendPasscode(email, type);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send passcode' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Passcode sent to your email',
    });
  } catch (error: any) {
    console.error('[SendCode] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send passcode', details: error.message },
      { status: 500 }
    );
  }
}
