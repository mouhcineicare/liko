import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { subscriptionTopupBalance } from "@/lib/api/balance";
import Subscription from "@/lib/db/models/Subscription";
import Balance from "@/lib/db/models/Balance";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { userId, subscriptionId } = await req.json();
    
    if (!userId && !subscriptionId) {
      return NextResponse.json(
        { error: "Either userId or subscriptionId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    let subscriptions = [];
    
    if (subscriptionId) {
      // Fix specific subscription
      const subscription = await Subscription.findOne({ 
        stripeSubscriptionId: subscriptionId 
      }).populate('user');
      
      if (!subscription) {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 }
        );
      }
      
      subscriptions = [subscription];
    } else {
      // Fix all subscriptions for user
      subscriptions = await Subscription.find({ 
        user: userId 
      }).populate('user');
    }

    const results = [];

    for (const subscription of subscriptions) {
      try {
        console.log(`Fixing balance for subscription: ${subscription.stripeSubscriptionId}`);
        
        // Check current balance
        const currentBalance = await Balance.findOne({ user: subscription.user._id });
        const balanceBefore = currentBalance?.totalSessions || 0;
        
        // Add sessions to balance
        await subscriptionTopupBalance(subscription.stripeSubscriptionId);
        
        // Check balance after
        const updatedBalance = await Balance.findOne({ user: subscription.user._id });
        const balanceAfter = updatedBalance?.totalSessions || 0;
        const sessionsAdded = balanceAfter - balanceBefore;
        
        results.push({
          subscriptionId: subscription.stripeSubscriptionId,
          userId: subscription.user._id,
          userEmail: subscription.user.email,
          balanceBefore,
          balanceAfter,
          sessionsAdded,
          success: true
        });
        
        console.log(`Fixed balance for ${subscription.user.email}: +${sessionsAdded} sessions`);
        
      } catch (error) {
        console.error(`Failed to fix balance for subscription ${subscription.stripeSubscriptionId}:`, error);
        results.push({
          subscriptionId: subscription.stripeSubscriptionId,
          userId: subscription.user._id,
          userEmail: subscription.user.email,
          success: false,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${subscriptions.length} subscriptions`,
      results
    });

  } catch (error: any) {
    console.error("Fix subscription balance error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
