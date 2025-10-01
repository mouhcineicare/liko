import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { updateAppointmentStatus } from "@/lib/services/appointments/legacy-wrapper";
import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { paymentStatus } = await request.json();
    
    if (!["pending", "completed", "refunded","failed"].includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Get appointment for validation
    const appointment = await Appointment.findById(params.id);
    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Update payment status
    appointment.paymentStatus = paymentStatus;
    
    // Handle status transitions based on payment status
    if (paymentStatus === "pending" || paymentStatus === "failed") {
      // Payment failed or pending - set to unpaid
      const actor = { id: 'system', role: 'admin' as const };
      
      const updatedAppointment = await updateAppointmentStatus(
        params.id,
        APPOINTMENT_STATUSES.UNPAID,
        actor,
        { 
          reason: `Payment ${paymentStatus} - setting status to unpaid`,
          meta: { 
            paymentStatus,
            originalStatus: appointment.status
          }
        }
      );

      return NextResponse.json(updatedAppointment);
    } else if (paymentStatus === "completed") {
      // Payment completed - check if this is a rescheduled appointment
      appointment.isStripeVerified = true;
      
      const actor = { id: 'system', role: 'admin' as const };
      
      // For rescheduled appointments, keep them as RESCHEDULED or CONFIRMED
      // Only new appointments should go to PENDING_MATCH
      let targetStatus = APPOINTMENT_STATUSES.PENDING_MATCH;
      
      if (appointment.isSameDayReschedule || appointment.isRescheduled) {
        // This is a rescheduled appointment - keep it as RESCHEDULED or CONFIRMED
        targetStatus = APPOINTMENT_STATUSES.RESCHEDULED;
      } else if (appointment.status === APPOINTMENT_STATUSES.CONFIRMED || 
                 appointment.status === APPOINTMENT_STATUSES.RESCHEDULED) {
        // Already confirmed/rescheduled - keep current status
        targetStatus = appointment.status as any;
      }
      
      const updatedAppointment = await updateAppointmentStatus(
        params.id,
        targetStatus,
        actor,
        { 
          reason: `Payment completed - ${appointment.isSameDayReschedule ? 'reschedule payment' : 'proceeding to therapist matching'}`,
          meta: { 
            paymentStatus,
            isStripeVerified: true,
            originalStatus: appointment.status,
            isRescheduled: appointment.isSameDayReschedule || appointment.isRescheduled
          }
        }
      );

      console.log('PaymentStatus API: Updated appointment:', {
        _id: updatedAppointment._id,
        paymentStatus: updatedAppointment.paymentStatus,
        isStripeVerified: updatedAppointment.isStripeVerified,
        status: updatedAppointment.status,
        isBalance: updatedAppointment.isBalance
      });

      return NextResponse.json(updatedAppointment);
    } else {
      // Refunded - just update payment status, no status transition
      await appointment.save();
      return NextResponse.json(appointment);
    }
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}