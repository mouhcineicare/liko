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

  const body = await req.text();
  console.log('Raw body:', body);
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    console.log('Webhook event received:', event.type);

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
  } catch (err: any) {
    console.error("Webhook handler failed:", err);
    return NextResponse.json(
      { 
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }, 
      { status: 500 }
    );
  }
}


async function handleSubscriptionPayment(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSubscriptionPayment START ===');
  
  const invoice = event.data.object as Stripe.Invoice & {
    subscription: string;
  };
  
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    throw new Error('No subscription found on invoice');
  }

  console.log('Processing subscription payment for subscription ID:', subscriptionId);

  // Retrieve the full subscription object with proper typing
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription & {
    current_period_start: number;
    current_period_end: number;
  };

  const currentPeriodStart = subscription.current_period_start;
  const currentPeriodEnd = subscription.current_period_end;

  if (!currentPeriodStart || !currentPeriodEnd) {
    throw new Error('Missing subscription period dates');
  }

  const userId = subscription.metadata?.userId;
  const planId = subscription.metadata?.planId;

  if (!userId || !planId) {
    throw new Error('Missing user or plan ID in subscription metadata');
  }

  console.log('Subscription metadata:', { userId, planId });

  // Update subscription record
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      user: new mongoose.Types.ObjectId(userId),
      plan: new mongoose.Types.ObjectId(planId),
      status: subscription.status,
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      price: invoice.amount_paid / 100, // Convert from cents
    },
    { upsert: true, new: true }
  );

  console.log(`Updated subscription ${subscription.id} for user ${userId}`);

  // ADD THIS: Update balance with sessions
  try {
    console.log('Adding sessions to balance for subscription:', subscriptionId);
    await subscriptionTopupBalance(subscriptionId);
    console.log(`Balance updated successfully for subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Failed to update balance for subscription:', error);
    // Don't throw error - subscription record is already updated
    // This ensures the subscription is tracked even if balance update fails
  }

  console.log('=== WEBHOOK: handleSubscriptionPayment END ===');
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSubscriptionCreated START ===');
  
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.userId;
  const planId = subscription.metadata?.planId;

  if (!userId || !planId) {
    console.error('Missing user or plan ID in subscription metadata');
    return;
  }

  console.log('Creating subscription record for:', { userId, planId, subscriptionId: subscription.id });

  try {
    // Create subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        user: new mongoose.Types.ObjectId(userId),
        plan: new mongoose.Types.ObjectId(planId),
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        price: subscription.items.data[0].price.unit_amount / 100,
      },
      { upsert: true, new: true }
    );

    console.log(`Created subscription record for ${subscription.id}`);
  } catch (error) {
    console.error('Error creating subscription record:', error);
  }

  console.log('=== WEBHOOK: handleSubscriptionCreated END ===');
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  console.log('=== WEBHOOK: handleSubscriptionUpdated START ===');
  
  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.userId;
  const planId = subscription.metadata?.planId;

  if (!userId || !planId) {
    console.error('Missing user or plan ID in subscription metadata');
    return;
  }

  console.log('Updating subscription record for:', { userId, planId, subscriptionId: subscription.id });

  try {
    // Update subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        user: new mongoose.Types.ObjectId(userId),
        plan: new mongoose.Types.ObjectId(planId),
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        price: subscription.items.data[0].price.unit_amount / 100,
      },
      { upsert: true, new: true }
    );

    console.log(`Updated subscription record for ${subscription.id}`);
  } catch (error) {
    console.error('Error updating subscription record:', error);
  }

  console.log('=== WEBHOOK: handleSubscriptionUpdated END ===');
}

async function handleSubscriptionCancellation(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: "canceled",
      cancelAtPeriodEnd: false,
    }
  );

  console.log(`Marked subscription ${subscription.id} as canceled`);
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
    
    // Try to get session from payment intent
    if (paymentIntent.metadata?.appointmentId) {
      appointmentId = paymentIntent.metadata.appointmentId;
    } else if (paymentIntent.latest_charge) {
      // Fallback: retrieve session by expanding payment intent's latest_charge's payment_link if present (best effort)
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntent.id, { expand: ['latest_charge', 'charges'] });
        const charge = (pi as any).latest_charge || (pi as any).charges?.data?.[0];
        if (charge && charge.checkout_session) {
          session = await stripe.checkout.sessions.retrieve(charge.checkout_session as string);
          appointmentId = session.metadata?.appointmentId;
        }
      } catch (e) {
        console.warn('Could not resolve Checkout Session from payment_intent; proceeding with appointmentId-only linkage');
      }
    }
  }

  if (!appointmentId) {
    console.error('No appointmentId found in event chain');
    console.log('Session metadata:', session?.metadata);
    console.log('Payment intent metadata:', paymentIntent?.metadata);
    return;
  }
  
  console.log('Found appointment ID:', appointmentId);

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    console.error('Appointment not found with ID:', appointmentId);
    throw new Error('Appointment not found');
  }
  
  console.log('Found appointment:', appointment._id);
  console.log('Current appointment status:', appointment.status);
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

    // Update payment status and persist Stripe identifiers for auditing
    const updateData: any = {
      paymentStatus: "completed",
      status: "pending_match", // Use new status system - will be updated to confirmed if therapist assigned
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
    console.log('=== WEBHOOK: Payment completed successfully ===');
    console.log('Appointment ID:', appointmentId);
    console.log('Payment Status: completed');
    console.log('Appointment Status: pending_match');
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

  const appointment = await Appointment.findById(appointmentId);
  if (appointment) {
    appointment.paymentStatus = "failed";
    await appointment.save();
  }
}

async function handleRenewNowPayment(session: Stripe.Checkout.Session) {
  console.log('=== handleRenewNowPayment START ===');
  console.log('Session ID:', session.id);
  console.log('Session metadata:', session.metadata);

  try {
    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const productId = subscription.items.data[0].price.product;
    const product = await stripe.products.retrieve(productId as string);

    // Extract the actual plan name from Stripe product name
    const planName = product.name.replace(/^Therapy Plan:\s*/, '');
    console.log('Stripe product name:', product.name);
    console.log('Extracted plan name:', planName);

    // Find the matching plan in our database
    const matchingPlan = await Plan.findOne({
      title: planName,
      subscribtion: 'monthly'
    });

    if (!matchingPlan) {
      console.error('No matching plan found for renew_now:', planName);
      const availablePlans = await Plan.find({ subscribtion: 'monthly' }).select('title type');
      console.log('Available monthly plans:', availablePlans.map(p => ({ title: p.title, type: p.type })));
      throw new Error(`No matching plan found for product "${product.name}"`);
    }

    // Get user ID from metadata
    const userId = session.metadata?.userId;
    const renewedFrom = session.metadata?.renewedFrom;

    if (!userId || !renewedFrom) {
      console.error('Missing required metadata for renew_now');
      throw new Error('Missing required metadata for renew_now payment');
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
        reason: `Renew Now - ${product.name}`,
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
    throw error;
  }
}