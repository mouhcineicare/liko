import stripe from './index';

export type StripeVerificationResult = {
  paymentStatus: string;
  subscriptionStatus: string;
  isActive: boolean;
  paymentIntentStatus?: string;
  lastPaymentError?: string;
};

export async function verifyStripePayment(checkoutSessionId?: string, paymentIntentId?: string): Promise<StripeVerificationResult> {
  console.log('=== lib/stripe/verification.ts - verifyStripePayment START ===');
  console.log('lib/stripe/verification.ts - Input parameters:', {
    checkoutSessionId,
    paymentIntentId
  });

  const result: StripeVerificationResult = {
    paymentStatus: 'none',
    subscriptionStatus: 'none',
    isActive: false,
  };

  // Try checkout session ID first
  if (checkoutSessionId) {
    console.log('lib/stripe/verification.ts - Attempting to verify checkout session ID:', checkoutSessionId);
    try {
      if (checkoutSessionId.startsWith('cs_')) {
        console.log('lib/stripe/verification.ts - Valid checkout session ID format, retrieving session');
        // ✅ Checkout Session
        const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
          expand: ['payment_intent', 'subscription', 'payment_intent.charges']
        });

        console.log('lib/stripe/verification.ts - Retrieved checkout session:', JSON.stringify({
          id: session.id,
          payment_status: session.payment_status,
          mode: session.mode,
          customer: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          subscription: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
          payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
        }, null, 2));

        // Set payment status based on session payment_status
        result.paymentStatus = session.payment_status || 'none';
        
        // Set isActive based on payment status, not subscription status
        result.isActive = session.payment_status === 'paid';

        if (session.payment_intent) {
          console.log('lib/stripe/verification.ts - Processing payment intent from session');
          const pi = typeof session.payment_intent === 'string'
            ? await stripe.paymentIntents.retrieve(session.payment_intent)
            : session.payment_intent;

          console.log('lib/stripe/verification.ts - Payment intent data:', JSON.stringify({
            id: pi.id,
            status: pi.status,
            amount: pi.amount,
            currency: pi.currency,
            last_payment_error: pi.last_payment_error?.message
          }, null, 2));

          result.paymentIntentStatus = pi.status;

          // Update payment status based on payment intent status
          if (pi.status === 'succeeded') {
            result.paymentStatus = 'paid';
            result.isActive = true;
          } else if (pi.status === 'requires_payment_method') {
            result.paymentStatus = 'failed';
            result.isActive = false;
            result.lastPaymentError = pi.last_payment_error?.message;
          } else if (pi.status === 'canceled') {
            result.paymentStatus = 'unpaid';
            result.isActive = false;
          }
        }

        if (session.subscription) {
          console.log('lib/stripe/verification.ts - Processing subscription from session');
          const sub = typeof session.subscription === 'string'
            ? await stripe.subscriptions.retrieve(session.subscription)
            : session.subscription;

          console.log('lib/stripe/verification.ts - Subscription data:', JSON.stringify({
            id: sub.id,
            status: sub.status,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end
          }, null, 2));

          result.subscriptionStatus = sub.status;
          
          // For subscriptions, check if the initial payment was successful
          // Don't use subscription status to determine if appointment is paid
          // Only use it to track subscription status separately
          if (session.payment_status === 'paid' && sub.status === 'active') {
            // This is a successful subscription payment
            result.paymentStatus = 'paid';
            result.isActive = true;
          } else if (session.payment_status === 'paid' && ['canceled', 'incomplete_expired', 'past_due', 'unpaid'].includes(sub.status)) {
            // Payment was made but subscription is no longer active
            // The appointment was still paid, so keep it as paid
            result.paymentStatus = 'paid';
            result.isActive = true;
          }
        }

        // If we successfully verified with checkout session, return the result
        if (result.paymentStatus === 'paid') {
          console.log('lib/stripe/verification.ts - Successful verification with checkout session, returning result:', JSON.stringify(result, null, 2));
          console.log('=== lib/stripe/verification.ts - verifyStripePayment END ===');
          return result;
        }
      } else {
        console.log('lib/stripe/verification.ts - Invalid checkout session ID format:', checkoutSessionId);
      }
    } catch (error) {
      console.error(`lib/stripe/verification.ts - Error verifying checkout session ${checkoutSessionId}:`, error);
      // Continue to payment intent verification if checkout session fails
    }
  }

  // Fall back to payment intent ID if checkout session failed or doesn't exist
  if (paymentIntentId) {
    console.log('lib/stripe/verification.ts - Attempting to verify payment intent ID:', paymentIntentId);
    try {
      if (paymentIntentId.startsWith('pi_')) {
        console.log('lib/stripe/verification.ts - Valid payment intent ID format, retrieving payment intent');
        // ✅ Payment Intent
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        console.log('lib/stripe/verification.ts - Retrieved payment intent:', JSON.stringify({
          id: pi.id,
          status: pi.status,
          amount: pi.amount,
          currency: pi.currency,
          last_payment_error: pi.last_payment_error?.message,
          charges_count: (pi as any).charges?.data?.length || 0
        }, null, 2));

        result.paymentIntentStatus = pi.status;
        
        // Set payment status and isActive based on payment intent status
        if (pi.status === 'succeeded') {
          result.paymentStatus = 'paid';
          result.isActive = true;
        } else if (pi.status === 'requires_payment_method') {
          result.paymentStatus = 'failed';
          result.isActive = false;
          result.lastPaymentError = pi.last_payment_error?.message;
        } else if (pi.status === 'canceled') {
          result.paymentStatus = 'unpaid';
          result.isActive = false;
        } else {
          result.paymentStatus = pi.status;
          result.isActive = false;
        }
        
        // Prefer charges data if available to confirm settlement
        if ((pi as any).charges?.data?.length) {
          const anyPaid = (pi as any).charges.data.some((c: any) => c.paid && c.status === 'succeeded');
          if (anyPaid) {
            result.paymentStatus = 'paid';
            result.isActive = true;
          }
          console.log('lib/stripe/verification.ts - Charge verification result:', {
            total_charges: (pi as any).charges.data.length,
            paid_charges: (pi as any).charges.data.filter((c: any) => c.paid && c.status === 'succeeded').length,
            result: anyPaid ? 'paid' : pi.status
          });
        }
      } else if (paymentIntentId.startsWith('ch_')) {
        console.log('lib/stripe/verification.ts - Valid charge ID format, retrieving charge');
        // ✅ Charge
        const charge = await stripe.charges.retrieve(paymentIntentId);
        
        console.log('lib/stripe/verification.ts - Retrieved charge:', JSON.stringify({
          id: charge.id,
          status: charge.status,
          paid: charge.paid,
          amount: charge.amount,
          currency: charge.currency,
          payment_intent: charge.payment_intent
        }, null, 2));

        if (charge.status === 'succeeded' && charge.paid) {
          result.paymentStatus = 'paid';
          result.isActive = true;
        } else {
          result.paymentStatus = charge.status;
          result.isActive = false;
        }
        
        if (charge.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(charge.payment_intent as string);
          result.paymentIntentStatus = pi.status;
          console.log('lib/stripe/verification.ts - Associated payment intent status:', pi.status);
        }
      } else if (paymentIntentId.startsWith('in_')) {
        console.log('lib/stripe/verification.ts - Valid invoice ID format, retrieving invoice');
        // ✅ Invoice
        const invoiceResponse = await stripe.invoices.retrieve(paymentIntentId);
        const invoice = (invoiceResponse as any).subscription !== undefined ? invoiceResponse : (invoiceResponse as any).data || invoiceResponse;
        
        console.log('lib/stripe/verification.ts - Retrieved invoice:', JSON.stringify({
          id: invoice.id,
          status: invoice.status,
          subscription: invoice.subscription,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency
        }, null, 2));

        if (invoice.status === 'paid') {
          result.paymentStatus = 'paid';
          result.isActive = true;
        } else {
          result.paymentStatus = invoice.status ?? 'none';
          result.isActive = false;
        }
        
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          result.subscriptionStatus = sub.status;
          console.log('lib/stripe/verification.ts - Associated subscription status:', sub.status);
        }
      } else if (paymentIntentId.startsWith('sub_')) {
        console.log('lib/stripe/verification.ts - Valid subscription ID format, retrieving subscription');
        // ✅ Subscription
        const sub = await stripe.subscriptions.retrieve(paymentIntentId);
        
        console.log('lib/stripe/verification.ts - Retrieved subscription:', JSON.stringify({
          id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          cancel_at_period_end: sub.cancel_at_period_end
        }, null, 2));

        result.subscriptionStatus = sub.status;
        
        // For subscription ID, check if it's active to determine payment status
        // But remember that a canceled subscription doesn't mean the appointment wasn't paid
        if (['active', 'trialing'].includes(sub.status)) {
          result.paymentStatus = 'paid';
          result.isActive = true;
        } else if (['canceled', 'incomplete_expired', 'past_due', 'unpaid'].includes(sub.status)) {
          // Subscription is not active, but we can't determine if the appointment was paid
          // from just the subscription status. We need to check if there was a successful payment.
          result.paymentStatus = 'unpaid';
          result.isActive = false;
        } else {
          result.paymentStatus = 'unpaid';
          result.isActive = false;
        }
      } else {
        console.log('lib/stripe/verification.ts - Unknown Stripe ID format:', paymentIntentId);
        // ❌ Unknown type
        result.paymentStatus = 'error';
        result.lastPaymentError = 'Unsupported Stripe ID format';
      }
    } catch (error) {
      console.error(`lib/stripe/verification.ts - Error verifying payment intent ${paymentIntentId}:`, error);
      result.paymentStatus = 'error';
      result.subscriptionStatus = 'error';
      if (error instanceof Error) {
        result.lastPaymentError = error.message;
      }
    }
  }

  console.log('lib/stripe/verification.ts - Final verification result:', JSON.stringify(result, null, 2));
  console.log('=== lib/stripe/verification.ts - verifyStripePayment END ===');
  return result;
}

