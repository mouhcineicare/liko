import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { verifyAppointmentPayment } from '@/lib/services/payment-verification';

export async function GET() {
  try {
    await connectDB();
    
    // Get a few sample appointments
    const appointments = await Appointment.find({})
      .limit(10)
      .populate('therapist', 'fullName')
      .sort({ createdAt: -1 });
    
    if (appointments.length === 0) {
      return NextResponse.json({ 
        message: 'No appointments found',
        appointments: []
      });
    }
    
    // Test payment verification for each appointment
    const verifiedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const paymentVerification = await verifyAppointmentPayment(appointment);
        
        // Calculate UI logic results
        const isUnpaid = !((appointment.isStripeVerified === true) || (appointment.isBalance === true));
        const shouldShowPayButton = isUnpaid && appointment.status !== 'cancelled' && appointment.status !== 'completed';
        
        return {
          _id: appointment._id,
          date: appointment.date,
          status: appointment.status,
          price: appointment.price,
          plan: appointment.plan,
          therapist: appointment.therapist?.fullName || 'No therapist',
          // Original fields from database
          originalIsStripeVerified: appointment.isStripeVerified,
          originalIsBalance: appointment.isBalance,
          originalPaymentStatus: appointment.paymentStatus,
          checkoutSessionId: appointment.checkoutSessionId,
          paymentIntentId: appointment.paymentIntentId,
          paidAt: appointment.paidAt,
          // Verification results
          verification: paymentVerification,
          // UI logic results (using only Stripe verification and isBalance)
          isUnpaid: isUnpaid,
          shouldShowPayButton: shouldShowPayButton,
          // Debug info
          debug: {
            stripeVerified: appointment.isStripeVerified === true,
            balancePayment: appointment.isBalance === true,
            hasCheckoutSession: !!appointment.checkoutSessionId,
            hasPaymentIntent: !!appointment.paymentIntentId,
            verificationSource: paymentVerification.verificationSource
          }
        };
      })
    );
    
    // Group by payment status
    const paidAppointments = verifiedAppointments.filter(apt => !apt.isUnpaid);
    const unpaidAppointments = verifiedAppointments.filter(apt => apt.isUnpaid);
    
    return NextResponse.json({
      message: 'Payment verification test completed',
      totalAppointments: appointments.length,
      paidCount: paidAppointments.length,
      unpaidCount: unpaidAppointments.length,
      paidAppointments: paidAppointments,
      unpaidAppointments: unpaidAppointments,
      allAppointments: verifiedAppointments
    });
    
  } catch (error) {
    console.error('Payment verification test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}