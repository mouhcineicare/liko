import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { removeCalendarEvent, syncAppointmentWithCalendar } from "@/lib/services/google";

export async function PUT(req: Request) {
  try {  
    const session = await getServerSession(authOptions);    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      appointmentId, 
      sessionIndex,
      newDate, 
      localTimeZone
    } = await req.json();

    if (!appointmentId || sessionIndex === undefined || sessionIndex === null || !newDate) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate("therapist", "googleRefreshToken")
      .populate("patient", "timeZone _id");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify the patient owns this appointment
    if (appointment.patient._id.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the session index is valid
    if (!appointment.recurring || sessionIndex >= appointment.recurring.length) {
      return NextResponse.json(
        { error: "Invalid session index" },
        { status: 400 }
      );
    }

    // Get the session to reschedule
    const sessionToReschedule = appointment.recurring[sessionIndex];
    
    // Handle both string and object types for recurring sessions
    let sessionStatus = 'in_progress';
    let sessionDate = '';
    
    if (typeof sessionToReschedule === 'string') {
      sessionDate = sessionToReschedule;
    } else if (sessionToReschedule && typeof sessionToReschedule === 'object') {
      sessionStatus = sessionToReschedule.status || 'in_progress';
      sessionDate = sessionToReschedule.date || '';
    }
    
    // Check if session is already completed
    if (sessionStatus === 'completed') {
      return NextResponse.json(
        { error: "Cannot reschedule completed sessions" },
        { status: 400 }
      );
    }

    // Create a copy of the recurring sessions array
    const updatedRecurring = [...appointment.recurring];
    
    // Update the specific session with new date
    if (typeof sessionToReschedule === 'string') {
      updatedRecurring[sessionIndex] = new Date(newDate).toISOString();
    } else if (sessionToReschedule && typeof sessionToReschedule === 'object') {
      updatedRecurring[sessionIndex] = {
        ...sessionToReschedule,
        date: new Date(newDate).toISOString()
      };
    }

    // Sort the recurring sessions chronologically
    updatedRecurring.sort((a, b) => {
      const dateA = new Date(typeof a === 'string' ? a : a.date);
      const dateB = new Date(typeof b === 'string' ? b : b.date);
      return dateA.getTime() - dateB.getTime();
    });

    // Update the appointment with the new recurring sessions
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        recurring: updatedRecurring,
        localTimeZone: localTimeZone || (appointment.patient as any)?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      { new: true }
    ).populate("therapist", "googleRefreshToken")
     .populate("patient", "timeZone _id");

    // If the therapist has Google Calendar connected, update the calendar event
    if ((appointment.therapist as any)?.googleRefreshToken) {
      try {
        await syncAppointmentWithCalendar(updatedAppointment, appointment.therapist);
        // Note: We don't remove the old calendar event here since we're just updating a session
        // The calendar sync should handle updating the existing event
      } catch (error) {
        console.error("Error syncing with Google Calendar:", error);
        // Don't fail the request if calendar sync fails
      }
    }

    return NextResponse.json({
      message: "Session rescheduled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Error rescheduling session:", error);
    return NextResponse.json(
      { error: "Error rescheduling session" },
      { status: 500 }
    );
  }
}
