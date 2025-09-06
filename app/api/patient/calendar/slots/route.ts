import { NextResponse } from "next/server";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import User from "@/lib/db/models/User";
import TherapyProfile from "@/lib/db/models/Therapy-profile";
import Appointment from "@/lib/db/models/Appointment";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { isSameDay } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import connectDB from "@/lib/db/connect";

const oauth2Client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

// Default availability (9AM-5PM) as fallback
const DEFAULT_AVAILABILITY_HOURS = Array.from({length: 24}, (_, i) => {
  const hour = (9 + i) % 24;
  return `${hour.toString().padStart(2, '0')}:00`;
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { therapistId, date, isSameDayBookingAllowed = false, today } = await req.json();

    if (!therapistId || !date) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get therapist and profile
    const [therapist, therapyProfile] = await Promise.all([
      User.findById(therapistId),
      TherapyProfile.findOne({ therapyId: therapistId })
    ]);

    if (!therapist) {
      return NextResponse.json(
        { error: "Therapist not found" },
        { status: 404 }
      );
    }

    // Get timezone (default to Dubai if not set)
    const therapistTimeZone = therapyProfile?.timeZone || 'Asia/Dubai';
    const patientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Fix: Create the date in the therapist's timezone to avoid +1 day issues
    const selectedDate = new Date(date);
    const therapistZonedDate = toZonedTime(selectedDate, therapistTimeZone);
    
    const now = new Date(today); // Convert the provided today string to Date
    const isToday = new Date(date).toDateString() === new Date(today).toDateString();

    // Get day name in therapist's timezone
    const dayName = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      timeZone: 'UTC' 
    });

    // Get therapist's availability for this day (use default if none set)
    const dayAvailability = therapyProfile?.availability?.find(
      (a: { day: string }) => a.day === dayName
    );
    
    const availableHours = dayAvailability?.hours?.length > 0 
      ? dayAvailability.hours 
      : DEFAULT_AVAILABILITY_HOURS;

    // If therapist hasn't connected Google Calendar, check only paid appointments
    if (!therapist.isCalendarConnected || !therapist.googleRefreshToken) {
      // Check for existing PAID appointments that should block slots
      const startOfDay = new Date(therapistZonedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);

      const existingPaidAppointments = await Appointment.find({
        therapist: therapistId,
        date: { $gte: startOfDay, $lt: endOfDay },
        status: { $nin: ['cancelled', 'no-show'] },
        isStripeVerified: true // Only block slots for paid appointments
      });

      // Convert paid appointments to busy events format
      const paidAppointmentEvents = existingPaidAppointments.map(apt => ({
        start: { dateTime: apt.date.toISOString() },
        end: { dateTime: new Date(apt.date.getTime() + 60 * 60 * 1000).toISOString() } // 1 hour duration
      }));

      const slots = createSlotsFromHours(availableHours, therapistZonedDate, {
        isToday,
        therapistTimeZone,
        patientTimeZone,
        isSameDayBookingAllowed,
        busyEvents: paidAppointmentEvents,
        now
      });

      return NextResponse.json({
        success: true,
        availableSlots: slots,
        timeZoneInfo: { 
          therapistTimeZone,
          patientTimeZone 
        },
        source: 'profile_only'
      });
    }

    // Therapist has Google Calendar connected - check for busy times
    try {
      oauth2Client.setCredentials({
        refresh_token: therapist.googleRefreshToken,
      });
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Calculate time range for the selected day in therapist's timezone
      const startOfDay = new Date(therapistZonedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);

      const timeMin = startOfDay.toISOString();
      const timeMax = endOfDay.toISOString();

      // Fetch events from Google Calendar
      const eventsResponse = await calendar.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        timeZone: therapistTimeZone,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = eventsResponse.data.items || [];
      const validEvents = events.filter(
        (event) => event.start?.dateTime && event.end?.dateTime
      ) as { start: { dateTime: string }; end: { dateTime: string } }[];

      // Check for existing PAID appointments that should block slots
      const existingPaidAppointments = await Appointment.find({
        therapist: therapistId,
        date: { $gte: startOfDay, $lt: endOfDay },
        status: { $nin: ['cancelled', 'no-show'] },
        isStripeVerified: true // Only block slots for paid appointments
      });

      // Convert paid appointments to busy events format
      const paidAppointmentEvents = existingPaidAppointments.map(apt => ({
        start: { dateTime: apt.date.toISOString() },
        end: { dateTime: new Date(apt.date.getTime() + 60 * 60 * 1000).toISOString() } // 1 hour duration
      }));

      // Combine Google Calendar events and paid appointment events
      const allBusyEvents = [...validEvents, ...paidAppointmentEvents];

      // Generate available slots considering both profile availability and all busy events
      const availableSlots = createSlotsFromHours(availableHours, therapistZonedDate, {
        isToday,
        therapistTimeZone,
        patientTimeZone,
        isSameDayBookingAllowed,
        busyEvents: allBusyEvents,
        now
      });

      return NextResponse.json({ 
        success: true, 
        availableSlots,
        timeZoneInfo: { 
          therapistTimeZone,
          patientTimeZone 
        },
        source: 'calendar_checked'
      });
    } catch (error) {
      console.error("Google Calendar error - falling back to profile availability:", error);
      // If Google Calendar fails, fall back to profile availability with paid appointments check
      const startOfDay = new Date(therapistZonedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);

      const existingPaidAppointments = await Appointment.find({
        therapist: therapistId,
        date: { $gte: startOfDay, $lt: endOfDay },
        status: { $nin: ['cancelled', 'no-show'] },
        isStripeVerified: true // Only block slots for paid appointments
      });

      // Convert paid appointments to busy events format
      const paidAppointmentEvents = existingPaidAppointments.map(apt => ({
        start: { dateTime: apt.date.toISOString() },
        end: { dateTime: new Date(apt.date.getTime() + 60 * 60 * 1000).toISOString() } // 1 hour duration
      }));

      const slots = createSlotsFromHours(availableHours, therapistZonedDate, {
        isToday,
        therapistTimeZone,
        patientTimeZone,
        isSameDayBookingAllowed,
        busyEvents: paidAppointmentEvents,
        now
      });

      return NextResponse.json({
        success: true,
        availableSlots: slots,
        timeZoneInfo: { 
          therapistTimeZone,
          patientTimeZone 
        },
        source: 'calendar_fallback'
      });
    }
  } catch (error) {
    console.error("Error fetching available slots:", error);
    // Ultimate fallback - return default availability
    const slots = createSlotsFromHours(DEFAULT_AVAILABILITY_HOURS, new Date(), {
      isToday: true,
      therapistTimeZone: 'Asia/Dubai',
      patientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isSameDayBookingAllowed: false,
      now: new Date(),
    });

    return NextResponse.json({
      success: true,
      availableSlots: slots,
      timeZoneInfo: { 
        therapistTimeZone: 'Asia/Dubai',
        patientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      source: 'system_fallback'
    });
  }
}

