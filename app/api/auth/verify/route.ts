import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOneAndUpdate(
      {
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() }
      },
      {
        $set: {
          status: 'active',
          emailVerified: true,
          verificationToken: undefined,
          verificationTokenExpires: undefined
        }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Email verified successfully",
      user: {
        id: user._id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Error verifying email" },
      { status: 500 }
    );
  }
}