import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db/connect";
import Subscription from "@/lib/db/models/Subscription";
import stripe from "@/lib/stripe";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    
    // Fetch subscriptions from database
    const subscriptions = await Subscription.find({ 
      user: session.user.id,
      status: { $in: ["active", "past_due"] }
    }).sort({ currentPeriodEnd: 1 });

    // Enhance subscriptions with product info from Stripe
    const subscriptionsWithProducts = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          // Retrieve subscription details from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(
            sub.stripeSubscriptionId
          );
          
          // Get the product ID from the first item
          const productId = stripeSubscription.items.data[0].price.product;
          
          // Retrieve product details
          const product = await stripe.products.retrieve(productId as string);
          
          return {
            ...sub.toObject(),
            productName: product.name,
            productDescription: product.description || '',
            productMetadata: product.metadata
          };
        } catch (error) {
          console.error(`Error fetching Stripe data for subscription ${sub._id}:`, error);
          return sub.toObject(); // Return basic sub info if Stripe fetch fails
        }
      })
    );

    return NextResponse.json({ 
      subscriptions: subscriptionsWithProducts 
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}