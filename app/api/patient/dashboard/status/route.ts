import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { authOptions } from '@/lib/auth/config';
import Appointment from '@/lib/db/models/Appointment';
import { verifyStripePayment } from '@/lib/stripe/verification';

export async function GET() {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Find ALL active appointments/packages for this patient
    const activeAppointments = await Appointment.find({ 
      patient: userId,
      status: { $nin: ['cancelled', 'completed'] } // Exclude completed/cancelled
    })
    .sort({ createdAt: -1 }) // Sort by creation date (newest first)
    .populate({
      path: 'therapist',
      select: 'fullName image telephone specialties summary experience'
    });
    
    if (!activeAppointments || activeAppointments.length === 0) {
      return NextResponse.json({ 
        status: 'no_appointments',
        appointments: [],
        message: 'No active appointments found'
      });
    }

    // Process each appointment to get payment verification and status
    const processedAppointments = await Promise.all(
      activeAppointments.map(async (appointment) => {
        try {
          // Check if payment was already verified by webhook
          const isWebhookVerified = appointment.isStripeVerified === true && appointment.paymentStatus === 'completed';
          
          let verification;
          let finalPaymentStatus;
          let finalIsStripeVerified;
          
          if (isWebhookVerified) {
            // Payment was already verified by webhook, respect that decision
            console.log(`Appointment ${appointment._id} already verified by webhook, using webhook status`);
            finalPaymentStatus = appointment.paymentStatus;
            finalIsStripeVerified = appointment.isStripeVerified;
            verification = {
              paymentStatus: appointment.paymentStatus,
              subscriptionStatus: 'active',
              isActive: true
            };
          } else {
            // Payment not verified by webhook, verify with Stripe
            console.log(`Appointment ${appointment._id} not verified by webhook, verifying with Stripe`);
            verification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
            finalPaymentStatus = verification.paymentStatus === 'paid' ? 'completed' : verification.paymentStatus;
            finalIsStripeVerified = verification.paymentStatus === 'paid';
          }
          
          // Map the appointment status to custom statuses
          let customStatus = '';
          
          if (appointment.status === 'cancelled') {
            customStatus = 'cancelled';
          } 
          else if (appointment.status === 'completed') {
            customStatus = 'completed';
          }
          else if (!appointment.therapist) {
            customStatus = 'pending_match';
          }
          else if (appointment.therapist && appointment.isAccepted === false) {
            customStatus = 'matched_pending_therapist_acceptance';
          }
          else if (appointment.status === 'confirmed') {
            customStatus = 'confirmed';
          }
          else if (appointment.status === 'pending_scheduling') {
            customStatus = 'pending_scheduling';
          }
          else if (appointment.status === 'rescheduled') {
            customStatus = 'confirmed';
          }
          else {
            customStatus = appointment.status;
          }
          
          // Prepare therapist data if exists
          const therapistData = appointment.therapist ? {
            id: appointment.therapist._id,
            name: appointment.therapist.fullName,
            image: appointment.therapist.image,
            phone: appointment.therapist.telephone,
            specialties: appointment.therapist.specialties || [],
            summary: appointment.therapist.summary,
            experience: appointment.therapist.experience
          } : null;
          
          return {
            _id: appointment._id,
            id: appointment._id,
            date: appointment.date,
            therapist: therapistData,
            status: appointment.status,
            customStatus: customStatus,
            isAccepted: appointment.isAccepted,
            isConfirmed: appointment.isConfirmed,
            paymentStatus: finalPaymentStatus,
            isStripeVerified: finalIsStripeVerified,
            isSubscriptionActive: verification.paymentStatus === 'paid',
            meetingLink: appointment.meetingLink,
            therapyType: appointment.therapyType,
            price: appointment.price,
            plan: appointment.plan,
            comment: appointment.comment,
            declineComment: appointment.declineComment,
            reason: appointment.reason,
            subscriptionStatus: verification.subscriptionStatus,
            isBalance: appointment.isBalance,
            recurring: appointment.recurring,
            createdAt: appointment.createdAt,
            paidAt: appointment.paidAt,
            paymentHistory: appointment.paymentHistory
          };
        } catch (error) {
          console.error(`Error processing appointment ${appointment._id}:`, error);
          // Return appointment with error status
          return {
            _id: appointment._id,
            id: appointment._id,
            date: appointment.date,
            therapist: null,
            status: appointment.status,
            customStatus: 'error',
            isAccepted: appointment.isAccepted,
            isConfirmed: appointment.isConfirmed,
            paymentStatus: 'error',
            isStripeVerified: false,
            isSubscriptionActive: false,
            meetingLink: appointment.meetingLink,
            therapyType: appointment.therapyType,
            price: appointment.price,
            plan: appointment.plan,
            comment: appointment.comment,
            declineComment: appointment.declineComment,
            reason: appointment.reason,
            subscriptionStatus: 'error',
            isBalance: appointment.isBalance,
            recurring: appointment.recurring,
            createdAt: appointment.createdAt,
            paidAt: appointment.paidAt,
            paymentHistory: appointment.paymentHistory,
            error: 'Failed to verify payment'
          };
        }
      })
    );

    // Filter out appointments with errors and sort by date (closest upcoming first)
    const validAppointments = processedAppointments
      .filter(apt => apt.customStatus !== 'error')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get the closest upcoming appointment for the main status
    const closestUpcoming = validAppointments.find(apt => 
      new Date(apt.date) > new Date() && apt.customStatus !== 'cancelled'
    );

    const responseData = {
      status: closestUpcoming ? closestUpcoming.customStatus : 'no_upcoming',
      appointments: validAppointments,
      closestUpcoming: closestUpcoming,
      message: closestUpcoming ? `Active packages: ${validAppointments.length}` : 'No upcoming appointments'
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error fetching appointment status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}