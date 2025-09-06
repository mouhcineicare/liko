import Subscription from "@/lib/db/models/Subscription";

export async function getUserActiveSubscriptions(userId: string) {
  const now = new Date();
  return await Subscription.find({
    user: userId,
    status: { $in: ["active", "past_due"] },
    currentPeriodEnd: { $gt: now },
  }).populate("plan");
}

export async function hasActiveSubscription(userId: string, planType?: string) {
  const subscriptions = await getUserActiveSubscriptions(userId);
  
  if (planType) {
    return subscriptions.some(
      (sub) => sub.plan.type === planType
    );
  }
  return subscriptions.length > 0;
}