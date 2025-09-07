import Balance from '@/lib/db/models/Balance';
import Subscription from '@/lib/db/models/Subscription';
import Plan from '@/lib/db/models/Plan';
import stripe from '@/lib/stripe';
import connectDB from '../db/connect';

function getSessionsFromPlanType(planType: string): number {
  switch (planType) {
    case 'x2_sessions': return 2;
    case 'x3_sessions': return 3;
    case 'x4_sessions': return 4;
    case 'x5_sessions': return 5;
    case 'x6_sessions': return 6;
    case 'x7_sessions': return 7;
    case 'x8_sessions': return 8;
    case 'x9_sessions': return 9;
    case 'x10_sessions': return 10;
    case 'x11_sessions': return 11;
    case 'x12_sessions': return 12;
    default: return 1; // Fallback to single session
  }
}

export async function subscriptionTopupBalance(subscriptionId: string) {
  await connectDB();

  try {
    // 1. Retrieve Stripe subscription details
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const productId = stripeSubscription.items.data[0].price.product;

    // 2. Get product details
    const product = await stripe.products.retrieve(productId as string);

    // 3. Find matching plan in our database
    const matchingPlan = await Plan.findOne({
      title: product.name,
      subscribtion: 'monthly'
    });

    if (!matchingPlan) {
      throw new Error(`No matching plan found for product "${product.name}"`);
    }

    // 4. Get session count using the safer switch approach
    const sessionsToAdd = getSessionsFromPlanType(matchingPlan.type);

    // 5. Find local subscription and user
    const subscription = await Subscription.findOne({ 
      stripeSubscriptionId: subscriptionId 
    }).populate('user');

    if (!subscription) {
      throw new Error('Local subscription record not found');
    }

    // 6. Update or create balance
    let balance = await Balance.findOne({ user: subscription.user._id });
    if (!balance) {
      balance = new Balance({ user: subscription.user._id });
    }

    // 7. Update balance
    balance.totalSessions += sessionsToAdd;

    // 8. Record history
    balance.history.push({
      action: 'added',
      sessions: sessionsToAdd,
      plan: matchingPlan.title, // Use plan title instead of plan ID
      reason: `Subscription renewal - ${product.name}`,
      createdAt: new Date()
    });

    // 9. Record payment
    balance.payments.push({
      paymentId: subscriptionId,
      amount: stripeSubscription.items.data[0].price.unit_amount / 100,
      currency: stripeSubscription.items.data[0].price.currency,
      date: new Date(),
      planId: matchingPlan._id,
      sessionsAdded: sessionsToAdd,
      paymentType: 'subscription',
      receiptUrl: `https://dashboard.stripe.com/subscriptions/${subscriptionId}`
    });

    await balance.save();

    // 10. Update subscription dates
    await Subscription.updateOne(
      { stripeSubscriptionId: subscriptionId },
      {
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        status: stripeSubscription.status
      }
    );

    return {
      success: true,
      sessionsAdded: sessionsToAdd,
      newBalance: balance.totalSessions,
      message: `Added ${sessionsToAdd} sessions from ${product.name} subscription`
    };

  } catch (error) {
    console.error('Subscription topup failed:', error);
    throw error;
  }
}