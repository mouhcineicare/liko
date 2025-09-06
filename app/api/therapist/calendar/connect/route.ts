import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { getTokens } from "@/lib/services/google";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await getTokens(code);
    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "Failed to get refresh token" },
        { status: 400 }
      );
    }

    // Use the access token to fetch the calendar ID
    const oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const calendarResponse = await calendar.calendarList.get({
      calendarId: "primary",
    });

    const calendarId = calendarResponse.data.id; // Primary calendar ID

    // Save refresh token and calendar ID to user
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.googleRefreshToken = tokens.refresh_token;
    user.googleCalendarId = calendarId; // Save the calendar ID
    // isCalendarConnected will be automatically set to true by the pre-save middleware
    await user.save();

    return NextResponse.json({
      message: "Calendar connected successfully",
      isCalendarConnected: true,
      calendarId, // Return the calendar ID to the frontend
    });
  } catch (error) {
    console.error("Calendar connection error:", error);
    return NextResponse.json(
      { error: "Error connecting calendar" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}