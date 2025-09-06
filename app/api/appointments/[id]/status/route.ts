import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { handleAppointmentStatusChange } from "@/lib/services/google";
import { triggerAppointmentApprovalEmail, triggerAppointmentStatusEmail } from "@/lib/services/email-triggers";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status, paymentStatus, declineComment } = await req.json();
    const appointmentId = params.id;

    await connectDB();
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "fullName email")
      .populate("therapist", "fullName email googleRefreshToken");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Update status
    if (status) {
      
      // If status is completed, increment therapist's completed sessions
      if (status === 'completed' && appointment.therapist) {
        appointment.isConfirmed = true;
        const therapist = await User.findById(appointment.therapist._id);
        if (therapist) {
          therapist.completedSessions += 1;
          await therapist.save();
        }
      }

      // If status is rejected, store decline comment
      if (status === 'rejected' && declineComment && appointment.therapist) {
        appointment.declineComment = declineComment;
        const oldTherapeist = appointment.oldTherapies?.length || 0;
        appointment.oldTherapies = (appointment.oldTherapies && oldTherapeist > 0 )? [...appointment.oldTherapies, appointment.therapist._id.toString()]: [appointment.therapist._id.toString()]
        appointment.therapist = null;
      }

      // Handle calendar sync and meeting link
      await handleAppointmentStatusChange(appointment, status);
    }

    // Update payment status if provided
    if (paymentStatus) {
      appointment.paymentStatus = paymentStatus;
    }

    appointment.status = status;

    await appointment.save();

    await triggerAppointmentStatusEmail(appointment, status);

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Error updating appointment status" },
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