interface SlotCreationOptions {
  isToday: boolean;
  therapistTimeZone: string;
  patientTimeZone: string;
  isSameDayBookingAllowed: boolean;
  busyEvents?: { start: { dateTime: string }; end: { dateTime: string } }[];
  now: Date;
}


function createSlotsFromHours(
  hours: string[],
  date: Date,
  options: SlotCreationOptions
) {
  const {
    isToday,
    isSameDayBookingAllowed,
    busyEvents = [],
    now
  } = options;
  
  const slots = [];
  const bufferMs = isSameDayBookingAllowed ? 60 * 60 * 1000 : 8 * 60 * 60 * 1000; // 1 hour buffer for same-day booking

  for (const hour of hours) {
    const [hourNum, minuteNum] = hour.split(':').map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hourNum, minuteNum, 0, 0);
    
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

    // Skip if in past
    if (isToday && slotStart < new Date(now.getTime() + bufferMs)) {
      continue;
    }

    // Check availability
    const isAvailable = !busyEvents.some(event => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      return slotStart < eventEnd && slotEnd > eventStart;
    });

    if (isAvailable) {
      slots.push({
        start: slotStart.toISOString(), // ISO string
        end: slotEnd.toISOString(),     // ISO string
        time: hour, // Original therapist time (HH:mm)
        available: true
      });
    }
  }

  return slots;
}