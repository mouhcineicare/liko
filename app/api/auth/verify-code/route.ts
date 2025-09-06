import { NextResponse } from 'next/server';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db/connect';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, code } = await req.json();
    
    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if code is expired
    if (user.emailVerificationCodeExpires < new Date()) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 400 }
      );
    }

    // Check if code matches
    const isValid = await bcrypt.compare(code, user.emailVerificationCode);
    if (!isValid) {
      // Increment failed attempts
      await User.findByIdAndUpdate(user._id, {
        $inc: { emailVerificationAttempts: 1 }
      });
      
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
    });

  } catch (error) {
    console.error('Code verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}