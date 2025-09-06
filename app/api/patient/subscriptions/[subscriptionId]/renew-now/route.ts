import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Subscription from '@/lib/db/models/Subscription';
import User from '@/lib/db/models/User';
import Plan from '@/lib/db/models/Plan';
import Balance from '@/lib/db/models/Balance';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any,
});

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
    
    // 1. Get the current subscription
    const currentSubscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionId,
      user: session.user.id
    }).populate('user');

    if (!currentSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found or not authorized' },
        { status: 404 }
      );
    }

    // 2. Get the user and their Stripe customer ID
    const user = await User.findById(session.user.id);
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'User not found or no Stripe customer ID' },
        { status: 404 }
      );
    }

    // 3. Get the current subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const productId = stripeSubscription.items.data[0].price.product;
    const product = await stripe.products.retrieve(productId as string);

    // 4. Extract the actual plan name from Stripe product name
    // Stripe product name format: "Therapy Plan: Monthly Care Plan (1 session/week)"
    // We need to extract: "Monthly Care Plan (1 session/week)"
    const planName = product.name.replace(/^Therapy Plan:\s*/, '');
    
    console.log('Renew Now - Stripe product name:', product.name);
    console.log('Renew Now - Extracted plan name:', planName);

    // 5. Find the matching plan in our database
    const matchingPlan = await Plan.findOne({
      title: planName,
      subscribtion: 'monthly'
    });
    
    // Debug: Log available plans for troubleshooting
    if (!matchingPlan) {
      const availablePlans = await Plan.find({ subscribtion: 'monthly' }).select('title type');
      console.log('Renew Now - Available monthly plans:', availablePlans.map(p => ({ title: p.title, type: p.type })));
    }

    if (!matchingPlan) {
      return NextResponse.json(
        { error: `No matching plan found for product "${product.name}" (extracted: "${planName}")` },
        { status: 404 }
      );
    }

    // 6. Create a checkout session for immediate payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{
        price: stripeSubscription.items.data[0].price.id,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payments/success?type=renew_now&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/patient`,
      metadata: {
        userId: user._id.toString(),
        planId: matchingPlan._id.toString(),
        renewedFrom: subscriptionId,
        type: 'renew_now'
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          planId: matchingPlan._id.toString(),
          renewedFrom: subscriptionId,
          type: 'renew_now'
        }
      }
    });

    // 7. Return checkout session URL for immediate payment
    return NextResponse.json({ 
      success: true,
      checkoutUrl: checkoutSession.url,
      message: 'Redirecting to payment...'
    });

  } catch (error) {
    console.error('Error renewing subscription now:', error);
    return NextResponse.json(
      { error: 'Failed to renew subscription. Please try again.' },
      { status: 500 }
    );
  }
}
