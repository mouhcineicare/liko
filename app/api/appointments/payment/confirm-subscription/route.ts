import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import connectDB from "@/lib/db/connect";
import Stripe from "stripe";
import { Subscription, User, Appointment } from "@/lib/db/models";
import { ensureCustomerIdLinked } from "@/lib/stripe/customerManagement";

export async function POST(req: NextRequest) {
  console.log('=== app/api/appointments/payment/confirm-subscription/route.ts - POST START ===');
  
  const requestBody = await req.json();
  console.log('app/api/appointments/payment/confirm-subscription/route.ts - Request body:', JSON.stringify(requestBody, null, 2));
  
  const { sessionId } = requestBody;

  if (!sessionId) {
    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Error: Missing session ID');
    return NextResponse.json(
      { success: false, error: "Missing session ID" },
      { status: 400 }
    );
  }

  console.log('app/api/appointments/payment/confirm-subscription/route.ts - Processing subscription confirmation for sessionId:', sessionId);

  try {
    await connectDB();

    // Retrieve the Stripe session with subscription details
    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Retrieving Stripe session with subscription details');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer", "payment_intent"]
    });

    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Retrieved Stripe session:', JSON.stringify({
      id: session.id,
      payment_status: session.payment_status,
      mode: session.mode,
      metadata: session.metadata,
      customer: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      subscription: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
      payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    }, null, 2));

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Error: Payment not completed, status:', session.payment_status);
      return NextResponse.json(
        { success: false, error: "Payment not completed" },
        { status: 402 }
      );
    }

    const appointmentId = session.metadata?.appointmentId;
    if (!appointmentId) {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Error: Appointment ID not found in session metadata');
      return NextResponse.json(
        { success: false, error: "Appointment ID not found" },
        { status: 400 }
      );
    }

    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Found appointmentId in metadata:', appointmentId);

    // Verify the appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Error: Appointment not found for ID:', appointmentId);
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Found appointment:', JSON.stringify(appointment.toObject(), null, 2));

    const subscription = session.subscription as Stripe.Subscription;
    const customerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Subscription data:', JSON.stringify({
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      items: subscription.items.data.map(item => ({
        price_id: item.price.id,
        unit_amount: item.price.unit_amount
      }))
    }, null, 2));

    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Customer ID from session:', customerId);

    // Find the user by appointment patient
    const user = await User.findById(appointment.patient);
    
    if (!user) {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Error: User not found');
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Found user:', JSON.stringify({
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      stripeCustomerId: user.stripeCustomerId
    }, null, 2));

    // Use centralized customer ID linking
    if (customerId) {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Ensuring customer ID is linked');
      const linked = await ensureCustomerIdLinked(user._id.toString(), customerId);
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Customer ID linking result:', linked);
      
      if (!linked) {
        console.log('app/api/appointments/payment/confirm-subscription/route.ts - WARNING: Customer ID linking failed or conflict detected');
      }
    }

    // First try to find existing subscription
    console.log('app/api/appointments/payment/confirm-subscription/route.ts - Looking for existing subscription record');
    let subscriptionRecord = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });

    // If not found, try to create new subscription
    if (!subscriptionRecord) {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - No existing subscription found, creating new subscription record');
      try {
        subscriptionRecord = await Subscription.create({
          user: user._id,
          plan: subscription.items.data[0].price.id,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          price: subscription.items.data[0].price.unit_amount || 0,
        });
        console.log('app/api/appointments/payment/confirm-subscription/route.ts - Created new subscription record:', JSON.stringify(subscriptionRecord.toObject(), null, 2));
      } catch (createError) {
        console.log('app/api/appointments/payment/confirm-subscription/route.ts - Error creating subscription record:', createError);
        // If creation fails due to duplicate key, try to find it again
        if (createError.code === 11000) {
          console.log('app/api/appointments/payment/confirm-subscription/route.ts - Duplicate key error, trying to find existing subscription');
          subscriptionRecord = await Subscription.findOne({
            stripeSubscriptionId: subscription.id
          });
          console.log('app/api/appointments/payment/confirm-subscription/route.ts - Found existing subscription after duplicate error:', subscriptionRecord ? 'Yes' : 'No');
        } else {
          throw createError;
        }
      }
    } else {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Found existing subscription record:', JSON.stringify(subscriptionRecord.toObject(), null, 2));
    }

    // Update appointment status if not already completed
    if (appointment.paymentStatus !== 'completed') {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Updating appointment payment status to completed');
      const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {
        paymentStatus: "completed",
        status: "pending_match", // Use new status system
        paidAt: new Date(),
        paymentMethod: "card",
        subscriptionId: subscriptionRecord?._id || subscription.id,
        checkoutSessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
      }, { new: true });

      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Updated appointment:', JSON.stringify(updatedAppointment?.toObject(), null, 2));
    } else {
      console.log('app/api/appointments/payment/confirm-subscription/route.ts - Appointment payment status already completed, skipping update');
    }

    console.log('=== app/api/appointments/payment/confirm-subscription/route.ts - POST END ===');
    return NextResponse.json({ 
      success: true,
      message: "Payment processed successfully"
    });

  } catch (err) {
    console.error("app/api/appointments/payment/confirm-subscription/route.ts - Subscription confirmation error:", err);
    console.log('=== app/api/appointments/payment/confirm-subscription/route.ts - POST END WITH ERROR ===');
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}