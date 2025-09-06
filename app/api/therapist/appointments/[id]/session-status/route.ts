import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { verifyStripePayment } from "@/lib/stripe/verification";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const appointment = await Appointment.findById(params.id);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }
    if (appointment.therapist?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { status } = await req.json(); // status: "completed" or "in_progress"

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

    // Helper function to check if session can be completed (30 minutes past rule)
    const canCompleteSession = (sessionDate: Date): boolean => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
      return sessionDate <= thirtyMinutesAgo;
    };

    // Single session logic
    if (!appointment.recurring || appointment.recurring.length === 0) {
      if (status === "completed") {
        // Validate current session date - must be at least 30 minutes past
        const currentDate = new Date(appointment.date);
        if (!canCompleteSession(currentDate)) {
          return NextResponse.json({ 
            error: "Sessions can only be completed 30 minutes after their scheduled time" 
          }, { status: 400 });
        }

        // Verify payment before allowing session completion
        const isPaymentVerified = await verifyPayment(appointment);
        if (!isPaymentVerified) {
          console.log('Payment verification failed, cannot complete session');
          return NextResponse.json({ 
            error: "Cannot complete session - payment verification failed. Please ensure the appointment is paid before completing sessions." 
          }, { status: 402 });
        }

        appointment.status = status;
        appointment.completedSessions = 1;
      } else {
        appointment.status = status;
        appointment.completedSessions = 0;
      }
      await appointment.save();
      return NextResponse.json({ message: "Session status updated", appointment });
    }

    // Multi-session logic
    if (status === "completed") {
      // Validate current session date - must be at least 30 minutes past
      const currentDate = new Date(appointment.date);
      if (!canCompleteSession(currentDate)) {
        return NextResponse.json({ 
          error: "Sessions can only be completed 30 minutes after their scheduled time" 
        }, { status: 400 });
      }

      // Verify payment before allowing session completion
      const isPaymentVerified = await verifyPayment(appointment);
      if (!isPaymentVerified) {
        console.log('Payment verification failed, cannot complete session');
        return NextResponse.json({ 
          error: "Cannot complete session - payment verification failed. Please ensure the appointment is paid before completing sessions." 
        }, { status: 402 });
      }

      // Check if this is the last session to complete
      const allSessions = [
        { date: appointment.date, status: appointment.status === 'completed' ? 'completed' : 'in_progress' },
        ...(appointment.recurring || []).map((s: any) => {
          if (typeof s === 'string') {
            return { date: new Date(s), status: 'in_progress' };
          } else {
            return { date: new Date(s.date), status: s.status };
          }
        })
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      const completedSessionsCount = allSessions.filter(s => s.status === 'completed').length;
      const isLastSession = completedSessionsCount === appointment.totalSessions - 1;

      if (isLastSession) {
        // Completing final session
        appointment.status = "completed";
        appointment.completedSessions = appointment.totalSessions;
      } else {
        // Move current appointment date to recurring as completed
        const completedSession = {
          date: appointment.date.toISOString(),
          status: "completed",
          payment: "unpaid"
        };

        // Add current session to recurring
        const updatedRecurring = [
          ...(appointment.recurring || []),
          completedSession
        ];

        // Find the next incomplete session
        const nextSession = allSessions.find(s => 
          s.status !== 'completed' && s.date > currentDate
        );

        if (!nextSession) {
          return NextResponse.json(
            { error: "No valid next session found" },
            { status: 400 }
          );
        }

        // Remove the next session from recurring (it will become current)
        appointment.recurring = updatedRecurring.filter(s => {
          const sessionDate = typeof s === 'string' ? s : s.date;
          return sessionDate !== nextSession.date.toISOString();
        }) as any[];

        // Move next session to be current
        appointment.date = nextSession.date;
        appointment.status = "in_progress";
        appointment.completedSessions = (appointment.completedSessions || 0) + 1;
      }
    } else {
      // Reverting to in_progress
      if (appointment.status !== "completed") {
        return NextResponse.json(
          { error: "Current session is not completed" },
          { status: 400 }
        );
      }
      appointment.status = "in_progress";
      appointment.completedSessions = Math.max(0, (appointment.completedSessions || 0) - 1);
    }

    await appointment.save();
    return NextResponse.json({ message: "Session status updated", appointment });
  } catch (error) {
    console.error("Error updating session status:", error);
    return NextResponse.json({ error: "Error updating session status" }, { status: 500 });
  }
}
