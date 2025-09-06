import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any,
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appointmentId = params.id;
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    await connectDB();

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Verify the appointment belongs to the user
    if (appointment.patient.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized access to appointment" }, { status: 403 });
    }

    // If already completed by webhook, return success (prevent race condition)
    if (appointment.paymentStatus === 'completed' && appointment.isStripeVerified) {
      console.log('Payment already processed by webhook, skipping fix-payment');
      return NextResponse.json({ 
        success: true, 
        message: "Payment already processed by webhook",
        alreadyProcessed: true,
        appointment: {
          paymentStatus: appointment.paymentStatus,
          status: appointment.status,
          isStripeVerified: appointment.isStripeVerified
        }
      });
    }

    // Verify the Stripe session
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error('Error retrieving Stripe session:', error);
      return NextResponse.json({ 
        success: false, 
        error: "Could not verify payment with Stripe" 
      }, { status: 400 });
    }

    // Check if payment was successful
    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json({ 
        success: false, 
        error: "Payment not completed in Stripe" 
      }, { status: 400 });
    }

    // Update the appointment - use consistent status for new customers
    const updateData = {
      paymentStatus: 'completed',
      status: 'pending_match', // Consistent with webhook - new customers go to pending_match
      isStripeVerified: true,
      paidAt: new Date(),
      paymentMethod: 'card',
      checkoutSessionId: sessionId,
      $push: {
        paymentHistory: {
          amount: appointment.price || 110,
          currency: 'AED',
          status: 'completed',
          paymentMethod: 'card',
          stripeSessionId: sessionId,
          createdAt: new Date()
        }
      }
    };

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    );

    console.log('=== FIX-PAYMENT: Payment status fixed successfully ===');
    console.log('Appointment ID:', appointmentId);
    console.log('Payment Status: completed');
    console.log('Appointment Status: pending_match');
    console.log('Stripe Verified: true');
    console.log('Updated appointment:', {
      _id: updatedAppointment._id,
      paymentStatus: updatedAppointment.paymentStatus,
      status: updatedAppointment.status,
      isStripeVerified: updatedAppointment.isStripeVerified,
      checkoutSessionId: updatedAppointment.checkoutSessionId
    });
    console.log('=== FIX-PAYMENT: Processing complete ===');

    return NextResponse.json({ 
      success: true, 
      message: "Payment status updated successfully",
      appointment: {
        paymentStatus: updatedAppointment.paymentStatus,
        isStripeVerified: updatedAppointment.isStripeVerified,
        checkoutSessionId: updatedAppointment.checkoutSessionId,
        paidAt: updatedAppointment.paidAt
      }
    });

  } catch (error) {
    console.error('Error fixing payment status:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
