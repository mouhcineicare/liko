import { verifyStripePayment } from '@/lib/stripe/verification';

export interface PaymentVerificationResult {
  isPaid: boolean;
  paymentStatus: string;
  isStripeVerified: boolean;
  isBalance: boolean;
  verificationSource: 'stripe' | 'balance' | 'webhook' | 'none';
}

/**
 * Centralized payment verification for appointments
 * Verifies Stripe payments using checkout session ID or payment intent
 * For balance payments, uses isBalance flag
 */
export async function verifyAppointmentPayment(appointment: any): Promise<PaymentVerificationResult> {
  // For balance payments, use isBalance flag
  if (appointment.isBalance === true) {
    return {
      isPaid: true,
      paymentStatus: 'completed',
      isStripeVerified: false,
      isBalance: true,
      verificationSource: 'balance'
    };
  }

  // For Stripe payments, check if already verified by webhook
  if (appointment.isStripeVerified === true) {
    return {
      isPaid: true,
      paymentStatus: 'completed',
      isStripeVerified: true,
      isBalance: false,
      verificationSource: 'webhook'
    };
  }

  // For Stripe payments not verified by webhook, verify with Stripe
  if (appointment.checkoutSessionId || appointment.paymentIntentId) {
    try {
      const verification = await verifyStripePayment(
        appointment.checkoutSessionId,
        appointment.paymentIntentId
      );

      const isPaid = verification.paymentStatus === 'paid';
      const paymentStatus = isPaid ? 'completed' : verification.paymentStatus;

      return {
        isPaid,
        paymentStatus,
        isStripeVerified: isPaid,
        isBalance: false,
        verificationSource: 'stripe'
      };
    } catch (error) {
      console.error('Error verifying Stripe payment:', error);
      return {
        isPaid: false,
        paymentStatus: 'failed',
        isStripeVerified: false,
        isBalance: false,
        verificationSource: 'none'
      };
    }
  }

  // For Stripe payments without checkout session or payment intent (not yet paid)
  if (appointment.paymentStatus === 'pending' && !appointment.isBalance) {
    return {
      isPaid: false,
      paymentStatus: 'pending',
      isStripeVerified: false,
      isBalance: false,
      verificationSource: 'none'
    };
  }

  // No payment information available
  return {
    isPaid: false,
    paymentStatus: 'unpaid',
    isStripeVerified: false,
    isBalance: false,
    verificationSource: 'none'
  };
}

/**
 * Batch verify multiple appointments
 */
export async function verifyMultipleAppointments(appointments: any[]): Promise<PaymentVerificationResult[]> {
  return Promise.all(
    appointments.map(appointment => verifyAppointmentPayment(appointment))
  );
}

/**
 * Check if an appointment is paid (either Stripe verified or balance payment)
 */
export function isAppointmentPaid(verification: PaymentVerificationResult): boolean {
  return verification.isPaid;
}

/**
 * Check if an appointment needs payment
 */
export function isAppointmentUnpaid(verification: PaymentVerificationResult): boolean {
  return !verification.isPaid;
}
