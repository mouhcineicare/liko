import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { verifyStripePayment } from '@/lib/stripe/verification';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get therapist session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Get therapist ID
    const therapistId = session.user.id;

    // Get all appointments for this therapist with enhanced data
    const appointments = await Appointment.find({ 
      therapist: therapistId,
      status: { $in: ['confirmed', 'completed', 'no-show', 'rescheduled', 'cancelled'] }
    })
    .populate('patient', 'fullName email telephone image timeZone')
    .populate('therapist', 'fullName email image')
    .sort({ date: 1 })
    .lean();

    // Debug logging
    console.log('Enhanced endpoint - fetched appointments:', {
      totalAppointments: appointments.length,
      validatedAppointments: appointments.filter(apt => apt.therapistValidated).length,
      sampleValidated: appointments.find(apt => apt.therapistValidated),
      allValidatedIds: appointments.filter(apt => apt.therapistValidated).map(apt => apt._id)
    });

    // Process appointments with payment verification and enhanced data
    const enhancedAppointments = await Promise.all(
      appointments.map(async (apt: any) => {
        try {
          // Verify payment status - check both Stripe and balance payments
          let verification;
          let isPaymentVerified = false;
          let paymentStatus = 'none';
          let subscriptionStatus = 'none';
          
          if (apt.isBalance) {
            // Balance appointments are always verified
            isPaymentVerified = true;
            paymentStatus = 'paid_by_balance';
            subscriptionStatus = 'none';
          } else {
            // Check Stripe payments
            verification = await verifyStripePayment(apt.checkoutSessionId, apt.paymentIntentId);
            isPaymentVerified = verification.paymentStatus === 'paid';
            paymentStatus = verification.paymentStatus;
            subscriptionStatus = verification.subscriptionStatus;
          }
          
          // Calculate session details
          const totalSessions = apt.totalSessions || 1;
          const completedSessions = apt.completedSessions || 0;
          const sessionPrice = apt.price / totalSessions;
          const payoutAmount = sessionPrice * 0.5; // Always 50% payout
          
          // Determine custom status based on date and current status
          const appointmentDate = new Date(apt.date);
          const now = new Date();
          let customStatus = apt.status;
          
          if (apt.status === 'confirmed' || apt.status === 'rescheduled') {
            if (appointmentDate > now) {
              customStatus = apt.status;
            } else {
              customStatus = 'past';
            }
          }
          
          return {
            _id: apt._id,
            date: apt.date,
            status: apt.status,
            customStatus: customStatus,
            paymentStatus: apt.paymentStatus,
            isStripeVerified: isPaymentVerified,
            stripePaymentStatus: paymentStatus,
            stripeSubscriptionStatus: subscriptionStatus,
            meetingLink: apt.meetingLink,
            therapyType: apt.therapyType,
            price: apt.price,
            plan: apt.plan,
            planType: apt.planType,
            totalSessions: totalSessions,
            completedSessions: completedSessions,
            sessionPrice: payoutAmount, // Use 50% payout instead of full session price
            comment: apt.comment,
            declineComment: apt.declineComment,
            reason: apt.reason,
            recurring: apt.recurring || [],
            sessionsHistory: apt.sessionsHistory || [],
            patientTimezone: apt.patientTimezone || 'Asia/Dubai',
            therapistPaid: apt.therapistPaid || false,
            payoutStatus: apt.payoutStatus || 'unpaid',
            payoutAttempts: apt.payoutAttempts || 0,
            isAccepted: apt.isAccepted,
            isConfirmed: apt.isConfirmed,
            isPaid: apt.isPaid || false,
            isBalance: apt.isBalance,
            isRescheduled: apt.isRescheduled || false,
            therapistValidated: apt.therapistValidated || false,
            therapistValidatedAt: apt.therapistValidatedAt,
            createdAt: apt.createdAt,
            updatedAt: apt.updatedAt,
            patient: {
              _id: apt.patient._id,
              fullName: apt.patient.fullName,
              email: apt.patient.email,
              telephone: apt.patient.telephone,
              image: apt.patient.image,
              timeZone: apt.patient.timeZone || 'Asia/Dubai'
            },
            therapist: {
              _id: apt.therapist._id,
              fullName: apt.therapist.fullName,
              email: apt.therapist.email,
              image: apt.therapist.image
            }
          };
        } catch (error) {
          console.error(`Error processing appointment ${apt._id}:`, error);
          // Return appointment with basic data on error
          // For balance appointments, still mark as verified even if there's an error
          const isBalanceVerified = apt.isBalance;
          return {
            _id: apt._id,
            date: apt.date,
            status: apt.status,
            customStatus: 'error',
            paymentStatus: 'error',
            isStripeVerified: isBalanceVerified,
            stripePaymentStatus: isBalanceVerified ? 'paid_by_balance' : 'error',
            stripeSubscriptionStatus: 'error',
            meetingLink: apt.meetingLink,
            therapyType: apt.therapyType,
            price: apt.price,
            plan: apt.plan,
            planType: apt.planType,
            totalSessions: apt.totalSessions || 1,
            completedSessions: apt.completedSessions || 0,
            sessionPrice: (apt.price / (apt.totalSessions || 1)) * 0.5, // 50% payout
            comment: apt.comment,
            declineComment: apt.declineComment,
            reason: apt.reason,
            recurring: apt.recurring || [],
            sessionsHistory: apt.sessionsHistory || [],
            patientTimezone: apt.patientTimezone || 'Asia/Dubai',
            therapistPaid: apt.therapistPaid || false,
            payoutStatus: apt.payoutStatus || 'unpaid',
            payoutAttempts: apt.payoutAttempts || 0,
            isAccepted: apt.isAccepted,
            isConfirmed: apt.isConfirmed,
            isPaid: apt.isPaid || false,
            isBalance: apt.isBalance,
            isRescheduled: apt.isRescheduled || false,
            therapistValidated: apt.therapistValidated || false,
            therapistValidatedAt: apt.therapistValidatedAt,
            createdAt: apt.createdAt,
            updatedAt: apt.updatedAt,
            patient: {
              _id: apt.patient._id,
              fullName: apt.patient.fullName,
              email: apt.patient.email,
              telephone: apt.patient.telephone,
              image: apt.patient.image,
              timeZone: apt.patient.timeZone || 'Asia/Dubai'
            },
            therapist: {
              _id: apt.therapist._id,
              fullName: apt.therapist.fullName,
              email: apt.therapist.email,
              image: apt.therapist.image
            },
            error: 'Payment verification failed'
          };
        }
      })
    );

    // Filter out appointments with errors and categorize
    const validAppointments = enhancedAppointments.filter(apt => apt.customStatus !== 'error');
    const now = new Date();
    
    const categorizedAppointments = {
      upcoming: validAppointments.filter(apt => {
        const appointmentDate = new Date(apt.date);
        return (apt.status === 'confirmed' || apt.status === 'rescheduled') && appointmentDate > now;
      }),
      pendingValidation: validAppointments.filter(apt => {
        if (apt.status !== 'completed') return false;
        
        // Exclude appointments that are already paid (from previous validation system)
        if (apt.therapistPaid) return false;
        
        // Show only appointments that haven't been validated by therapist yet
        if (apt.therapistValidated) {
          console.log('Filtering out validated appointment:', {
            appointmentId: apt._id,
            therapistValidated: apt.therapistValidated,
            status: apt.status,
            isBalance: apt.isBalance
          });
          return false;
        }
        
        // For unpaid appointments, only show if they're in the future
        if (!apt.isStripeVerified) {
          const appointmentDate = new Date(apt.date);
          const now = new Date();
          return appointmentDate > now;
        }
        
        // Show all paid appointments (ready for validation)
        return true;
      }),
      completed: validAppointments.filter(apt => 
        (apt.status === 'completed' && apt.therapistValidated && !apt.therapistPaid) || apt.therapistPaid === true
      ),
      canceled: validAppointments.filter(apt => apt.status === 'cancelled' || apt.status === 'no-show')
    };

    return NextResponse.json({
      appointments: enhancedAppointments, // Return ALL appointments including validated ones
      categorized: categorizedAppointments,
      total: enhancedAppointments.length
    });

  } catch (error) {
    console.error('Error fetching enhanced appointment data:', error);
    return NextResponse.json({ error: 'Failed to fetch appointment data' }, { status: 500 });
  }
}
