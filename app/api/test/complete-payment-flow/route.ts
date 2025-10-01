import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { verifyAppointmentPayment } from '@/lib/services/payment-verification';

export async function GET() {
  try {
    await connectDB();
    
    // Test with the patient who has unpaid appointments
    const testPatientId = '68c03527059c516f228e173d'; // hi@gmail.com
    
    // Find appointments for this patient (same query as patient dashboard)
    const appointments = await Appointment.find({
      patient: testPatientId,
    })
    .sort({ createdAt: -1 })
    .populate({
      path: 'therapist',
      select: 'fullName image telephone specialties summary experience'
    });
    
    // Test payment verification for each appointment (same as API)
    const processedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const paymentVerification = await verifyAppointmentPayment(appointment);
        
        // Calculate UI logic results (same as UI components)
        const isUnpaid = !((paymentVerification.isStripeVerified === true) || (paymentVerification.isBalance === true));
        const shouldShowPayButton = isUnpaid && appointment.status !== 'cancelled' && appointment.status !== 'completed';
        
        return {
          _id: appointment._id,
          date: appointment.date,
          status: appointment.status,
          price: appointment.price,
          plan: appointment.plan,
          therapist: appointment.therapist?.fullName || 'No therapist',
          // API response fields
          paymentStatus: paymentVerification.paymentStatus,
          isStripeVerified: paymentVerification.isStripeVerified,
          isPaid: paymentVerification.isPaid,
          isBalance: paymentVerification.isBalance,
          verificationSource: paymentVerification.verificationSource,
          // UI logic results
          isUnpaid: isUnpaid,
          shouldShowPayButton: shouldShowPayButton,
          // Debug info
          debug: {
            originalIsStripeVerified: appointment.isStripeVerified,
            originalIsBalance: appointment.isBalance,
            originalPaymentStatus: appointment.paymentStatus,
            hasCheckoutSession: !!appointment.checkoutSessionId,
            hasPaymentIntent: !!appointment.paymentIntentId,
            paidAt: appointment.paidAt
          }
        };
      })
    );
    
    // Group by payment status (same as UI components)
    const paidAppointments = processedAppointments.filter(apt => 
      (apt.isStripeVerified === true) || (apt.isBalance === true)
    );
    const unpaidAppointments = processedAppointments.filter(apt => 
      !((apt.isStripeVerified === true) || (apt.isBalance === true))
    );
    
    return NextResponse.json({
      message: `Complete payment flow test for patient ${testPatientId} (hi@gmail.com)`,
      totalAppointments: appointments.length,
      paidCount: paidAppointments.length,
      unpaidCount: unpaidAppointments.length,
      paidAppointments: paidAppointments,
      unpaidAppointments: unpaidAppointments,
      allAppointments: processedAppointments,
      summary: {
        apiFields: {
          isPaid: 'boolean - from payment verification',
          isStripeVerified: 'boolean - from payment verification', 
          isBalance: 'boolean - from payment verification',
          verificationSource: 'string - stripe|balance|webhook|none'
        },
        uiLogic: {
          isUnpaid: '!((appointment.isStripeVerified === true) || (appointment.isBalance === true))',
          shouldShowPayButton: 'isUnpaid && !expired && !cancelled && !completed'
        },
        expectedBehavior: {
          unpaidAppointments: 'Should show "Payment Required" badge and "Pay Now" button',
          paidAppointments: 'Should show payment information and no "Pay Now" button'
        }
      }
    });
    
  } catch (error) {
    console.error('Complete payment flow test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