// Keep the old function signature for backward compatibility
export async function verifyStripePaymentLegacy(id: string | undefined): Promise<StripeVerificationResult> {
  return verifyStripePayment(id, undefined);
}

export async function retrieveCustomerIdFromLastPayment(userId: string): Promise<string | null> {
  console.log('=== lib/stripe/verification.ts - retrieveCustomerIdFromLastPayment START ===');
  console.log('lib/stripe/verification.ts - Input userId:', userId);
  
  try {
    // Import models here to avoid circular dependencies
    const { default: Appointment } = await import('@/lib/db/models/Appointment');
    const { default: User } = await import('@/lib/db/models/User');
    
    console.log('lib/stripe/verification.ts - Searching for verified paid appointments for user:', userId);
    
    // Find ALL verified paid appointments with payment IDs for this user
    const verifiedAppointments = await Appointment.find({
      patient: userId,
      paymentStatus: 'completed', // Only look for completed payments
      $or: [
        { checkoutSessionId: { $exists: true, $ne: null } },
        { paymentIntentId: { $exists: true, $ne: null } }
      ]
    }).sort({ createdAt: -1 }).limit(5); // Try up to 5 most recent appointments

    if (verifiedAppointments.length === 0) {
      console.log('lib/stripe/verification.ts - No verified paid appointments with payment IDs found for user:', userId);
      console.log('=== lib/stripe/verification.ts - retrieveCustomerIdFromLastPayment END ===');
      return null;
    }

    console.log(`lib/stripe/verification.ts - Found ${verifiedAppointments.length} verified paid appointments for user:`, userId);

    // Try each appointment until we find a valid customer ID
    for (const appointment of verifiedAppointments) {
      console.log('lib/stripe/verification.ts - Trying appointment:', {
        appointmentId: appointment._id,
        checkoutSessionId: appointment.checkoutSessionId,
        paymentIntentId: appointment.paymentIntentId,
        paymentStatus: appointment.paymentStatus
      });

      let customerId: string | null = null;

      // Try to get customer ID from checkout session first
      if (appointment.checkoutSessionId) {
        console.log('lib/stripe/verification.ts - Attempting to retrieve customer ID from checkout session:', appointment.checkoutSessionId);
        try {
          const session = await stripe.checkout.sessions.retrieve(appointment.checkoutSessionId);
          
          console.log('lib/stripe/verification.ts - Retrieved checkout session:', JSON.stringify({
            id: session.id,
            payment_status: session.payment_status,
            customer: typeof session.customer === 'string' ? session.customer : session.customer?.id
          }, null, 2));
          
          // Verify the payment was actually successful
          if (session.payment_status === 'paid') {
            customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
            
            if (customerId) {
              console.log('lib/stripe/verification.ts - Retrieved customer ID from verified paid checkout session:', customerId);
              // Found customer ID, update user and return
              const updateResult = await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
              console.log('lib/stripe/verification.ts - Updated user with customer ID:', userId, customerId, 'Update result:', updateResult ? 'success' : 'failed');
              
              // Verify the update was successful
              const updatedUser = await User.findById(userId);
              console.log('lib/stripe/verification.ts - Verification - User stripeCustomerId after update:', updatedUser?.stripeCustomerId);
              
              console.log('=== lib/stripe/verification.ts - retrieveCustomerIdFromLastPayment END ===');
              return customerId;
            }
          } else {
            console.log('lib/stripe/verification.ts - Checkout session payment status is not paid:', session.payment_status);
          }
        } catch (error) {
          console.error('lib/stripe/verification.ts - Error retrieving checkout session:', error);
        }
      }

      // If no customer ID from checkout session, try payment intent
      if (!customerId && appointment.paymentIntentId) {
        console.log('lib/stripe/verification.ts - Attempting to retrieve customer ID from payment intent:', appointment.paymentIntentId);
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(appointment.paymentIntentId);
          
          console.log('lib/stripe/verification.ts - Retrieved payment intent:', JSON.stringify({
            id: paymentIntent.id,
            status: paymentIntent.status,
            customer: paymentIntent.customer
          }, null, 2));
          
          // Verify the payment was actually successful
          if (paymentIntent.status === 'succeeded') {
            customerId = paymentIntent.customer as string || null;
            
            if (customerId) {
              console.log('lib/stripe/verification.ts - Retrieved customer ID from verified succeeded payment intent:', customerId);
              // Found customer ID, update user and return
              const updateResult = await User.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
              console.log('lib/stripe/verification.ts - Updated user with customer ID:', userId, customerId, 'Update result:', updateResult ? 'success' : 'failed');
              
              // Verify the update was successful
              const updatedUser = await User.findById(userId);
              console.log('lib/stripe/verification.ts - Verification - User stripeCustomerId after update:', updatedUser?.stripeCustomerId);
              
              console.log('=== lib/stripe/verification.ts - retrieveCustomerIdFromLastPayment END ===');
              return customerId;
            }
          } else {
            console.log('lib/stripe/verification.ts - Payment intent status is not succeeded:', paymentIntent.status);
          }
        } catch (error) {
          console.error('lib/stripe/verification.ts - Error retrieving payment intent:', error);
        }
      }
    }

    console.log('lib/stripe/verification.ts - No customer ID found in any verified paid appointments for user:', userId);
    console.log('=== lib/stripe/verification.ts - retrieveCustomerIdFromLastPayment END ===');
    return null;
  } catch (error) {
    console.error('lib/stripe/verification.ts - Error retrieving customer ID from last payment:', error);
    console.log('=== lib/stripe/verification.ts - retrieveCustomerIdFromLastPayment END WITH ERROR ===');
    return null;
  }
}
