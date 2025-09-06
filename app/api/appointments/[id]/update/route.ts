import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { triggerAppointmentStatusEmail } from "@/lib/services/email-triggers";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "therapist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { comment } = await req.json();
    const appointmentId = params.id;

    await connectDB();
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "fullName email")
      .populate("therapist", "fullName email");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify the therapist has access to this appointment
    if (!appointment.therapist || appointment.therapist._id.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update appointment fields
    appointment.comment = comment;
    appointment.isDateUpdated = true;
    appointment.patientApproved = -1; // Reset patient approval status
    await appointment.save();

    // Send notification emails
    await triggerAppointmentStatusEmail(appointment, "rescheduled");

    return NextResponse.json({
      message: "Appointment updated successfully",
      appointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Error updating appointment" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  });
}