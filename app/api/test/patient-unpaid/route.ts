import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { verifyAppointmentPayment } from '@/lib/services/payment-verification';

export async function GET() {
  try {
    await connectDB();
    
    // Test with the first patient who has unpaid appointments
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
          // Original fields
          originalIsStripeVerified: appointment.isStripeVerified,
          originalIsBalance: appointment.isBalance,
          originalPaymentStatus: appointment.paymentStatus,
          checkoutSessionId: appointment.checkoutSessionId,
          paymentIntentId: appointment.paymentIntentId,
          paidAt: appointment.paidAt,
          // Verification results
          verification: paymentVerification,
          // UI logic results
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
      message: `Appointments for patient ${testPatientId} (hi@gmail.com)`,
      totalAppointments: appointments.length,
      paidCount: paidAppointments.length,
      unpaidCount: unpaidAppointments.length,
      paidAppointments: paidAppointments,
      unpaidAppointments: unpaidAppointments,
      allAppointments: verifiedAppointments
    });
    
  } catch (error) {
    console.error('Patient unpaid test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
