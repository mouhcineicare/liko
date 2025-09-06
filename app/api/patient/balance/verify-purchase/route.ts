import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Balance from "@/lib/db/models/Balance";
import User from "@/lib/db/models/User";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import stripe from "@/lib/stripe";

const DEFAULT_BALANCE_RATE = 90; // Static rate of 90 AED per session

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify the Stripe session
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });

    // Check if payment was successful
    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 402 }
      );
    }

    // Calculate sessions based on payment amount and default rate
    const amountPaid = stripeSession.amount_total ? stripeSession.amount_total / 100 : 0; // Convert from cents to AED
    const sessionsToAdd = parseFloat((amountPaid / DEFAULT_BALANCE_RATE).toFixed(2)); // Calculate with 2 decimal places

    if (sessionsToAdd <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // Verify the user exists
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the balance
    const updatedBalance = await Balance.findOneAndUpdate(
      { user: session.user.id },
      { 
        $inc: { totalSessions: sessionsToAdd },
        $push: {
          history: {
            action: 'added',
            sessions: sessionsToAdd,
            reason: 'Session package purchase',
            createdAt: new Date(),
            price: amountPaid // Store the actual amount paid
          },
          payments: {
            paymentId: stripeSession.payment_intent?.toString() || stripeSession.id,
            amount: amountPaid,
            currency: stripeSession.currency?.toUpperCase() || 'AED',
            date: new Date(),
            sessionsAdded: sessionsToAdd,
            paymentType: 'checkout_session'
          }
        }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      newBalance: updatedBalance.totalSessions,
      sessionsAdded: sessionsToAdd,
      amountPaid: amountPaid,
      rateUsed: DEFAULT_BALANCE_RATE
    });

  } catch (error: any) {
    console.error("Balance verification error:", error);
    return NextResponse.json(
      { error: error.message || "Error verifying purchase" },
      { status: 500 }
    );
  }
}