import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { subscriptionTopupBalance } from '@/lib/api/balance';
import Stripe from 'stripe';

export async function POST(req: Request) {
  console.log('=== app/api/stripe/webhook/route.ts - POST START ===');
  
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature');

  console.log('app/api/stripe/webhook/route.ts - Webhook payload length:', payload.length);
  console.log('app/api/stripe/webhook/route.ts - Stripe signature header present:', !!sig);

  if (!sig) {
    console.log('app/api/stripe/webhook/route.ts - Error: Missing Stripe signature header');
    return NextResponse.json({ error: 'Missing Stripe signature header' }, { status: 400 });
  }

  let event;

  try {
    console.log('app/api/stripe/webhook/route.ts - Constructing Stripe webhook event');
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_CONNECT!
    );
    console.log(`app/api/stripe/webhook/route.ts - Received event: ${event.type}`);
    console.log('app/api/stripe/webhook/route.ts - Event data:', JSON.stringify({
      id: event.id,
      type: event.type,
      created: event.created,
      data: {
        object: {
          id: event.data.object.id,
          object: event.data.object.object,
          // Add more specific fields based on event type
          ...(event.data.object as any)
        }
      }
    }, null, 2));
  } catch (err: any) {
    console.error(`app/api/stripe/webhook/route.ts - Webhook Error: ${err.message}`);
    console.log('=== app/api/stripe/webhook/route.ts - POST END WITH ERROR ===');
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  await connectDB();

  switch (event.type) {
    // Account-related events (unchanged)
    case 'account.updated': {
      console.log('app/api/stripe/webhook/route.ts - Processing account.updated event');
      const account = event.data.object;
      console.log('app/api/stripe/webhook/route.ts - Account data:', JSON.stringify({
        id: account.id,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        status: account.status
      }, null, 2));
      
      const updateResult = await User.updateOne(
        { stripeAccountId: account.id },
        {
          stripeAccountStatus: account.charges_enabled && account.payouts_enabled
            ? 'active'
            : 'pending'
        }
      );
      console.log('app/api/stripe/webhook/route.ts - Account update result:', JSON.stringify(updateResult, null, 2));
      break;
    }

    case 'account.application.authorized': {
      console.log('app/api/stripe/webhook/route.ts - Processing account.application.authorized event');
      const authorizedAccount = event.data.object;
      console.log('app/api/stripe/webhook/route.ts - Authorized account data:', JSON.stringify({
        id: authorizedAccount.id,
        object: authorizedAccount.object
      }, null, 2));
      
      const updateResult = await User.updateOne(
        { stripeAccountId: authorizedAccount.id },
        { stripeAccountStatus: 'active' }
      );
      console.log('app/api/stripe/webhook/route.ts - Account authorization update result:', JSON.stringify(updateResult, null, 2));
      break;
    }

    case 'account.application.deauthorized': {
      console.log('app/api/stripe/webhook/route.ts - Processing account.application.deauthorized event');
      const deauthorizedAccount = event.data.object;
      console.log('app/api/stripe/webhook/route.ts - Deauthorized account data:', JSON.stringify({
        id: deauthorizedAccount.id,
        object: deauthorizedAccount.object
      }, null, 2));
      
      const updateResult = await User.updateOne(
        { stripeAccountId: deauthorizedAccount.id },
        { stripeAccountStatus: 'inactive' }
      );
      console.log('app/api/stripe/webhook/route.ts - Account deauthorization update result:', JSON.stringify(updateResult, null, 2));
      break;
    }

    case 'account.external_account.created':
    case 'account.external_account.updated': {
      console.log(`app/api/stripe/webhook/route.ts - Processing ${event.type} event`);
      const extAccount = event.data.object;
      console.log('app/api/stripe/webhook/route.ts - External account data:', JSON.stringify({
        id: extAccount.id,
        account: extAccount.account,
        object: extAccount.object
      }, null, 2));
      
      const updateResult = await User.updateOne(
        { stripeAccountId: extAccount.account },
        { stripeAccountStatus: 'active' }
      );
      console.log('app/api/stripe/webhook/route.ts - External account update result:', JSON.stringify(updateResult, null, 2));
      break;
    }

    case 'account.external_account.deleted': {
      console.log('app/api/stripe/webhook/route.ts - Processing account.external_account.deleted event');
      const deletedAccount = event.data.object;
      console.log('app/api/stripe/webhook/route.ts - Deleted external account data:', JSON.stringify({
        id: deletedAccount.id,
        account: deletedAccount.account,
        object: deletedAccount.object
      }, null, 2));
      
      const updateResult = await User.updateOne(
        { stripeAccountId: deletedAccount.account },
        { stripeAccountStatus: 'inactive' }
      );
      console.log('app/api/stripe/webhook/route.ts - External account deletion update result:', JSON.stringify(updateResult, null, 2));
      break;
    }

    // Subscription payment events
    case 'invoice.paid': {
      console.log('app/api/stripe/webhook/route.ts - Processing invoice.paid event');
      const invoice = event.data.object as Stripe.Invoice;
      console.log('app/api/stripe/webhook/route.ts - Invoice data:', JSON.stringify({
        id: invoice.id,
        subscription: invoice.subscription,
        billing_reason: invoice.billing_reason,
        status: invoice.status,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency
      }, null, 2));
      
      // Only process subscription cycle payments
      if (invoice.billing_reason === 'subscription_cycle' && invoice?.subscription) {
        console.log('app/api/stripe/webhook/route.ts - Processing subscription cycle payment for subscription:', invoice.subscription);
        try {
          const result = await subscriptionTopupBalance(invoice.subscription as string);
          console.log('app/api/stripe/webhook/route.ts - Subscription balance top-up successful:', JSON.stringify(result, null, 2));
        } catch (error) {
          console.error('app/api/stripe/webhook/route.ts - Failed to process subscription top-up:', error);
        }
      } else {
        console.log('app/api/stripe/webhook/route.ts - Skipping invoice.paid event - not a subscription cycle payment');
      }
      break;
    }

    case 'customer.subscription.updated': {
      console.log('app/api/stripe/webhook/route.ts - Processing customer.subscription.updated event');
      const subscription = event.data.object;
      console.log('app/api/stripe/webhook/route.ts - Subscription update data:', JSON.stringify({
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end
      }, null, 2));
      
      // Handle subscription changes (e.g., cancellation at period end)
      if (subscription.cancel_at_period_end) {
        console.log(`app/api/stripe/webhook/route.ts - Subscription ${subscription.id} will cancel at period end`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      console.log('app/api/stripe/webhook/route.ts - Processing customer.subscription.deleted event');
      const subscription = event.data.object;
      console.log('app/api/stripe/webhook/route.ts - Subscription deletion data:', JSON.stringify({
        id: subscription.id,
        status: subscription.status,
        canceled_at: subscription.canceled_at
      }, null, 2));
      
      console.log(`app/api/stripe/webhook/route.ts - Subscription ${subscription.id} was canceled`);
      break;
    }

    default:
      console.log(`app/api/stripe/webhook/route.ts - Unhandled event type: ${event.type}`);
      console.log('app/api/stripe/webhook/route.ts - Unhandled event data:', JSON.stringify({
        id: event.id,
        type: event.type,
        object: event.data.object.object
      }, null, 2));
  }

  console.log('=== app/api/stripe/webhook/route.ts - POST END ===');
  return NextResponse.json({ received: true });
}