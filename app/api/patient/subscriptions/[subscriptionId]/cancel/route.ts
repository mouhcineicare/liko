import { NextResponse } from "next/server";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db/connect";
import Subscription from "@/lib/db/models/Subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any,
});

export async function POST(
  request: Request,
  { params }: { params: { subscriptionId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscriptionId } = params;

  try {
    await connectDB();
    
    // Verify the subscription belongs to the user
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionId,
      user: session.user.id,
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found for this user" },
        { status: 404 }
      );
    }

    // Cancel the subscription in Stripe
    const cancelledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Update the subscription in our database
    await Subscription.updateOne(
      { stripeSubscriptionId: subscriptionId },
      {
        $set: {
          status: cancelledSubscription.status,
          cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Subscription will be cancelled at the end of the current period",
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}