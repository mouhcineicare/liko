import { NextResponse } from "next/server";
import User from "@/lib/db/models/User";
import connectDB from "@/lib/db/connect";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { email } = await request.json();

    const user = await User.findOne({ email }).select('status role');

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: user.status,
      role: user.role
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}