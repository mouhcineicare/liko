import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import TherapistPayment from '@/lib/db/models/TherapistPayment';
import User from '@/lib/db/models/User';
import { verifyStripePayment } from '@/lib/stripe/verification';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== VALIDATION ENDPOINT CALLED ===');
    console.log('Appointment ID:', params.id);
    
    // Get therapist session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Therapist session found:', session.user.id);

    // Connect to database
    await connectDB();

    const appointmentId = params.id;
    const { status } = await request.json();

    // Find the appointment and verify it belongs to this therapist
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      therapist: session.user.id
    }).populate('patient', 'fullName email').populate('therapist', 'fullName level');

    if (!appointment) {
      console.log('Appointment not found for ID:', appointmentId);
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }
    
    console.log('Appointment found:', {
      id: appointment._id,
      status: appointment.status,
      therapistValidated: appointment.therapistValidated,
      isBalance: appointment.isBalance
    });

    // Check if already validated - return success with redirect info
    if (appointment.therapistValidated === true) {
      return NextResponse.json({ 
        success: true,
        message: 'Appointment was already validated',
        alreadyValidated: true,
        redirectTo: 'completed' // Tell frontend to redirect to completed section
      });
    }

    // Check if already marked as no-show - return success with redirect info
    if (appointment.status === 'no-show') {
      return NextResponse.json({ 
        success: true,
        message: 'Appointment was already marked as no-show',
        alreadyNoShow: true,
        redirectTo: 'cancelled' // Tell frontend to redirect to cancelled section
      });
    }

    // Validate the status change - Only allow validation of completed appointments
    if (status === 'completed') {
      // Check if appointment is already validated by therapist
      if (appointment.therapistPaid === true) {
        return NextResponse.json({ 
          error: 'Appointment has already been validated and paid' 
        }, { status: 400 });
      }
      
      // Only allow validation of completed appointments (from cron job)
      if (appointment.status !== 'completed') {
        return NextResponse.json({ 
          error: 'Only completed appointments can be validated' 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid status for validation' 
      }, { status: 400 });
    }

    // Debug appointment details
    console.log('Appointment details for validation:', {
      id: appointment._id,
      isBalance: appointment.isBalance,
      checkoutSessionId: appointment.checkoutSessionId,
      paymentIntentId: appointment.paymentIntentId,
      status: appointment.status
    });

    // Verify payment with Stripe OR balance before processing
    let isPaymentVerified = false;
    
    if (appointment.isBalance) {
      // Balance appointments are always verified
      console.log('Balance appointment - payment verified automatically');
      isPaymentVerified = true;
    } else {
      // Check Stripe payments
      console.log('Stripe appointment - verifying payment...');
      const paymentVerification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
      isPaymentVerified = paymentVerification.paymentStatus === 'paid';
      console.log('Stripe verification result:', { isPaymentVerified, paymentStatus: paymentVerification.paymentStatus });
    }
    
    if (!isPaymentVerified) {
      console.log('Payment verification failed - rejecting validation');
      return NextResponse.json({ 
        error: 'Payment not verified. Cannot validate session.' 
      }, { status: 400 });
    }

    // Create audit trail entry for bank-like security
    const auditEntry = {
      fromStatus: appointment.status,
      toStatus: 'completed',
      reason: 'Session completed and validated by therapist - Ready for payment processing',
      timestamp: new Date(),
      performedBy: session.user.id,
      performedByRole: 'therapist' as const
    };

    // Update the appointment to mark as therapist-validated (ready for admin processing)
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { 
        status: 'completed', // Keep status as completed
        paymentStatus: 'completed', // Ensure paymentStatus is set for upcoming payments
        therapistValidated: true, // Add flag to indicate therapist validation
        therapistValidatedAt: new Date(),
        // Bank-like audit trail
        validationReason: 'Session completed and validated by therapist - Ready for payment processing',
        paymentStatusReason: 'Validated session - Awaiting admin payment processing',
        lastStatusChangeReason: 'Session validated by therapist',
        lastStatusChangedBy: session.user.id,
        lastStatusChangedAt: new Date(),
        $push: { statusTransitionHistory: auditEntry },
        updatedAt: new Date()
      },
      { new: true }
    );

    // Debug logging
    console.log('Validation successful for appointment:', {
      appointmentId,
      therapistValidated: updatedAppointment?.therapistValidated,
      paymentStatus: updatedAppointment?.paymentStatus,
      status: updatedAppointment?.status,
      isBalance: updatedAppointment?.isBalance,
      validationReason: updatedAppointment?.validationReason,
      lastStatusChangedBy: updatedAppointment?.lastStatusChangedBy
    });

    // Additional verification - fetch the appointment again to confirm it was saved
    const verificationAppointment = await Appointment.findById(appointmentId);
    console.log('Verification - appointment after validation:', {
      id: verificationAppointment?._id,
      therapistValidated: verificationAppointment?.therapistValidated,
      status: verificationAppointment?.status,
      paymentStatus: verificationAppointment?.paymentStatus
    });

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      message: 'Session validated successfully. Now available for payment processing.'
    });

  } catch (error) {
    console.error('Error validating appointment:', error);
    return NextResponse.json({ error: 'Failed to validate appointment' }, { status: 500 });
  }
}
