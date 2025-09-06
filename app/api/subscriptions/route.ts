// app/api/subscriptions/route.ts
import { NextResponse } from "next/server";
import { createSubscription } from "@/lib/services/subscription";

export async function POST(req: Request) {
  try {
    const { userId, planId } = await req.json();
    
    const { subscriptionId, clientSecret } = await createSubscription(
      userId,
      planId
    );

    return NextResponse.json({
      subscriptionId,
      clientSecret,
    });
  } catch (error: any) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Error creating subscription" },
      { status: 500 }
    );
  }
}