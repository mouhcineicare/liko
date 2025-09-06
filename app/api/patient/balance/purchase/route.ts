import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import Appointment from "@/lib/db/models/Appointment";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { v4 as uuidv4 } from 'uuid';
import Stripe from "stripe";
import stripe from "@/lib/stripe";


const baseUrl = process.env.BASE_URL || 'https://app.icarewellbeing.com';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessions, price, isSameDayBooking, appointmentId, newDate, sessionToBeReduced, sessionIndex, selectedSlot, payRemainingOnly, payFully } = await req.json();
    
    if (!sessions || !price) {
      return NextResponse.json(
        { error: "Sessions and price are required" },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Get appointment details for checkout display
    let appointmentDetails = null;
    if (payFully && appointmentId) {
      try {
        const appointment = await Appointment.findById(appointmentId).populate('therapist', 'fullName');
        if (appointment) {
          appointmentDetails = {
            date: appointment.date,
            therapist: appointment.therapist?.fullName || 'Therapist to be assigned',
            plan: appointment.plan,
            therapyType: appointment.therapyType
          };
        }
      } catch (error) {
        console.error('Error fetching appointment details:', error);
      }
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customer: Stripe.Customer;
    if (!user.stripeCustomerId) {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user._id.toString() }
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    } else {
      customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
    }

    // Update success and cancel URLs to use your existing pages with type parameter
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "aed",
          product_data: {
            name: payFully && appointmentDetails 
              ? `Therapy Session - ${appointmentDetails.therapist}`
              : payFully 
                ? `Book ${sessions} Therapy Session${sessions > 1 ? 's' : ''}`
                : `${sessions} Therapy Session${sessions > 1 ? 's' : ''}`,
            description: payFully && appointmentDetails
              ? `Therapy session with ${appointmentDetails.therapist} on ${new Date(appointmentDetails.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} at ${new Date(appointmentDetails.date).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} - ${appointmentDetails.plan}`
              : payFully 
                ? `Book your selected therapy session${sessions > 1 ? 's' : ''} - ${sessions} session${sessions > 1 ? 's' : ''}`
                : payRemainingOnly
                  ? `Pay remaining amount for your selected session${sessions > 1 ? 's' : ''} - ${sessions} session${sessions > 1 ? 's' : ''}`
                  : `Top-up your therapy session balance with ${sessions} session${sessions > 1 ? 's' : ''}`,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: payFully 
        ? `${baseUrl}/payments/success?type=appointment&session_id={CHECKOUT_SESSION_ID}&appointmentId=${appointmentId}`
        : `${baseUrl}/payments/success?type=package&session_id={CHECKOUT_SESSION_ID}&sessions=${sessions}`,
      cancel_url: `${baseUrl}/payments/cancel?type=${payFully ? 'appointment' : 'package'}`,
      metadata: {
        userId: user._id.toString(),
        type: payFully ? 'appointment_payment' : (isSameDayBooking ? 'same_day_booking' : 'session_purchase'),
        sessions: sessions.toString(),
        isSameDayBooking: isSameDayBooking?.toString() || 'false',
        appointmentId: appointmentId || '',
        newDate: newDate || '',
        selectedSlot: selectedSlot ? JSON.stringify(selectedSlot) : '',
        sessionToBeReduced: sessionToBeReduced?.toString() || 'false',
        sessionIndex: sessionIndex?.toString() || '',
        payRemainingOnly: payRemainingOnly?.toString() || 'false',
        payFully: payFully?.toString() || 'false',
        idempotencyKey: uuidv4()
      },
      customer: customer.id,
      payment_intent_data: {
        metadata: {
          userId: user._id.toString(),
          sessions: sessions.toString(),
          type: isSameDayBooking ? 'same_day_booking' : 'session_purchase',
          isSameDayBooking: isSameDayBooking?.toString() || 'false'
        }
      },
    });

    return NextResponse.json({ url: stripeSession.url });

  } catch (error: any) {
    console.error("Session purchase error:", error);
    return NextResponse.json(
      { error: error.message || "Error processing payment" },
      { status: 500 }
    );
  }
}