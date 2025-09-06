import { NextResponse } from 'next/server';
import User from '@/lib/db/models/User';
import bcrypt from 'bcryptjs';
import { triggerSendEmailSigningCode } from '@/lib/services/email-triggers';
import connectDB from '@/lib/db/connect';

async function sendVerificationCode(email: string) {
  try {
    connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    // Generate a random code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit code

    // Hash the code before saving it
    const hashedCode = await bcrypt.hash(code, 12);

    // Set an expiration time for the code (e.g., 10 minutes from now)
    // const expiresAt = new Date();
    // expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Save the hashed code and expiration time to the user's record
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await User.findByIdAndUpdate(user._id, {
      emailVerificationCode: hashedCode,
      emailVerificationCodeExpires: expirationTime,
      emailVerificationAttempts: 0, // Reset attempts
    });

    // Call triggerSigningCode to handle sending the email
     await triggerSendEmailSigningCode(email, code);

     return { success: true };

  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return { success: false, error: error?.message || 'Failed to send verification code' };
  }
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await sendVerificationCode(email);

    if (result.success) {
      return NextResponse.json(
        { message: 'Verification code sent to your email' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in sending verification code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
