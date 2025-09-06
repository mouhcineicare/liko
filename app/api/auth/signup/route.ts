import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, telephone, role } = await req.json();

    if (!email || !password || !fullName || !telephone || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    const newEmail = email.toLowerCase();
    // Check if user already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return NextResponse.json(
        { message: "Please use different email" },
        { status: 400 }
      );
    }

    // Create new user
    const user = new User({
      email,
      password,
      fullName,
      telephone,
      role,
      status: 'in_review'
    });

    await user.save();

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 }
    );
  }
}