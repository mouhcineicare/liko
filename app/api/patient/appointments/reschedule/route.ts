import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { removeCalendarEvent, syncAppointmentWithCalendar } from "@/lib/services/google";
import { updateAppointment } from "@/lib/api/appointments";

export async function PUT(req: Request) {
  try {  
    const session = await getServerSession(authOptions);    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      appointmentId, 
      newDate, 
      sessionToBeReduced,
      localTimeZone,
      sessionIndex, // Added sessionIndex
      isSameDayReschedule, // Flag to indicate same-day reschedule with surcharge
      surchargeAmount // Amount of surcharge to be paid
    } = await req.json();

    if (!appointmentId || !newDate) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the appointment with all required fields
    const appointment = await Appointment.findById(appointmentId)
      .populate("therapist", "googleRefreshToken")
      .populate("patient", "timeZone _id")
      .select('+plan +planType +price +therapyType'); // Include these fields

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

    // Prepare data for creating new appointment
    const appointmentData = {
       patient: appointment.patient._id.toString(),
       therapist: appointment.therapist?._id?.toString(),
       date: new Date(newDate), // This will parse the UTC ISO string correctly
       plan: appointment.plan,
       planType: appointment.planType,
       price: isSameDayReschedule ? (appointment.price + (surchargeAmount || 0)) : appointment.price,
       therapyType: appointment.therapyType,
       status: isSameDayReschedule ? "matched_pending_therapist_acceptance" : "rescheduled",
       paymentStatus: isSameDayReschedule ? "pending" : "completed",
       isStripeVerified: isSameDayReschedule ? false : true, // Same-day reschedule needs payment verification
       isConfirmed: isSameDayReschedule ? false : true,
       hasPreferedDate: false,
       localTimeZone: localTimeZone || appointment.patient?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
       totalSessions: sessionToBeReduced ? Math.max(1, appointment.totalSessions - 1) : appointment.totalSessions,
       recurring: appointment.recurring || [],
       isSameDayReschedule: isSameDayReschedule || false,
       surchargeAmount: surchargeAmount || 0
   };

    // If rescheduling a specific session (not the main appointment), update ONLY that session
    if (sessionIndex !== undefined && sessionIndex > 0 && appointment.recurring && Array.isArray(appointment.recurring)) {
      const recurringIndex = sessionIndex - 1; // Convert to 0-based index
      if (recurringIndex >= 0 && recurringIndex < appointment.recurring.length) {
        // Update ONLY the specific recurring session date, keep main appointment unchanged
        appointmentData.recurring = [...appointment.recurring];
        appointmentData.recurring[recurringIndex] = {
          ...appointmentData.recurring[recurringIndex],
          date: new Date(newDate)
        };
        // Keep the main appointment date unchanged
        appointmentData.date = appointment.date;
      }
    }

    // Create new appointment record
    const newAppointment = await updateAppointment(appointmentId, appointmentData);

    // If the therapist has Google Calendar connected, update the calendar event
    if ((appointment.therapist as any)?.googleRefreshToken) {
      try {
        await syncAppointmentWithCalendar(newAppointment, appointment.therapist);
        await removeCalendarEvent(appointment, appointment.therapist);
      } catch (error) {
        console.error("Error syncing with Google Calendar:", error);
        // Don't fail the request if calendar sync fails
      }
    }

    return NextResponse.json({
      message: "Appointment rescheduled successfully",
      appointment: newAppointment,
    });
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    return NextResponse.json(
      { error: "Error rescheduling appointment" },
      { status: 500 }
    );
  }
}