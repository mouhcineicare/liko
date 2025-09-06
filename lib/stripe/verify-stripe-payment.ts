// lib/stripe/verify-stripe-payment.ts
import stripe from './index'

export async function verifyStripePaymentId(paymentId: string) {
  try {
    // Determine the object type by ID prefix
    if (paymentId.startsWith('pi_')) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      if (paymentIntent.status === 'succeeded') {
        return { status: 'valid', type: 'payment_intent', data: paymentIntent };
      }
      return { status: 'invalid', type: 'payment_intent', reason: `PaymentIntent status: ${paymentIntent.status}` };
    }

    if (paymentId.startsWith('ch_')) {
      const charge = await stripe.charges.retrieve(paymentId);
      if (charge.paid) {
        return { status: 'valid', type: 'charge', data: charge };
      }
      return { status: 'invalid', type: 'charge', reason: `Charge paid: ${charge.paid}` };
    }

    if (paymentId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(paymentId);
      // session.payment_status can be 'paid', 'unpaid', or 'no_payment_required'
      if (session.payment_status === 'paid') {
        return { status: 'valid', type: 'checkout_session', data: session };
      }
      return { status: 'invalid', type: 'checkout_session', reason: `Checkout session payment status: ${session.payment_status}` };
    }

    if (paymentId.startsWith('sub_')) {
      const subscription = await stripe.subscriptions.retrieve(paymentId);
      if (subscription.status === 'active') {
        return { status: 'valid', type: 'subscription', data: subscription };
      }
      return { status: 'invalid', type: 'subscription', reason: `Subscription status: ${subscription.status}` };
    }

    if (paymentId.startsWith('in_')) {
      const invoice = await stripe.invoices.retrieve(paymentId);
      if (invoice.paid) {
        return { status: 'valid', type: 'invoice', data: invoice };
      }
      return { status: 'invalid', type: 'invoice', reason: `Invoice paid: ${invoice.paid}` };
    }

    // Unknown or unsupported ID prefix
    return { status: 'not_found', type: 'unknown', reason: 'Unsupported or unknown Stripe ID prefix' };

  } catch (error) {
    console.error('Stripe verification error:', error);
    return {
      status: 'invalid',
      type: 'unknown',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
