import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import stripe from '@/lib/stripe';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'therapist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const therapist = await User.findById(session.user.id);
    if (!therapist || !therapist.stripeAccountId) {
      return NextResponse.json({ error: 'Stripe account not connected' }, { status: 400 });
    }

    const loginLink = await stripe.accounts.createLoginLink(therapist.stripeAccountId);

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error('Error creating Stripe dashboard link:', error);
    return NextResponse.json(
      { error: 'Error creating Stripe dashboard link' },
      { status: 500 }
    );
  }
}