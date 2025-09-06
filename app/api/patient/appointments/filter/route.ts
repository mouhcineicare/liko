import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { authOptions } from '@/lib/auth/config';
import Appointment from '@/lib/db/models/Appointment';
import { verifyStripePayment } from '@/lib/stripe/verification';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { status: requestedStatus } = await request.json();
    const userId = session.user.id;
    
    // First get counts for all statuses
    const statusCounts = {
      all: await Appointment.countDocuments({ patient: userId }),
      pending_match: await Appointment.countDocuments({ 
        patient: userId,
        $or: [
          { therapist: null },
          { therapist: { $exists: false } }
        ]
      }),
      matched_pending_therapist_acceptance: await Appointment.countDocuments({ 
        patient: userId,
        therapist: { $ne: null },
        isAccepted: false
      }),
      pending_scheduling: await Appointment.countDocuments({ 
        patient: userId,
        isAccepted: true,
        status: 'pending_scheduling'
      }),
      confirmed: await Appointment.countDocuments({
        patient: userId,
        $or: [
          { 
            isAccepted: true, 
            isConfirmed: true,
            status: { $in: ['confirmed', 'rescheduled'] }
          },
          {
            status: 'rescheduled',
            isConfirmed: true
          }
        ]
      }),
      completed: await Appointment.countDocuments({ 
        patient: userId,
        status: 'completed'
      }),
      cancelled: await Appointment.countDocuments({ 
        patient: userId,
        status: 'cancelled'
      }),
      upcoming: await Appointment.countDocuments({ 
        patient: userId,
        date: { $gte: new Date() },
        status: { $ne: 'cancelled' }
      })
    };
    
    // Base query for filtered results
    let query: any = { patient: userId };
    
    // Apply status filter
    switch (requestedStatus) {
      case 'pending_match':
        query.$or = [
          { therapist: null },
          { therapist: { $exists: false } }
        ];
        break;
      case 'matched_pending_therapist_acceptance':
        query.therapist = { $ne: null };
        query.isAccepted = false;
        break;
      case 'pending_scheduling':
        query.isAccepted = true;
        query.status = 'pending_scheduling';
        break;
      case 'confirmed':
        query.status = 'confirmed';
        break;
      case 'completed':
        query.status = 'completed';
        break;
      case 'cancelled':
        query.status = 'cancelled';
        break;
      case 'upcoming':
        query.date = { $gte: new Date() };
        query.status = { $ne: 'cancelled' };
        break;
    }
    
    const appointments = await Appointment.find(query)
      .sort({ date: 1 })
      .populate({
        path: 'therapist',
        select: 'fullName image telephone specialties summary experience'
      });
    
    // Verify payments and subscriptions
    const verifiedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const verification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
        
        let customStatus = "all"; // Start with original status

        // Apply status mapping based on the requested filter
        switch (requestedStatus) {
          case 'upcoming':
            if (appointment.date >= new Date() && appointment.status !== 'cancelled') {
              customStatus = 'upcoming';
            }
            break;
          case 'completed':
            customStatus = 'completed';
            break;
          case 'cancelled':
            customStatus = 'cancelled';
            break;
          default:
            // For other statuses, use the detailed status mapping
            if (appointment.status === 'cancelled') {
              customStatus = 'cancelled';
            } 
            else if (appointment.status === 'completed') {
              customStatus = 'completed';
            }
            else if (!appointment.therapist) {
              customStatus = 'pending_match';
            }
            else if (appointment.therapist && !appointment.isAccepted) {
              customStatus = 'matched_pending_therapist_acceptance';
            }
            else if (appointment.isAccepted && appointment.status === 'pending_scheduling') {
              customStatus = 'pending_scheduling';
            }
            else if ((appointment.isAccepted && appointment.isConfirmed) ||
                     (appointment.status === 'rescheduled' && appointment.isConfirmed)) {
              customStatus = 'confirmed';
            }
            break;
        }

        return {
          ...appointment.toObject(),
          status: customStatus,
          isStripeVerified: verification.paymentStatus === 'paid',
          isSubscriptionActive: verification.paymentStatus === 'paid',
          canReschedule: appointment.status === 'cancelled',
          paymentStatus: verification.paymentStatus,
          subscriptionStatus: verification.subscriptionStatus
        };
      })
    );
    
    return NextResponse.json({ 
      success: true,
      appointments: verifiedAppointments,
      total: verifiedAppointments.length,
      counts: statusCounts
    });
    
  } catch (error) {
    console.error('Error filtering appointments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}