import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { parseISO, isAfter } from "date-fns";
import { syncAppointmentWithCalendar } from "@/lib/services/google";
import { verifyStripePayment } from "@/lib/stripe/verification";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { completedSessions, localTimeZone } = await req.json();
    if (typeof completedSessions !== "number") {
      return NextResponse.json(
        { error: "Invalid completed sessions count" },
        { status: 400 }
      );
    }

    await connectDB();
    const appointment = await Appointment.findById(params.id);

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify the therapist has access to this appointment
    if (appointment?.therapist?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Helper function to verify payment
    const verifyPayment = async (appointment: any): Promise<boolean> => {
      // Balance appointments are always verified
      if (appointment.isBalance) {
        console.log('Appointment is balance-based, payment verified');
        return true;
      }

      // Check Stripe payments using both checkout session and payment intent IDs
      console.log('Verifying Stripe payment with checkoutSessionId:', appointment.checkoutSessionId, 'and paymentIntentId:', appointment.paymentIntentId);
      const verification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
      
      const isPaymentVerified = verification.paymentStatus === 'paid';
      
      console.log('Payment verification result:', {
        paymentStatus: verification.paymentStatus,
        subscriptionStatus: verification.subscriptionStatus,
        isActive: verification.isActive,
        isPaymentVerified
      });
      
      return isPaymentVerified;
    };

    // Calculate total sessions based on plan type
    let totalSessions = 1; // Default to 1
    switch (appointment.planType) {
      case "x2_sessions":
        totalSessions = 2;
        break;
      case "x3_sessions":
        totalSessions = 3;
        break;
      case "x4_sessions":
        totalSessions = 4;
        break;
      case "x5_sessions":
        totalSessions = 5;
        break;
      case "x6_sessions":
        totalSessions = 6;
        break;
      case "x7_sessions":
        totalSessions = 7;
        break;
      case "x8_sessions":
        totalSessions = 8;
        break;
      case "x9_sessions":
        totalSessions = 9;
        break;
      case "x10_sessions":
        totalSessions = 10;
        break;
      case "x12_sessions":
        totalSessions = 12;
        break;
    }

    // Validate completed sessions count
    if (completedSessions > totalSessions) {
      return NextResponse.json(
        { error: "Completed sessions cannot exceed total sessions" },
        { status: 400 }
      );
    }

    // Check if we're increasing completed sessions (completing new sessions)
    const previousCompletedSessions = appointment.completedSessions || 0;
    if (completedSessions > previousCompletedSessions) {
      // Verify payment before allowing session completion
      const isPaymentVerified = await verifyPayment(appointment);
      if (!isPaymentVerified) {
        console.log('Payment verification failed, cannot complete session');
        return NextResponse.json({ 
          error: "Cannot complete session - payment verification failed. Please ensure the appointment is paid before completing sessions." 
        }, { status: 402 });
      }
    }

    // Update completed sessions
    appointment.completedSessions = completedSessions;

    // If all sessions are completed, mark the appointment as completed
    if (completedSessions >= totalSessions) {
      appointment.status = "completed";

      // Update therapist's completed sessions count
      const therapist = await User.findById(session.user.id);
      if (therapist) {
        therapist.completedSessions = (therapist.completedSessions || 0) + 1;
        await therapist.save();
      }
    }

    // Update the appointment date if a session is completed or reduced
    if (appointment.recurring && appointment.recurring.length > 0) {
      const currentDate = parseISO(appointment.date.toISOString());

      // Find the next closest date in the recurring array
      let nextDate: Date | null = null;
      for (const item of appointment.recurring) {
        const dateStr = typeof item === 'string' ? item : item.date;
        const date = parseISO(dateStr);
        if (isAfter(date, currentDate)) {
          if (!nextDate || isAfter(nextDate, date)) {
            nextDate = date;
          }
        }
      }

      // Update the appointment date if a next date is found
      if (nextDate) {
        appointment.date = nextDate;
      }
    }

    appointment.patientTimezone = localTimeZone,

    await appointment.save();

    const therapy = await User.findById(session.user.id)

    if(therapy){
      await syncAppointmentWithCalendar(appointment, therapy, localTimeZone)
    }

    return NextResponse.json({
      message: "Sessions updated successfully",
      appointment: {
        ...appointment.toObject(),
        totalSessions,
        completedSessions: appointment.completedSessions || 0,
      },
    });
  } catch (error) {
    console.error("Error updating sessions:", error);
    return NextResponse.json(
      {
        error:
          "Cannot mark as completed without meeting link or before appointment date",
      },
      { status: 500 }
    );
  }
}