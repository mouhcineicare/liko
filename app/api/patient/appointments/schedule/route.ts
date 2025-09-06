import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { handleAppointmentStatusChange } from "@/lib/services/google";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appointmentId, newDate, localTimeZone } = await req.json();

    if (!appointmentId || !newDate) {
      return NextResponse.json(
        { error: "Appointment ID and new date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate("therapist", "fullName email googleRefreshToken");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Check if the appointment belongs to the patient
    if (appointment.patient.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to modify this appointment" },
        { status: 403 }
      );
    }

    // Check if the appointment is in pending_scheduling status
    if (appointment.status !== "pending_scheduling") {
      return NextResponse.json(
        { error: "Appointment is not in pending scheduling status" },
        { status: 400 }
      );
    }

    // Update the appointment with the new date and status
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        date: new Date(newDate),
        status: "confirmed",
        isConfirmed: true,
        hasPreferedDate: false,
      },
      { new: true }
    ).populate("therapist", "fullName email googleRefreshToken");

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Failed to update appointment" },
        { status: 500 }
      );
    }

    // Sync with Google Calendar if therapist has it connected
    if (updatedAppointment.therapist?.googleRefreshToken) {
      try {
        await handleAppointmentStatusChange(updatedAppointment, "confirmed");
      } catch (error) {
        console.error("Error syncing with Google Calendar:", error);
        // Don't fail the request if calendar sync fails
      }
    }

    return NextResponse.json({
      message: "Appointment scheduled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Error scheduling appointment:", error);
    return NextResponse.json(
      { error: "Failed to schedule appointment" },
      { status: 500 }
    );
  }
}
