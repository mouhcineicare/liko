import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { syncAppointmentWithCalendar } from "@/lib/services/google";
import mongoose from "mongoose";
import { triggerPaymentConfirmationEmail } from "@/lib/services/email-triggers";
import Subscription from "@/lib/db/models/Subscription";
import Balance from "@/lib/db/models/Balance";
import Plan from "@/lib/db/models/Plan";
import { subscriptionTopupBalance } from "@/lib/api/balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getSessionsFromPlanType(planType: string): number {
  switch (planType) {
    case 'x1_sessions': return 1;
    case 'x2_sessions': return 2;
    case 'x4_sessions': return 4;
    case 'x8_sessions': return 8;
    case 'x12_sessions': return 12;
    case 'x16_sessions': return 16;
    case 'x20_sessions': return 20;
    case 'x24_sessions': return 24;
    default: return 1;
  }
}

export async function POST(req: Request) {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Webhook received at path:', req.url);
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  if (!endpointSecret) {
    console.log('ERROR: Webhook secret not configured');
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      console.log('ERROR: No stripe signature found');
      return NextResponse.json(
        { error: "No stripe signature found" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
      console.log('Webhook event received:', event.type);
    } catch (err) {
      console.log('ERROR: Webhook signature verification failed');
      console.error('Signature verification error:', err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    await connectDB();

    switch (event.type) {
      case "checkout.session.completed":
      case "payment_intent.succeeded":
        await handleSuccessfulPayment(event);
        break;
      case "payment_intent.payment_failed":
        await handleFailedPayment(event);
        break;
      case "invoice.payment_succeeded":
        await handleSubscriptionPayment(event);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCancellation(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Enhance the handleSuccessfulPayment function
async function handleSuccessfulPayment(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSuccessfulPayment START ===');
  console.log('Event type:', event.type);
  console.log('Event data:', JSON.stringify(event.data, null, 2));
  
  let session: Stripe.Checkout.Session | undefined;
  let appointmentId: string | undefined;
  let paymentIntent: Stripe.PaymentIntent | undefined;
  
  if (event.type === "checkout.session.completed") {
    session = event.data.object as Stripe.Checkout.Session;
    appointmentId = session.metadata?.appointmentId;
    
    console.log('Checkout session completed');
    console.log('Session metadata:', session.metadata);
    console.log('Appointment ID from metadata:', appointmentId);
    console.log('Session ID:', session.id);
    console.log('Session payment status:', session.payment_status);
    
    // Check if this is a renew_now payment
    if (session.metadata?.type === 'renew_now') {
      console.log('Processing renew_now payment');
      await handleRenewNowPayment(session);
      return;
    }
    
    // For subscriptions, verify the payment status
    if (session.mode === 'subscription' && session.payment_status !== 'paid') {
      console.log('Subscription payment not yet completed, skipping');
      return;
    }
  } 
  else if (event.type === "payment_intent.succeeded") {
    paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    console.log('Payment intent succeeded');
    console.log('Payment intent metadata:', paymentIntent.metadata);
    appointmentId = paymentIntent.metadata?.appointmentId;
    console.log('Appointment ID from payment intent metadata:', appointmentId);
  }

  if (!appointmentId) {
    console.log('ERROR: No appointment ID found in event metadata');
    return;
  }

  console.log('Processing payment for appointment:', appointmentId);

  // Find the appointment
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    console.log('ERROR: Appointment not found:', appointmentId);
    return;
  }

  console.log('Found appointment:', {
    id: appointment._id,
    status: appointment.status,
    paymentStatus: appointment.paymentStatus,
    plan: appointment.plan
  });

  console.log('Current payment status:', appointment.paymentStatus);

  // Only process if payment isn't already completed
  if (appointment.paymentStatus !== 'completed') {
    // Additional verification for subscription payments
    if (session?.mode === 'subscription') {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      
      if (subscription.status !== 'active') {
        console.log('Subscription not active yet, skipping');
        return;
      }
    }

    // Check if this is a rebook session - always set to confirmed for rebooking
    const isRebookSession = appointment.plan === 'Purchased From Rebooking' || appointment.plan === 'Single Online Therapy Session';
    const statusToSet = isRebookSession ? 'confirmed' : 'pending_match';
    
    console.log('Webhook status logic:', {
      isRebookSession,
      currentStatus: appointment.status,
      statusToSet
    });

    // Update payment status and persist Stripe identifiers for auditing
    console.log('=== WEBHOOK: Preparing update data ===');
    console.log('Session ID for checkoutSessionId:', session?.id);
    console.log('PaymentIntent ID for paymentIntentId:', paymentIntent?.id);
    
    const updateData: any = {
      paymentStatus: "completed",
      status: statusToSet, // Set correct status for rebooking sessions
      isStripeVerified: true, // Mark as Stripe verified to prevent auto-cancellation
      paidAt: new Date(),
      paymentMethod: "card",
      ...(session?.id ? { checkoutSessionId: session.id } : {}),
      ...(paymentIntent?.id ? { paymentIntentId: paymentIntent.id } : {}),
      $push: {
        paymentHistory: {
          amount: session?.amount_total ? session.amount_total / 100 : paymentIntent?.amount ? paymentIntent.amount / 100 : 0,
          currency: session?.currency?.toUpperCase() || paymentIntent?.currency?.toUpperCase() || 'AED',
          status: 'completed',
          paymentMethod: 'card',
          stripeSessionId: session?.id,
          stripePaymentIntentId: paymentIntent?.id,
          createdAt: new Date()
        }
      }
    };

    // Get patient data and ensure Stripe customer ID is stored
    const patient = await User.findById(appointment.patient);
    if (patient) {
      // Ensure Stripe customer ID is stored on the user
      if (!patient.stripeCustomerId && session?.customer) {
        patient.stripeCustomerId = session.customer as string;
        await patient.save();
        console.log('Stored Stripe customer ID for user:', patient._id);
      }
      
      if (patient.therapy) {
        updateData.therapist = new mongoose.Types.ObjectId(patient.therapy);
        updateData.isConfirmed = true;

        // Sync with Google Calendar if therapist has it connected
        const therapist = await User.findById(patient.therapy);
        if (therapist?.googleRefreshToken) {
          try {
            await syncAppointmentWithCalendar(appointment, therapist);
          } catch (error) {
            console.error("Error syncing with Google Calendar:", error);
          }
        }
      }
    }

    await Appointment.findByIdAndUpdate(appointmentId, updateData);
    
    // Verify the update was successful
    const updatedAppointment = await Appointment.findById(appointmentId);
    console.log('=== WEBHOOK: Verification after update ===');
    console.log('Updated appointment checkoutSessionId:', updatedAppointment?.checkoutSessionId);
    console.log('Updated appointment paymentIntentId:', updatedAppointment?.paymentIntentId);
    console.log('Updated appointment isStripeVerified:', updatedAppointment?.isStripeVerified);
    console.log('Updated appointment status:', updatedAppointment?.status);
    
    // Update balance for rebooking sessions
    if (isRebookSession) {
      console.log('=== WEBHOOK: Updating balance for rebooking session ===');
      const sessionsToAdd = appointment.sessionCount || (appointment.recurring ? appointment.recurring.length + 1 : 1);
      console.log('Sessions to add to balance:', sessionsToAdd);
      
      const Balance = require('@/lib/db/models/Balance').default;
      let balance = await Balance.findOne({ user: appointment.patient });
      if (!balance) {
        balance = new Balance({ user: appointment.patient });
      }
      
      // Update balance
      balance.totalSessions += sessionsToAdd;
      
      // Record history
      balance.history.push({
        action: 'added',
        sessions: sessionsToAdd,
        plan: appointment.plan,
        reason: `Rebooking session purchase - ${sessionsToAdd} sessions`,
        createdAt: new Date()
      });
      
      // Record payment
      balance.payments.push({
        paymentId: session?.id || paymentIntent?.id,
        amount: session?.amount_total ? session.amount_total / 100 : paymentIntent?.amount ? paymentIntent.amount / 100 : 0,
        currency: session?.currency?.toUpperCase() || paymentIntent?.currency?.toUpperCase() || 'AED',
        date: new Date(),
        sessionsAdded: sessionsToAdd,
        paymentType: 'rebooking_checkout',
        receiptUrl: `https://dashboard.stripe.com/payments/${session?.id || paymentIntent?.id}`
      });
      
      await balance.save();
      console.log('Balance updated for rebooking session:', {
        userId: appointment.patient,
        sessionsAdded: sessionsToAdd,
        newTotalSessions: balance.totalSessions
      });
    }
    
    console.log('=== WEBHOOK: Payment completed successfully ===');
    console.log('Appointment ID:', appointmentId);
    console.log('Payment Status: completed');
    console.log('Appointment Status:', statusToSet);
    console.log('Stripe Verified: true');
    console.log('Updated appointment data:', updateData);
    console.log('=== WEBHOOK: Payment processing complete ===');

    // Send payment confirmation email
    await triggerPaymentConfirmationEmail(appointment);
  }
}

async function handleFailedPayment(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { appointmentId } = paymentIntent.metadata;

  if (!appointmentId) {
    throw new Error('Appointment ID not found in payment intent metadata');
  }

  console.log('Payment failed for appointment:', appointmentId);

  await Appointment.findByIdAndUpdate(appointmentId, {
    paymentStatus: "failed",
    status: "cancelled",
    lastStatusChangeReason: "Payment failed",
    lastStatusChangedAt: new Date(),
    lastStatusChangedBy: "system"
  });

  console.log('Appointment cancelled due to payment failure');
}

async function handleSubscriptionPayment(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSubscriptionPayment START ===');
  
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription as string;
  
  console.log('Processing subscription payment for subscription:', subscriptionId);
  
  try {
    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('Retrieved subscription:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer
    });
    
    // Find the subscription in our database
    const subscriptionRecord = await Subscription.findOne({ 
      stripeSubscriptionId: subscriptionId 
    });
    
    if (!subscriptionRecord) {
      console.log('Subscription record not found in database:', subscriptionId);
      return;
    }
    
    console.log('Found subscription record:', {
      id: subscriptionRecord._id,
      user: subscriptionRecord.user,
      plan: subscriptionRecord.plan
    });
    
    // Update subscription status
    await Subscription.findByIdAndUpdate(subscriptionRecord._id, {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false
    });
    
    console.log('Updated subscription record with new status:', subscription.status);
    
    // If this is a successful payment, add sessions to balance
    if (subscription.status === 'active' && invoice.paid) {
      console.log('Processing successful subscription payment');
      
      // Get the plan to determine sessions to add
      const plan = await Plan.findById(subscriptionRecord.plan);
      if (plan) {
        const sessionsToAdd = getSessionsFromPlanType(plan.type);
        console.log('Adding sessions to balance:', sessionsToAdd);
        
        // Update user balance
        await subscriptionTopupBalance(subscriptionRecord.user.toString(), sessionsToAdd, plan.title);
        
        console.log('Successfully added sessions to user balance');
      } else {
        console.log('Plan not found for subscription:', subscriptionRecord.plan);
      }
    }
    
    console.log('=== WEBHOOK: handleSubscriptionPayment END ===');
  } catch (error) {
    console.error('Error processing subscription payment:', error);
  }
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSubscriptionCreated START ===');
  
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;
  
  console.log('Processing subscription created for customer:', customerId);
  
  try {
    // Find the user by Stripe customer ID
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (!user) {
      console.log('User not found for customer ID:', customerId);
      return;
    }
    
    console.log('Found user for subscription:', user._id);
    
    // Get the price ID from the subscription
    const priceId = subscription.items.data[0].price.id;
    console.log('Price ID from subscription:', priceId);
    
    // Find the plan by Stripe price ID
    const plan = await Plan.findOne({ stripePriceId: priceId });
    if (!plan) {
      console.log('Plan not found for price ID:', priceId);
      return;
    }
    
    console.log('Found plan for subscription:', plan.title);
    
    // Create subscription record
    const subscriptionRecord = new Subscription({
      user: user._id,
      plan: plan._id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      price: subscription.items.data[0].price.unit_amount / 100,
    });
    
    await subscriptionRecord.save();
    console.log('Created subscription record:', subscriptionRecord._id);
    
    console.log('=== WEBHOOK: handleSubscriptionCreated END ===');
  } catch (error) {
    console.error('Error processing subscription created:', error);
  }
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSubscriptionUpdated START ===');
  
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log('Processing subscription updated:', subscription.id);
  
  try {
    // Update subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false
      }
    );
    
    console.log('Updated subscription record:', subscription.id);
    console.log('=== WEBHOOK: handleSubscriptionUpdated END ===');
  } catch (error) {
    console.error('Error processing subscription updated:', error);
  }
}

async function handleSubscriptionCancellation(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSubscriptionCancellation START ===');
  
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log('Processing subscription cancellation:', subscription.id);
  
  try {
    // Update subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: 'canceled',
        cancelAtPeriodEnd: false
      }
    );
    
    console.log('Updated subscription record for cancellation:', subscription.id);
    console.log('=== WEBHOOK: handleSubscriptionCancellation END ===');
  } catch (error) {
    console.error('Error processing subscription cancellation:', error);
  }
}

async function handleRenewNowPayment(session: Stripe.Checkout.Session) {
  console.log('=== handleRenewNowPayment START ===');
  
  try {
    // Get the product name from the session
    const productName = session.metadata?.product_name;
    if (!productName) {
      console.error('No product name in session metadata');
      return;
    }
    
    console.log('Processing renew_now payment for product:', productName);
    
    // Find the matching plan
    const matchingPlan = await Plan.findOne({
      title: productName,
      subscribtion: 'monthly'
    });
    
    if (!matchingPlan) {
      console.error('No matching plan found for renew_now:', productName);
      const availablePlans = await Plan.find({ subscribtion: 'monthly' }).select('title type');
      console.log('Available monthly plans:', availablePlans.map(p => ({ title: p.title, type: p.type })));
      return;
    }
    
    // Get user ID from metadata
    const userId = session.metadata?.userId;
    const renewedFrom = session.metadata?.renewedFrom;
    
    if (!userId || !renewedFrom) {
      console.error('Missing required metadata for renew_now');
      return;
    }
    
    console.log('Processing renew_now for user:', userId, 'renewed from:', renewedFrom);
    
    // Credit sessions to user's balance
    const sessionsToAdd = getSessionsFromPlanType(matchingPlan.type);
    console.log('Sessions to add:', sessionsToAdd);
    
    let balance = await Balance.findOne({ user: userId });
    if (!balance) {
      balance = new Balance({ user: userId });
    }
    
    // Update balance
    balance.totalSessions += sessionsToAdd;
    
    // Record history
      balance.history.push({
        action: 'added',
        sessions: sessionsToAdd,
        plan: matchingPlan.title, // Use plan title instead of plan ID
        reason: `Renew Now - ${productName}`,
        createdAt: new Date()
      });
    
    // Record payment
    balance.payments.push({
      paymentId: subscription.id,
      amount: subscription.items.data[0].price.unit_amount / 100,
      currency: subscription.items.data[0].price.currency,
      date: new Date(),
      planId: matchingPlan._id,
      sessionsAdded: sessionsToAdd,
      paymentType: 'renew_now',
      receiptUrl: `https://dashboard.stripe.com/subscriptions/${subscription.id}`
    });
    
    await balance.save();
    console.log('Balance updated for user:', userId, 'new total sessions:', balance.totalSessions);
    
    // Create new subscription record
    const newSubscriptionRecord = new Subscription({
      user: userId,
      plan: matchingPlan._id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      price: subscription.items.data[0].price.unit_amount / 100,
    });
    
    await newSubscriptionRecord.save();
    console.log('New subscription record created:', newSubscriptionRecord._id);
    
    // Cancel the old subscription at period end
    await stripe.subscriptions.update(renewedFrom, {
      cancel_at_period_end: true
    });
    
    // Update old subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: renewedFrom },
      { 
        cancelAtPeriodEnd: true,
        status: 'canceled'
      }
    );
    
    console.log(`Renew now completed: ${sessionsToAdd} sessions added to user ${userId}`);
    console.log('=== handleRenewNowPayment END ===');
  } catch (error) {
    console.error('Error in handleRenewNowPayment:', error);
  }
}