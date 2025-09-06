import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { verifyStripePayment } from "@/lib/stripe/verification";
// import { processCompletedSessionPayment } from "@/lib/services/paymentService";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('--- STARTING SESSION COMPLETION PROCESS ---');
  
  // Authentication check
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "therapist") {
    console.log('Unauthorized access attempt');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request data
  const { appointmentId, status } = await req.json();
  const sessionIndex = parseInt(params.id);
  
  console.log(`Processing session ${sessionIndex} for appointment ${appointmentId} with status ${status}`);

  // Validate session index
  if (isNaN(sessionIndex) || sessionIndex < 0) {
    console.log('Invalid session index:', params.id);
    return NextResponse.json({ error: "Invalid session index" }, { status: 400 });
  }

  // Validate status
  if (status !== "completed" && status !== "in_progress") {
    console.log('Invalid status:', status);
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await connectDB();

  try {
    // Find and validate appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.log('Appointment not found:', appointmentId);
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    console.log('Current appointment state:', {
      date: appointment.date,
      status: appointment.status,
      completedSessions: appointment.completedSessions,
      totalSessions: appointment.totalSessions,
      recurringCount: appointment.recurring?.length || 0,
      isPaid: appointment.isPaid,
      therapistPaid: appointment.therapistPaid,
      payoutStatus: appointment.payoutStatus
    });

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

    // Helper function to get all sessions in chronological order
    const getAllSessions = () => {
      const mainSession = {
        date: appointment.date,
        isCurrent: true,
        status: appointment.status === 'completed' ? 'completed' : 'in_progress',
        index: 0
      };
      
      const recurringSessions = (appointment.recurring || []).map((s: any, idx: number) => ({
        date: typeof s === 'string' ? new Date(s) : new Date(s.date),
        isCurrent: false,
        status: typeof s === 'string' ? 'in_progress' : s.status,
        index: idx + 1,
        originalData: s
      }));

      return [mainSession, ...recurringSessions].sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    // Handle current session (index 0)
    if (sessionIndex === 0) {
      if (status === "completed") {
        // Validate current session date - must be at least 30 minutes past
        const currentDate = new Date(appointment.date);
        if (!canCompleteSession(currentDate)) {
          console.log('Cannot complete session - too early or future session');
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
        const allSessions = getAllSessions();
        const completedSessionsCount = allSessions.filter(s => s.status === 'completed').length;
        const isLastSession = completedSessionsCount === appointment.totalSessions - 1;

        if (isLastSession) {
          console.log('Completing final session and marking appointment as complete');
          
          // Mark appointment as completed
          appointment.status = "completed";
          appointment.completedSessions = appointment.totalSessions;
          
        } else {
          console.log('Completing regular session and moving to next');
          
          // Create completed session object for current session
          const completedSession = {
            date: appointment.date.toISOString(),
            status: "completed",
            payment: "unpaid" // Default to unpaid
          };

          // Find the next incomplete session
          const allSessions = getAllSessions();
          const nextSession = allSessions.find(s => 
            s.status !== 'completed' && s.date > currentDate
          );

          if (!nextSession) {
            console.log('No valid next session found');
            return NextResponse.json(
              { error: "No valid next session found" },
              { status: 400 }
            );
          }

          console.log('Next session found:', nextSession);

          // Add current session to recurring as completed
          const updatedRecurring = [
            ...(appointment.recurring || []),
            completedSession
          ];

          // Remove the next session from recurring (it will become current)
          appointment.recurring = updatedRecurring.filter(s => {
            const sessionDate = typeof s === 'string' ? s : s.date;
            return sessionDate !== nextSession.date.toISOString();
          }) as any[];

          // Move next session to be current
          appointment.date = nextSession.date;
          appointment.status = "in_progress";
          
          // Update completed sessions count
          appointment.completedSessions = (appointment.completedSessions || 0) + 1;
        }
      } else if (status === "in_progress") {
        // Reverting current session to in_progress
        if (appointment.status !== "completed") {
          return NextResponse.json(
            { error: "Current session is not completed" },
            { status: 400 }
          );
        }
        appointment.status = "in_progress";
        appointment.completedSessions = Math.max(0, (appointment.completedSessions || 0) - 1);
      }
    } 
    // Handle recurring sessions (index > 0)
    else {
      const targetIndex = sessionIndex - 1;
      
      // Validate recurring session exists
      if (!appointment.recurring || targetIndex >= appointment.recurring.length) {
        console.log('Session not found at index:', targetIndex);
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      const session = appointment.recurring[targetIndex];
      
      // Validate session data format
      if (typeof session !== 'object') {
        console.log('Invalid session data format');
        return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
      }

      const sessionDate = new Date(session.date);
      
      if (status === "completed") {
        // Validate session date - must be at least 30 minutes past
        if (!canCompleteSession(sessionDate)) {
          console.log('Cannot complete future session');
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
        
        // Mark as completed
        session.status = "completed";
        
        // Update completed sessions count
        appointment.completedSessions = (appointment.completedSessions || 0) + 1;
        
        // Check if this was the last session
        if (appointment.completedSessions >= appointment.totalSessions) {
          appointment.status = "completed";
        }
        
      } else if (status === "in_progress") {
        // Validate session can be reverted
        if (session.status !== "completed") {
          console.log('Cannot revert incomplete session');
          return NextResponse.json({ error: "Session is not completed" }, { status: 400 });
        }
        session.status = "in_progress";
        session.payment = "unpaid";
        
        // Update completed sessions count
        appointment.completedSessions = Math.max(0, (appointment.completedSessions || 0) - 1);
        
        // If appointment was completed but now has incomplete sessions, revert status
        if (appointment.status === "completed" && appointment.completedSessions < appointment.totalSessions) {
          appointment.status = "in_progress";
        }
      }
    }

    // Save changes
    await appointment.save();

    console.log('Final appointment state saved:', {
      status: appointment.status,
      completedSessions: appointment.completedSessions,
      totalSessions: appointment.totalSessions,
      recurringCount: appointment.recurring.length,
      isPaid: appointment.isPaid,
      therapistPaid: appointment.therapistPaid,
      payoutStatus: appointment.payoutStatus,
      isPayoutRejected: appointment.isPayoutRejected,
      rejectedPayoutNote: appointment.rejectedPayoutNote
    });

    return NextResponse.json({ 
      success: true,
      appointment: {
        ...appointment.toObject(),
        date: appointment.date,
        status: appointment.status,
        recurring: appointment.recurring,
        completedSessions: appointment.completedSessions,
        totalSessions: appointment.totalSessions,
        isPaid: appointment.isPaid,
        therapistPaid: appointment.therapistPaid,
        payoutStatus: appointment.payoutStatus,
        isPayoutRejected: appointment.isPayoutRejected,
        rejectedPayoutNote: appointment.rejectedPayoutNote
      }
    });

  } catch (error: any) {
    console.error("Error updating session:", {
      error: error.message,
      stack: error.stack,
      appointmentId,
      sessionIndex,
      status
    });
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  } finally {
    console.log('--- SESSION COMPLETION PROCESS COMPLETE ---');
  }
}