import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import User from "@/lib/db/models/User";
import connectDB from "@/lib/db/connect";

export const dynamic = 'force-dynamic';
// Set up OAuth2 client
const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const appointmentDate = searchParams.get('date');

    // Fetch all therapists
    const therapists = await User.find({ role: "therapist" }, "fullName image googleRefreshToken isCalendarConnected").sort({
      fullName: 1,
    });

    // If no date is provided, return the list as is
    if (!appointmentDate) {
      return NextResponse.json(therapists);
    }

    // Check availability for each therapist
    const therapistsWithAvailability = await Promise.all(therapists.map(async (therapist) => {
      if (!therapist.googleRefreshToken || !therapist.isCalendarConnected) {
        return {
          ...therapist.toObject(),
          isAvailable: false,
        };
      }

      // Set credentials using the therapist's refresh token
      oauth2Client.setCredentials({
        refresh_token: therapist.googleRefreshToken,
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Define the time range for the appointment date
      const timeMin = new Date(appointmentDate);
      timeMin.setHours(0, 0, 0, 0); // Start of the day

      const timeMax = new Date(appointmentDate);
      timeMax.setHours(23, 59, 59, 999); // End of the day

      // Fetch events from therapist's calendar within the time range
      const eventsResponse = await calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = eventsResponse.data.items || [];

      // Check if the therapist has any events on the appointment date
      const isAvailable = events.length === 0;

      return {
        ...therapist.toObject(),
        isCalendarConnected: therapist.isCalendarConnected,
        isAvailable,
      };
    }));

    return NextResponse.json(therapistsWithAvailability);
  } catch (error) {
    console.error("Error fetching therapists:", error);
    return NextResponse.json(
      { error: "Error fetching therapists" },
      { status: 500 }
    );
  }
}