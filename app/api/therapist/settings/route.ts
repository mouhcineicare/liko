import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { saveBase64ImageTherapy } from "@/lib/utils/image";

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user data
    // if (data.calendarIcaUrl !== undefined) {
    //   user.calendarIcaUrl = data.calendarIcaUrl;
    // }
    if (data.fullName) {
      user.fullName = data.fullName;
    }
    if (data.telephone) {
      user.telephone = data.telephone;
    }
    if (data.image) {
      user.image = await saveBase64ImageTherapy(data.image, user._id.toString());
    }
    // Remove clamping and enforcement for weeklyPatientsLimit, allow any number
    // Only update and return the value, do not use it for any restriction
    if (data.weeklyPatientsLimit !== undefined) {
      user.weeklyPatientsLimit = data.weeklyPatientsLimit;
    }

    await user.save();

    return NextResponse.json({ 
      message: "Settings updated successfully",
      weeklyPatientsLimit: user.weeklyPatientsLimit
    });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Error updating settings" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate remaining sessions
    const totalCompletedSessions = user.completedSessions || 0;
    const remainingWeeklySessions = user.weeklyPatientsLimit - totalCompletedSessions;

    return NextResponse.json({
      weeklyPatientsLimit: user.weeklyPatientsLimit,
      remainingWeeklySessions,
      totalCompletedSessions: user.completedSessions
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Error fetching settings" },
      { status: 500 }
    );
  }
}