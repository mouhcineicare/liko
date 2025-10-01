import Balance from '@/lib/db/models/Balance';
import Subscription from '@/lib/db/models/Subscription';
import Plan from '@/lib/db/models/Plan';
import stripe from '@/lib/stripe';
import connectDB from '../db/connect';

// This function is no longer needed - we'll use the plan price directly

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

    // 4. Get the amount to add to balance (plan price in AED)
    const amountToAdd = matchingPlan.price;

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
    balance.balanceAmount += amountToAdd;

    // 8. Record history
    balance.history.push({
      action: 'added',
      amount: amountToAdd,
      plan: matchingPlan.title,
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
      amountAdded: amountToAdd,
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
      amountAdded: amountToAdd,
      newBalance: balance.balanceAmount,
      message: `Added ${amountToAdd} AED from ${product.name} subscription`
    };

  } catch (error) {
    console.error('Subscription topup failed:', error);
    throw error;
  }
}