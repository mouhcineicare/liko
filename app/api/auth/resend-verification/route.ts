import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { triggerAccountConfirmationEmail } from "@/lib/services/email-triggers";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.status === "active") {
      return NextResponse.json(
        { error: "Email already verified" },
        { status: 400 }
      );
    }

    // Send new verification email
    await triggerAccountConfirmationEmail(user);

    return NextResponse.json({ 
      message: "Verification email sent successfully" 
    });
  } catch (error) {
    console.error("Error resending verification:", error);
    return NextResponse.json(
      { error: "Error sending verification email" },
      { status: 500 }
    );
  }
}