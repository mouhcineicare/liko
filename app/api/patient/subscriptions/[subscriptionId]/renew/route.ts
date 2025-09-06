// app/api/patient/subscriptions/[subscriptionId]/renew/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Subscription from '@/lib/db/models/Subscription';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any,
});

export async function POST(
  request: Request,
  { params }: { params: { subscriptionId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscriptionId } = params;

  try {
    await connectDB();
    
    // Verify the subscription belongs to the user
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionId,
      user: session.user.id
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found or not authorized' },
        { status: 404 }
      );
    }

    // Update the subscription in Stripe
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    // Update in our database
    await Subscription.findByIdAndUpdate(
      subscription._id,
      { 
        status: updatedSubscription.status,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
      }
    );

    return NextResponse.json({ 
      success: true,
      subscription: {
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        plan: subscription.plan,
        price: subscription.price
      }
    });

  } catch (error) {
    console.error('Error renewing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to renew subscription' },
      { status: 500 }
    );
  }
}