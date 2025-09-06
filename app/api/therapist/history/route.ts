import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Base query for completed appointments
    let query: any = {
      therapist: session.user.id,
      status: 'completed'
    };

    // Get total count
    const totalCount = await Appointment.countDocuments(query);

    // Get appointments with patient and payment details
    const appointments = await Appointment.find(query)
      .populate('patient', 'fullName email telephone image')
      .populate('therapist', 'fullName image')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enhance with payment and Stripe data
    const enhancedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        // Get therapist payments for this appointment
        const payments = await TherapistPayment.find({
          appointments: appointment._id
        }).sort({ createdAt: -1 });

        // Get Stripe data if available
        let stripeData = null;
        if (appointment.checkoutSessionId) {
          try {
            const session = await stripe.checkout.sessions.retrieve(
              appointment.checkoutSessionId,
              { expand: ['payment_intent', 'subscription'] }
            );
            
            stripeData = {
              paymentStatus: session.payment_status || 'none',
              subscriptionStatus: session.subscription ? 
                (typeof session.subscription === 'string' ? 
                  (await stripe.subscriptions.retrieve(session.subscription)).status : 
                  session.subscription.status) : 'none',
              verified: session.payment_status === 'paid'
            };
          } catch (error) {
            console.error(`Error fetching Stripe session:`, error);
            stripeData = {
              paymentStatus: 'error',
              subscriptionStatus: 'error',
              verified: false
            };
          }
        }

        return {
          ...appointment,
          payments,
          stripeData
        };
      })
    );

    return NextResponse.json({
      appointments: enhancedAppointments,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      }
    });
  } catch (error) {
    console.error("Error fetching appointment history:", error);
    return NextResponse.json(
      { error: "Error fetching appointment history" },
      { status: 500 }
    );
  }
}