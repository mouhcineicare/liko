import Stripe from "stripe";
import User from "@/lib/db/models/User";
import Plan from "@/lib/db/models/Plan";
import Subscription from "@/lib/db/models/Subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2020-08-27" as any,
});

export async function createSubscription(
  userId: string,
  planId: string
): Promise<{ subscriptionId: string; clientSecret: string }> {
  const user = await User.findById(userId);
  const plan = await Plan.findById(planId);

  if (!user || !plan) {
    throw new Error("User or Plan not found");
  }

  if (plan.subscription !== "monthly") {
    throw new Error("Selected plan is not a subscription plan");
  }

  // Create or retrieve Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { userId: user._id.toString() },
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  // Create subscription in Stripe with proper typing
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{
      price: plan.stripePriceId,
    }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      payment_method_types: ["card"],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      userId: user._id.toString(),
      planId: plan._id.toString(),
    },
  });

  // Type-safe period dates access
  const currentPeriodStart = ((subscription as unknown) as Stripe.Subscription & {
    current_period_start: number;
    current_period_end: number;
  }).current_period_start;

  const currentPeriodEnd = ((subscription as unknown) as Stripe.Subscription & {
    current_period_start: number;
    current_period_end: number;
  }).current_period_end;

  if (!currentPeriodStart || !currentPeriodEnd) {
    throw new Error("Failed to get subscription period dates");
  }

  // Create subscription in our database
  await Subscription.create({
    user: user._id,
    plan: plan._id,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(currentPeriodStart * 1000),
    currentPeriodEnd: new Date(currentPeriodEnd * 1000),
    price: plan.price,
  });

  // Type-safe client secret access
  const latestInvoice = subscription.latest_invoice as Stripe.Invoice & {
    payment_intent?: Stripe.PaymentIntent;
  };
  
  const clientSecret = latestInvoice?.payment_intent?.client_secret;
  
  if (!clientSecret) {
    throw new Error("Failed to get payment intent client secret");
  }

  return {
    subscriptionId: subscription.id,
    clientSecret: clientSecret
  };
}