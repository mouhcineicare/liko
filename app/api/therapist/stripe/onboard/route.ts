import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import stripe from '@/lib/stripe';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';

export async function POST(request: Request) {
  try {
    // 1. Authentication and validation
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'therapist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const therapist = await User.findById(session.user.id);
    if (!therapist) {
      return NextResponse.json({ error: 'Therapist not found' }, { status: 404 });
    }

    const req = await request.json();

    // 2. UAE-compliant account configuration
    const baseAccountParams = {
      type: "express",
      country: 'AE',
      email: req.email || therapist.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: { interval: "manual" }
        }
      },
      tos_acceptance: {
        service_agreement: "full",
        date: Math.floor(Date.now() / 1000),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      },
      metadata: {
        userId: therapist._id.toString(),
        platform: "icarewellbeing"
      }
    };

    // 3. Check for existing Stripe account
    let stripeAccountId = therapist.stripeAccountId;
    if (stripeAccountId) {
      try {
        // Verify existing account is UAE-based and properly configured
        const existingAccount = await stripe.accounts.retrieve(stripeAccountId);
        
        if (existingAccount.country !== 'AE') {
          throw new Error('Account must be UAE-based');
        }

        // Check if account needs additional verification
        if ((existingAccount?.requirements?.currently_due ?? []).length > 0) {
          // Account exists but needs more info - send to onboarding
          const baseUrl = process.env.NODE_ENV === 'development' 
            ? process.env.BASE_URL || 'http://localhost:3000'
            : process.env.BASE_URL || 'https://app.icarewellbeing.com';

          const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${baseUrl}/dashboard/therapist/settings`,
            return_url: `${baseUrl}/dashboard/therapist/settings?success=true`,
            type: 'account_onboarding',
            collect: 'eventually_due'
          });

          return NextResponse.json({ url: accountLink.url });
        }
     

        // Account is fully set up
        return NextResponse.json({ 
          message: 'Stripe account already set up',
          accountId: stripeAccountId
        });

      } catch (err) {
        // Account retrieval failed - might be invalid, create new one
        console.warn('Existing Stripe account invalid, creating new one:', err);
        stripeAccountId = null;
      }
    }

    // 4. Create new account (no business validations required upfront)
    stripeAccountId = await createConnectedAccount({
      email: req.email || therapist.email,
      fullName: therapist.fullName,
      phone: therapist.telephone,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
      userId: therapist._id.toString(),
    });
    therapist.stripeAccountId = stripeAccountId;
    await therapist.save();

    // 5. Create onboarding link
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? process.env.BASE_URL || 'http://localhost:3000'
      : process.env.BASE_URL || 'https://app.icarewellbeing.com';

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard/therapist/settings`,
      return_url: `${baseUrl}/dashboard/therapist/settings?success=true`,
      type: 'account_onboarding',
      collect: 'eventually_due' // Stripe will collect all required business info
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error: any) {
    console.error('Stripe onboarding error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    });

    return NextResponse.json(
      { 
        error: 'Payment setup failed',
        details: error.raw?.message || error.message,
        solution: 'Please complete your business information during Stripe onboarding'
      }, 
      { status: error.statusCode || 500 }
    );
  }
}


async function createConnectedAccount({ email, fullName, phone, ip, userId }: {
  email: string,
  fullName: string,
  phone: string,
  ip: string,
  userId: string
}) {
  const [firstName, ...rest] = fullName.split(' ');
  const lastName = rest.join(' ') || 'N/A';

  const account = await stripe.accounts.create({
    type: 'custom',
    country: 'AE',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    business_profile: {
      product_description: 'Mental health services',
    },
    individual: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
    },
    tos_acceptance: {
      date: Math.floor(Date.now() / 1000),
      ip,
    },
    metadata: {
      userId,
      platform: 'icarewellbeing',
    },
    settings: {
      payouts: {
        schedule: { interval: 'manual' },
      },
    },
  });

  console.log('Created Custom Connected Account:', account.id);
  return account.id;
}
