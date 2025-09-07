import { NextResponse } from "next/server";
import Stripe from "stripe";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { Plan } from "@/lib/db/models";
import { v4 as uuidv4 } from 'uuid';
import { getOrCreateStripeCustomerId } from "@/lib/stripe/customerManagement";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any,
});

// Use localhost for development, production URL for production
const baseUrl = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000' 
  : (process.env.BASE_URL || 'https://app.icarewellbeing.com');
console.log('Payment endpoint - NODE_ENV:', process.env.NODE_ENV);
console.log('Payment endpoint - BASE_URL:', baseUrl);

export async function POST(req: Request) {
  console.log('=== app/api/appointments/payment/route.ts - POST START ===');
  const userSession = await getServerSession(authOptions);

  // Check authentication
  if (!userSession?.user?.id) {
    console.log('app/api/appointments/payment/route.ts - Error: User not authenticated');
    return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
  }

  // Check required environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('app/api/appointments/payment/route.ts - Error: STRIPE_SECRET_KEY not configured');
    return NextResponse.json({ error: "Stripe configuration missing" }, { status: 500 });
  }

  if (!process.env.BASE_URL) {
    console.log('app/api/appointments/payment/route.ts - Warning: BASE_URL not configured, using default');
  }

  try {
    const requestBody = await req.json();
    console.log('app/api/appointments/payment/route.ts - Request body:', JSON.stringify(requestBody, null, 2));
    
    const { appointmentId } = requestBody;

    if (!appointmentId) {
      console.log('app/api/appointments/payment/route.ts - Error: Appointment ID is required');
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    console.log('app/api/appointments/payment/route.ts - Processing payment for appointmentId:', appointmentId);

    // Connect to database
    try {
      await connectDB();
      console.log('app/api/appointments/payment/route.ts - Database connected successfully');
    } catch (dbError) {
      console.error('app/api/appointments/payment/route.ts - Database connection error:', dbError);
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.log('app/api/appointments/payment/route.ts - Error: Appointment not found for ID:', appointmentId);
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Validate appointment belongs to user
    if (appointment.patient.toString() !== userSession.user.id) {
      console.log('app/api/appointments/payment/route.ts - Error: Appointment does not belong to user');
      return NextResponse.json({ error: "Unauthorized access to appointment" }, { status: 403 });
    }

    console.log('app/api/appointments/payment/route.ts - Found appointment:', JSON.stringify(appointment.toObject(), null, 2));

    if (appointment.price === 0) {
      console.log('app/api/appointments/payment/route.ts - Processing free appointment (price = 0)');
      const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {
        paymentStatus: 'completed',
        status: 'confirmed',
        paymentMethod: 'free',
        paidAt: new Date(),
      }, { new: true });

      console.log('app/api/appointments/payment/route.ts - Free appointment updated:', JSON.stringify(updatedAppointment?.toObject(), null, 2));

      return NextResponse.json({
        success: true,
        appointment: updatedAppointment,
        message: "Free appointment created successfully",
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('app/api/appointments/payment/route.ts - Error: Stripe secret key not configured');
      throw new Error('Stripe secret key not configured');
    }

    const patient = await User.findById(appointment.patient);
    if (!patient) {
      console.log('app/api/appointments/payment/route.ts - Error: Patient not found for ID:', appointment.patient);
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    console.log('app/api/appointments/payment/route.ts - Found patient:', JSON.stringify({
      _id: patient._id,
      email: patient.email,
      fullName: patient.fullName,
      stripeCustomerId: patient.stripeCustomerId
    }, null, 2));

    // Try to find plan by title first, then by type if not found
    let plan = await Plan.findOne({ title: appointment.plan });
    if (!plan) {
      console.log('app/api/appointments/payment/route.ts - Plan not found by title, trying by type:', appointment.plan);
      // Try to find by planType if available
      if (appointment.planType) {
        plan = await Plan.findOne({ type: appointment.planType });
      }
    }
    
    // Handle rebooking appointments - create a dynamic plan if needed
    if (!plan && (appointment.plan === 'Purchased From Rebooking' || appointment.plan === 'Single Online Therapy Session')) {
      console.log('app/api/appointments/payment/route.ts - Creating dynamic plan for rebooking appointment');
      // Create a dynamic plan for rebooking appointments
      plan = {
        _id: 'rebooking-plan',
        title: appointment.plan,
        type: 'single_session',
        price: appointment.price,
        subscribtion: 'one_time', // Changed from 'single' to 'one_time' for one-time payment
        therapyType: appointment.therapyType || 'individual',
        description: 'Rebooking session purchase'
      } as any;
    }
    
    if (!plan) {
      console.log('app/api/appointments/payment/route.ts - Error: Plan not found for title:', appointment.plan, 'or type:', appointment.planType);
      console.log('app/api/appointments/payment/route.ts - Available plans in database:');
      const allPlans = await Plan.find({}, 'title type price');
      console.log(JSON.stringify(allPlans, null, 2));
      return NextResponse.json({ 
        error: "Plan not found", 
        details: `No plan found for "${appointment.plan}" or type "${appointment.planType}"`,
        availablePlans: allPlans.map(p => ({ title: p.title, type: p.type, price: p.price }))
      }, { status: 404 });
    }

    console.log('app/api/appointments/payment/route.ts - Found plan:', JSON.stringify({
      _id: plan._id,
      title: plan.title,
      price: plan.price,
      subscribtion: plan.subscribtion,
      stripeProductId: plan.stripeProductId,
      stripePriceId: plan.stripePriceId
    }, null, 2));

    // Use centralized customer ID management
    console.log('app/api/appointments/payment/route.ts - Getting or creating customer ID');
    const customerResult = await getOrCreateStripeCustomerId(
      patient._id.toString(),
      patient.email,
      patient.fullName
    );

    if (customerResult.error) {
      console.log('app/api/appointments/payment/route.ts - Error getting customer ID:', customerResult.error);
      return NextResponse.json({ error: customerResult.error }, { status: 500 });
    }

    console.log('app/api/appointments/payment/route.ts - Customer ID result:', {
      customerId: customerResult.customerId,
      isNew: customerResult.isNew
    });

    // Retrieve the customer from Stripe
    const customer = await stripe.customers.retrieve(customerResult.customerId) as Stripe.Customer;
    console.log('app/api/appointments/payment/route.ts - Retrieved customer:', JSON.stringify({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      metadata: customer.metadata
    }, null, 2));

    // Handle subscription payments
    if (plan.subscribtion === 'monthly') {
      console.log('app/api/appointments/payment/route.ts - Processing subscription payment');
      
      // Create or retrieve product
      if (!plan.stripeProductId) {
        console.log('app/api/appointments/payment/route.ts - Creating new Stripe product for plan:', plan.title);
        const product = await stripe.products.create({
          name: `Therapy Plan: ${plan.title}`,
          description: plan.description || `Monthly subscription for ${plan.title} therapy plan`,
        });
        console.log('app/api/appointments/payment/route.ts - Created new Stripe product:', JSON.stringify({
          id: product.id,
          name: product.name,
          description: product.description
        }, null, 2));
        
        plan.stripeProductId = product.id;
        await plan.save();
        console.log('app/api/appointments/payment/route.ts - Updated plan with new stripeProductId:', product.id);
      }

      // Create or retrieve price
      let priceId = plan.stripePriceId;
      if (!priceId) {
        console.log('app/api/appointments/payment/route.ts - Creating new Stripe price for product:', plan.stripeProductId);
        const price = await stripe.prices.create({
          product: plan.stripeProductId,
          unit_amount: Math.round(plan.price * 100),
          currency: 'aed',
          recurring: { interval: 'month' },
        });
        console.log('app/api/appointments/payment/route.ts - Created new Stripe price:', JSON.stringify({
          id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring
        }, null, 2));
        
        priceId = price.id;
        plan.stripePriceId = price.id;
        await plan.save();
        console.log('app/api/appointments/payment/route.ts - Updated plan with new stripePriceId:', price.id);
      }

      // Determine payment mode based on plan type
      const isOneTimePayment = plan.subscribtion === 'one_time' || plan.type === 'single_session';
      
      if (isOneTimePayment) {
        // Create one-time payment session for rebook sessions
        console.log('app/api/appointments/payment/route.ts - Creating Stripe checkout session for one-time payment');
        console.log('Rebook session appointment data:', {
          plan: appointment.plan,
          recurring: appointment.recurring,
          recurringLength: appointment.recurring ? appointment.recurring.length : 0,
          sessionCount: appointment.sessionCount,
          totalSessions: appointment.totalSessions,
          date: appointment.date
        });
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: 'aed',
              product_data: {
                name: appointment.recurring && appointment.recurring.length > 0 
                  ? `Recurring Therapy Sessions - ${appointment.sessionCount || (appointment.recurring.length + 1)} Sessions Package`
                  : plan.title,
                description: (() => {
                  if (appointment.recurring && appointment.recurring.length > 0) {
                    const mainSessionDate = new Date(appointment.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const mainSessionTime = new Date(appointment.date).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    });
                    
                    let description = `Session 1: ${mainSessionDate} at ${mainSessionTime}`;
                    
                    appointment.recurring.forEach((session: any, index: number) => {
                      const sessionDate = new Date(session.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      });
                      const sessionTime = new Date(session.date).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      });
                      description += `\nSession ${index + 2}: ${sessionDate} at ${sessionTime}`;
                    });
                    
                    return description;
                  } else {
                    return plan.description || 'Rebooking session purchase';
                  }
                })(),
              },
              unit_amount: Math.round(plan.price * 100)
            },
            quantity: 1
          }],
          mode: "payment",
          success_url: `${baseUrl}/payments/success?type=appointment&session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}&sessions=${appointment.sessionCount || appointment.totalSessions || (appointment.recurring ? appointment.recurring.length + 1 : 1)}`,
          cancel_url: `${baseUrl}/payments/canceled?appointmentId=${appointmentId}`,
          metadata: {
            appointmentId: appointmentId.toString(),
            userId: patient._id.toString(),
            type: 'one_time_payment',
            idempotencyKey: uuidv4()
          },
          customer: customer.id,
        });
        
        console.log('app/api/appointments/payment/route.ts - Created one-time payment checkout session:', JSON.stringify({
          id: session.id,
          mode: session.mode,
          success_url: session.success_url
        }, null, 2));
        
        return NextResponse.json({ redirectUrl: session.url });
      } else {
        // Create subscription session
        console.log('app/api/appointments/payment/route.ts - Creating Stripe checkout session for subscription');
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
          success_url: `${baseUrl}/payments/success?type=appointment&session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}&sessions=${appointment.sessionCount || appointment.totalSessions || (appointment.recurring ? appointment.recurring.length + 1 : 1)}`,
          cancel_url: `${baseUrl}/payments/canceled?appointmentId=${appointmentId}`,
          metadata: {
            appointmentId: appointmentId.toString(),
            userId: patient._id.toString(),
            type: 'subscription',
            idempotencyKey: uuidv4() // Add unique idempotency key
          },
          customer: customer.id,
          subscription_data: {
            metadata: {
              appointmentId: appointmentId.toString(),
              userId: patient._id.toString(),
              planId: plan._id.toString() // Add plan ID to subscription metadata
            },
          },
        });
        
        console.log('app/api/appointments/payment/route.ts - Created subscription checkout session:', JSON.stringify({
        id: session.id,
        url: session.url,
        mode: session.mode,
        metadata: session.metadata,
        customer: session.customer
      }, null, 2));

      // Only mark payment as pending and store session; do not change acceptance
      console.log('app/api/appointments/payment/route.ts - Updating appointment with checkout session ID');
      
      // Check if this is a rebook session - preserve confirmed status
      const isRebookSession = appointment.plan === 'Purchased From Rebooking' || appointment.plan === 'Single Online Therapy Session';
      const statusToSet = isRebookSession && appointment.status === 'confirmed' ? 'confirmed' : 'pending_match';
      
      console.log('app/api/appointments/payment/route.ts - Status logic:', {
        isRebookSession,
        currentStatus: appointment.status,
        statusToSet
      });
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {
        checkoutSessionId: session.id,
        paymentStatus: "pending",
        status: statusToSet,
        $push: {
          paymentAttempts: {
            amount: appointment.price,
            currency: 'AED',
            status: 'pending_match',
            stripeSessionId: session.id,
            createdAt: new Date()
          }
        }
      }, { new: true });

      console.log('app/api/appointments/payment/route.ts - Updated appointment with session data:', JSON.stringify(updatedAppointment?.toObject(), null, 2));

        return NextResponse.json({ redirectUrl: session.url });
      }
    }

    // Handle one-time payments (legacy - for non-rebook sessions)
    console.log('app/api/appointments/payment/route.ts - Processing one-time payment');
    console.log('Appointment data for Stripe checkout:', {
      plan: appointment.plan,
      recurring: appointment.recurring,
      recurringLength: appointment.recurring ? appointment.recurring.length : 0,
      sessionCount: appointment.sessionCount,
      totalSessions: appointment.totalSessions,
      date: appointment.date
    });
    
    // Calculate session count for success URL
    const sessionCount = appointment.sessionCount || appointment.totalSessions || 
                        (appointment.recurring ? appointment.recurring.length + 1 : 1);
    
    const successUrl = `${baseUrl}/payments/success?type=appointment&session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}&sessions=${sessionCount}`;
    const cancelUrl = `${baseUrl}/payments/canceled?appointmentId=${appointmentId}`;
    console.log('Generated success URL:', successUrl);
    console.log('Generated cancel URL:', cancelUrl);
    console.log('Session count for success URL:', sessionCount);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "aed",
          product_data: {
            name: appointment.recurring && appointment.recurring.length > 0 
              ? `Recurring Therapy Sessions - ${appointment.sessionCount || (appointment.recurring.length + 1)} Sessions Package`
              : `Therapy Appointment - ${appointment.plan}`,
            description: (() => {
              if (appointment.recurring && appointment.recurring.length > 0) {
                const sessionCount = appointment.sessionCount || (appointment.recurring.length + 1);
                const mainSessionDate = new Date(appointment.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                });
                const mainSessionTime = new Date(appointment.date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                });
                
                let description = `Session 1: ${mainSessionDate} at ${mainSessionTime}`;
                
                appointment.recurring.forEach((session: any, index: number) => {
                  const sessionDate = new Date(session.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const sessionTime = new Date(session.date).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  });
                  description += `\nSession ${index + 2}: ${sessionDate} at ${sessionTime}`;
                });
                
                return description;
              } else {
                return `Session with your therapist on ${new Date(appointment.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })} at ${new Date(appointment.date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}`;
              }
            })(),
          },
          unit_amount: Math.round(appointment.price * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        appointmentId: appointmentId.toString(),
        userId: patient._id.toString(),
        type: 'payment'
      },
      customer: customer.id,
      payment_intent_data: {
        setup_future_usage: 'off_session',
        metadata: {
          appointmentId: appointmentId.toString(),
          userId: patient._id.toString(),
          // Do not attempt to inject session_id placeholder; use appointmentId for linking
        }
      },
    });

    console.log('app/api/appointments/payment/route.ts - Created one-time payment checkout session:', JSON.stringify({
      id: session.id,
      url: session.url,
      mode: session.mode,
      metadata: session.metadata,
      customer: session.customer,
      payment_intent_data: session.payment_intent_data
    }, null, 2));

    console.log('app/api/appointments/payment/route.ts - Updating appointment with checkout session ID');
    
    // Check if this is a rebook session - preserve confirmed status
    const isRebookSession = appointment.plan === 'Purchased From Rebooking' || appointment.plan === 'Single Online Therapy Session';
    const statusToSet = isRebookSession && appointment.status === 'confirmed' ? 'confirmed' : 'pending';
    
    console.log('app/api/appointments/payment/route.ts - Status logic:', {
      isRebookSession,
      currentStatus: appointment.status,
      statusToSet
    });
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(appointmentId, {
      checkoutSessionId: session.id,
      paymentStatus: "pending",
      status: statusToSet, // Preserve confirmed status for rebooking
    }, { new: true });

    console.log('app/api/appointments/payment/route.ts - Updated appointment with session data:', JSON.stringify(updatedAppointment?.toObject(), null, 2));

    console.log('=== app/api/appointments/payment/route.ts - POST END ===');
    return NextResponse.json({ redirectUrl: session.url });

  } catch (error: any) {
    console.error("app/api/appointments/payment/route.ts - Checkout error:", error);
    console.log('=== app/api/appointments/payment/route.ts - POST END WITH ERROR ===');
    return NextResponse.json(
      {
        error: error.message || "Error processing appointment",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}