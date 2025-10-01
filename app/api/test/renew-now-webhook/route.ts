import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Stripe from 'stripe';
import Balance from '@/lib/db/models/Balance';
import Plan from '@/lib/db/models/Plan';
import Subscription from '@/lib/db/models/Subscription';

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { checkoutSessionId } = await request.json();
    
    if (!checkoutSessionId) {
      return NextResponse.json({ error: 'Checkout session ID required' }, { status: 400 });
    }

    console.log('=== MANUAL RENEW NOW WEBHOOK TEST ===');
    console.log('Checkout session ID:', checkoutSessionId);

    await connectDB();

    // Get the checkout session from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    console.log('Stripe session:', stripeSession);

    if (stripeSession.metadata?.type !== 'renew_now') {
      return NextResponse.json({ error: 'Not a renew_now session' }, { status: 400 });
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSession.subscription as string);
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
      return NextResponse.json({ error: `No matching plan found for product "${product.name}"` }, { status: 404 });
    }

    // Get user ID from metadata
    const userId = stripeSession.metadata?.userId;
    const renewedFrom = stripeSession.metadata?.renewedFrom;

    if (!userId || !renewedFrom) {
      console.error('Missing required metadata for renew_now');
      return NextResponse.json({ error: 'Missing required metadata for renew_now payment' }, { status: 400 });
    }

    console.log('Processing renew_now for user:', userId, 'renewed from:', renewedFrom);

    // Credit amount to user's balance
    const amountToAdd = matchingPlan.price;
    console.log('Amount to add:', amountToAdd);

    let balance = await Balance.findOne({ user: userId });
    if (!balance) {
      balance = new Balance({ user: userId });
    }

    // Update balance
    balance.balanceAmount += amountToAdd;

    // Record history
      balance.history.push({
        action: 'added',
        amount: amountToAdd,
        plan: matchingPlan.title,
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
      amountAdded: amountToAdd,
      paymentType: 'renew_now',
      receiptUrl: `https://dashboard.stripe.com/subscriptions/${subscription.id}`
    });

    await balance.save();
    console.log('Balance updated for user:', userId, 'new balance amount:', balance.balanceAmount);

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
    console.log('=== MANUAL RENEW NOW WEBHOOK TEST END ===');

    return NextResponse.json({ 
      success: true, 
      message: `Successfully added ${sessionsToAdd} sessions to balance`,
      sessionsAdded: sessionsToAdd,
      newTotalSessions: balance.totalSessions
    });

  } catch (error) {
    console.error('Error in manual renew_now webhook test:', error);
    return NextResponse.json(
      { error: 'Failed to process renew_now payment' },
      { status: 500 }
    );
  }
}
