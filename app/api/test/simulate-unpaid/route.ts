import { NextResponse } from 'next/server';
import { verifyAppointmentPayment } from '@/lib/services/payment-verification';

export async function GET() {
  try {
    // Simulate different appointment scenarios
    const testAppointments = [
      // Scenario 1: Unpaid appointment (no Stripe verification, no balance)
      {
        _id: 'test-unpaid-1',
        date: '2025-09-15T10:00:00.000Z',
        status: 'pending',
        price: 110,
        plan: 'Test Plan',
        isStripeVerified: false,
        isBalance: false,
        paymentStatus: 'pending',
        checkoutSessionId: null,
        paymentIntentId: null,
        paidAt: null
      },
      // Scenario 2: Unpaid appointment with checkout session (but not verified)
      {
        _id: 'test-unpaid-2',
        date: '2025-09-16T10:00:00.000Z',
        status: 'pending',
        price: 110,
        plan: 'Test Plan',
        isStripeVerified: false,
        isBalance: false,
        paymentStatus: 'pending',
        checkoutSessionId: 'cs_test_123',
        paymentIntentId: null,
        paidAt: null
      },
      // Scenario 3: Paid with Stripe (webhook verified)
      {
        _id: 'test-paid-stripe',
        date: '2025-09-17T10:00:00.000Z',
        status: 'confirmed',
        price: 110,
        plan: 'Test Plan',
        isStripeVerified: true,
        isBalance: false,
        paymentStatus: 'completed',
        checkoutSessionId: 'cs_test_456',
        paymentIntentId: null,
        paidAt: '2025-09-09T10:00:00.000Z'
      },
      // Scenario 4: Paid with balance
      {
        _id: 'test-paid-balance',
        date: '2025-09-18T10:00:00.000Z',
        status: 'confirmed',
        price: 110,
        plan: 'Test Plan',
        isStripeVerified: false,
        isBalance: true,
        paymentStatus: 'completed',
        checkoutSessionId: null,
        paymentIntentId: null,
        paidAt: '2025-09-09T10:00:00.000Z'
      }
    ];
    
    // Test payment verification for each scenario
    const verifiedAppointments = await Promise.all(
      testAppointments.map(async (appointment) => {
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
      message: 'Simulated payment verification test completed',
      totalAppointments: testAppointments.length,
      paidCount: paidAppointments.length,
      unpaidCount: unpaidAppointments.length,
      paidAppointments: paidAppointments,
      unpaidAppointments: unpaidAppointments,
      allAppointments: verifiedAppointments
    });
    
  } catch (error) {
    console.error('Simulated payment verification test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
