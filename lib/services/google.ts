import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import User from "@/lib/db/models/User";
import Appointment from "@/lib/db/models/Appointment";
import { convertTimeToTimeZone } from "../utils";
import { toZonedTime } from "date-fns-tz";

// Initialize the Google Calendar API client
const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

// Create calendar client
const calendar = google.calendar({ version: "v3", auth: oauth2Client });

/**
 * Converts a date from one timezone to another
 * @param date The date to convert
 * @param fromTimeZone Original timezone
 * @param toTimeZone Target timezone
 * @returns Date object in target timezone
 */
function convertTimeZone(date: Date, fromTimeZone: string, toTimeZone: string): Date {
  const formattedDate = date.toLocaleString('en-US', {
    timeZone: fromTimeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });
  
  return new Date(new Date(formattedDate).toLocaleString('en-US', { timeZone: toTimeZone }));
}

export async function syncAppointmentWithCalendar(
  appointment: any,
  therapist: any,
  patientTimeZone: string = "Asia/Dubai"
) {
  try {
    if (!therapist.googleRefreshToken) {
      console.log("Therapist has not connected Google Calendar");
      return false;
    }

    const patient = await User.findById(appointment.patient);
    if (!patient) return false;

    const therapistDetails = await User.findById(appointment.therapist);
    if (!therapistDetails) return false;

    const appointmentExist = await Appointment.findOne({ _id: appointment._id || appointment.id });
    if (!appointmentExist) return false;

    // Use stored timezone or default
    patientTimeZone = appointment.patientTimezone || patientTimeZone;
    const therapistTimeZone = therapistDetails.timeZone || "Asia/Dubai";

    oauth2Client.setCredentials({
      refresh_token: therapist.googleRefreshToken,
    });

    // Create dates with proper timezone handling
    const startDate = appointment.date;
    const endDate = new Date(startDate.getTime() + 60 * 50 * 1000);

    // Format dates in patient's timezone for Google Calendar
    const event = {
      summary: `Therapy Session with ${patient.fullName}`,
      description: `Online therapy session\n\nPatient: ${patient.fullName}\nPlan: ${appointment.plan}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: therapistTimeZone, // Use therapist's timezone here
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: therapistTimeZone, // Use therapist's timezone here
      },
      attendees: [
        { email: patient.email },
        { email: therapistDetails.email },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: `therapy-${appointment._id}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    let response;
    if (appointment.calendarEventId) {
      response = await calendar.events.update({
        calendarId: "primary",
        eventId: appointment.calendarEventId,
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: "all",
      });
    } else {
      response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: "all",
      });

      appointment.calendarEventId = response.data.id;
      appointment.calendarId = "primary";
    }

    if (response.data.conferenceData?.entryPoints?.[0]?.uri) {
      appointment.meetingLink = response.data.conferenceData.entryPoints[0].uri;
      await appointment.save();
    }

    return true;
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error);
    return false;
  }
}

export async function removeCalendarEvent(appointment: any, therapist: any) {
  try {
    if (!therapist.googleRefreshToken || !appointment.calendarEventId) {
      return false;
    }

    // Set credentials using therapist's refresh token
    oauth2Client.setCredentials({
      refresh_token: therapist.googleRefreshToken,
    });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: appointment.calendarEventId,
      sendUpdates: "all", // Notify attendees
    });

    // Remove the calendar event ID and meeting link
    appointment.calendarEventId = null;
    appointment.meetingLink = null;
    await appointment.save();

    return true;
  } catch (error) {
    console.error("Error removing calendar event:", error);
    return false;
  }
}

// Get Google Calendar authorization URL
export function getAuthUrl() {
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force to get refresh token
  });
}

// Exchange code for tokens
export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Sync appointment status changes
export async function handleAppointmentStatusChange(appointment: any, newStatus: string) {
  try {
    // Only sync calendar for approved appointments
    if (newStatus === "approved") {
      const therapist = await User.findById(appointment.therapist);
      if (!therapist) {
        console.log("Therapist not found");
        return;
      }

      // Sync with Google Calendar and get meeting link
      await syncAppointmentWithCalendar(appointment, therapist);

      // Update appointment status
      appointment.status = "confirmed";
      await appointment.save();
    }
    // Remove calendar event if appointment is cancelled or no-show
    else if (["cancelled", "no-show"].includes(newStatus)) {
      const therapist = await User.findById(appointment.therapist);
      if (therapist && appointment.calendarEventId) {
        appointment.isConfirmed = false;
        appointment.status = newStatus;
        await appointment.save();
        await removeCalendarEvent(appointment, therapist);
      }
    }

    appointment.status = newStatus;
    await appointment.save();
  } catch (error) {
    console.error("Error handling appointment status change:", error);
  }
}