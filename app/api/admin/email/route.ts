import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail, currentPassword } = await req.json();

    if (!newEmail || !currentPassword) {
      return NextResponse.json(
        { error: "Email and current password are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid current password" },
        { status: 401 }
      );
    }

    // Validate new email format
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);
    if (!isValidEmail) {
      return NextResponse.json(
        { error: "Email is not valid" },
        { status: 400 }
      );
    }

    user.email = newEmail;
    await user.save();

    return NextResponse.json({ message: "Email updated successfully" });
  } catch (error) {
    console.error("Email update error:", error);
    return NextResponse.json(
      { error: "Error updating email" },
      { status: 500 }
    );
  }
}
