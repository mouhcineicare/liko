import { NextResponse } from "next/server";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Set up OAuth2 client
const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

export async function POST(req: Request) {
  try {
    const { appointmentId, newStart, newEnd, therapistRefreshToken, therapistCalendarId } = await req.json();

    if (!therapistRefreshToken || !therapistCalendarId || !appointmentId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Set credentials using the therapist's refresh token
    oauth2Client.setCredentials({
      refresh_token: therapistRefreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Fetch the existing event to preserve its title and other details
    const existingEvent = await calendar.events.get({
      calendarId: therapistCalendarId,
      eventId: appointmentId,
    });

    // Extract the necessary fields from the existing event
    const { summary, description, attendees, reminders, conferenceData } = existingEvent.data;

    // Update the event with the new start and end times, while preserving other details
    const updatedEvent = await calendar.events.update({
      calendarId: therapistCalendarId,
      eventId: appointmentId,
      requestBody: {
        summary, // Preserve the title
        description, // Preserve the description
        attendees, // Preserve the attendees
        reminders, // Preserve the reminders
        conferenceData, // Preserve the conference data (e.g., Google Meet link)
        start: { dateTime: newStart, timeZone: "UTC" }, // Update start time
        end: { dateTime: newEnd, timeZone: "UTC" }, // Update end time
      },
    });

    return NextResponse.json({ success: true, event: updatedEvent.data });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}