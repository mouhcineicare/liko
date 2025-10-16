import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { updateAppointmentStatus } from "@/lib/services/appointments/legacy-wrapper";
import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";
import { StatusValidator } from "@/lib/middleware/statusValidation";
import { StatusService } from "@/lib/services/status/StatusService";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status, paymentStatus, declineComment } = await req.json();
    const appointmentId = params.id;

    await connectDB();
    
    // Get appointment for validation
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "fullName email")
      .populate("therapist", "fullName email googleRefreshToken");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Handle payment status updates separately (not a status transition)
    if (paymentStatus) {
      appointment.paymentStatus = paymentStatus;
      await appointment.save();
    }

    // Handle status transitions using new system
    if (status) {
      // Map legacy statuses to new ones
      let newStatus = status;
      if (status === 'rejected') {
        newStatus = APPOINTMENT_STATUSES.CANCELLED;
      } else if (status === 'approved') {
        newStatus = APPOINTMENT_STATUSES.CONFIRMED;
      }

      // Validate status transition
      const validationErrors = StatusValidator.validateTransition(appointment, newStatus);
      if (validationErrors.length > 0) {
        return NextResponse.json({ 
          error: 'Invalid status transition', 
          details: validationErrors.map(e => e.message).join(', '),
          validationErrors
        }, { status: 400 });
      }

      // Determine actor (default to admin for this route)
      const actor = { id: 'system', role: 'admin' as const };

      // Use new transition system
      const updatedAppointment = await updateAppointmentStatus(
        appointmentId,
        newStatus,
        actor,
        { 
          reason: status === 'rejected' ? `Rejected: ${declineComment || 'No reason provided'}` : `Status updated to ${status}`,
          meta: { 
            originalStatus: status,
            declineComment,
            paymentStatus,
            route: 'admin-status-update'
          }
        }
      );

      // Handle special business logic for completed appointments
      if (status === 'completed' && updatedAppointment.therapist) {
        updatedAppointment.isConfirmed = true;
        const therapist = await User.findById(updatedAppointment.therapist._id);
        if (therapist) {
          therapist.completedSessions += 1;
          await therapist.save();
        }
        await updatedAppointment.save();
      }

      // Handle rejection logic
      if (status === 'rejected' && declineComment && updatedAppointment.therapist) {
        updatedAppointment.declineComment = declineComment;
        const oldTherapist = updatedAppointment.oldTherapies?.length || 0;
        updatedAppointment.oldTherapies = (updatedAppointment.oldTherapies && oldTherapist > 0) 
          ? [...updatedAppointment.oldTherapies, updatedAppointment.therapist._id.toString()]
          : [updatedAppointment.therapist._id.toString()];
        updatedAppointment.therapist = null;
        await updatedAppointment.save();
      }

      return NextResponse.json(updatedAppointment);
    }

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