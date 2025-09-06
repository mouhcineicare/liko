import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Balance from '@/lib/db/models/Balance';
import Subscription from '@/lib/db/models/Subscription';
import User from '@/lib/db/models/User';
import stripe from '@/lib/stripe';

const DEFAULT_BALANCE_RATE = 90;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get therapist session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'therapist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    const patientId = params.id;

    // Verify the patient belongs to this therapist
    const patient = await User.findOne({
      _id: patientId,
      role: 'patient',
      therapy: session.user.id
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found or not assigned to this therapist' }, { status: 404 });
    }

    // Fetch patient's balance data
    const balance = await Balance.findOne({ user: patientId });
    
    // Fetch patient's active subscriptions
    const subscriptions = await Subscription.find({ 
      user: patientId,
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
            _id: sub._id.toString(),
            stripeSubscriptionId: sub.stripeSubscriptionId,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            currentPeriodStart: sub.currentPeriodStart,
            plan: sub.plan,
            price: sub.price > 1000 ? sub.price / 100 : sub.price, // Convert from cents to AED
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            productName: product.name,
            productDescription: product.description || '',
            productMetadata: product.metadata
          };
        } catch (error) {
          console.error(`Error fetching Stripe data for subscription ${sub._id}:`, error);
          return {
            _id: sub._id.toString(),
            stripeSubscriptionId: sub.stripeSubscriptionId,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            currentPeriodStart: sub.currentPeriodStart,
            plan: sub.plan,
            price: sub.price > 1000 ? sub.price / 100 : sub.price, // Convert from cents to AED
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            productName: sub.plan,
            productDescription: '',
            productMetadata: {}
          };
        }
      })
    );

    // Calculate balance information
    let balanceInfo = {
      totalSessions: 0,
      remainingSessions: 0,
      balanceInAED: 0,
      history: []
    };

    if (balance) {
      const totalBalanceInAED = balance.totalSessions * DEFAULT_BALANCE_RATE;
      const spentBalanceInAED = balance.spentSessions * DEFAULT_BALANCE_RATE;
      const remainingBalanceInAED = totalBalanceInAED - spentBalanceInAED;
      
      balanceInfo = {
        totalSessions: balance.totalSessions,
        remainingSessions: remainingBalanceInAED / DEFAULT_BALANCE_RATE,
        balanceInAED: remainingBalanceInAED,
        history: balance.history.filter((item: any) => item.plan && item.action === "added")
      };
    }

    // Calculate subscription summary
    const activeSubscriptions = subscriptionsWithProducts.filter(sub => 
      ['active', 'past_due'].includes(sub.status)
    );

    const subscriptionSummary = {
      totalActive: activeSubscriptions.length,
      totalMonthlyValue: activeSubscriptions.reduce((sum, sub) => {
        // Convert price from cents to AED if it's stored in cents (Stripe format)
        const priceInAED = sub.price > 1000 ? sub.price / 100 : sub.price;
        return sum + priceInAED;
      }, 0),
      nextRenewal: activeSubscriptions.length > 0 
        ? new Date(Math.min(...activeSubscriptions.map(sub => new Date(sub.currentPeriodEnd).getTime())))
        : null,
      hasActiveSubscriptions: activeSubscriptions.length > 0
    };

    return NextResponse.json({
      patient: {
        _id: patient._id.toString(),
        fullName: patient.fullName,
        email: patient.email
      },
      balance: balanceInfo,
      subscriptions: subscriptionsWithProducts,
      summary: subscriptionSummary
    });

  } catch (error) {
    console.error('Error fetching patient subscription data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient subscription data' },
      { status: 500 }
    );
  }
}
