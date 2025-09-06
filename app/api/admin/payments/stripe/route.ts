import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { authOptions } from '@/lib/auth/config';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';

interface FormattedPayment {
  id: string;
  type: 'charge';
  amount: number;
  currency: string;
  status: string;
  created: Date;
  description: string;
  customer_email: string;
  customer_name: string;
  payment_method: string;
  receipt_url: string | null;
  fee: number;
  net: number;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const emailFilter = searchParams.get('email')?.toLowerCase();
    const limit = Number(searchParams.get('limit')) || 10;
    const page = Number(searchParams.get('page')) || 1;

    let allCharges: Stripe.Charge[] = [];
    let startingAfter: string | undefined = undefined;

    while (allCharges.length < 1000) {
      const response = await stripe.charges.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer', 'data.balance_transaction'],
      });

      allCharges = allCharges.concat(response.data);
      if (!response.has_more) break;

      startingAfter = response.data[response.data.length - 1]?.id;
    }

    const filtered = allCharges.filter(charge => {
      const email = charge.billing_details?.email?.toLowerCase() || '';
      return !emailFilter || email.includes(emailFilter);
    });

    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const payments: FormattedPayment[] = paginated.map(charge => {
      const email = charge.billing_details?.email || '';
      const name = charge.billing_details?.name || '';
      const paymentMethod = charge.payment_method_details?.type || 'unknown';

      let fee = 0;
      let net = 0;
      if (charge.balance_transaction && typeof charge.balance_transaction === 'object') {
        fee = charge.balance_transaction.fee ? charge.balance_transaction.fee / 100 : 0;
        net = charge.balance_transaction.net ? charge.balance_transaction.net / 100 : 0;
      }

      return {
        id: charge.id,
        type: 'charge',
        amount: charge.amount / 100,
        currency: charge.currency,
        status: !charge.refunded ? charge.status : 'Refunded',
        created: new Date(charge.created * 1000),
        description: email || charge.description,
        customer_email: email,
        customer_name: name,
        payment_method: paymentMethod,
        receipt_url: charge.receipt_url,
        fee,
        net,
      };
    });

    return NextResponse.json({
      payments,
      pagination: {
        total: filtered.length,
        page,
        limit,
        hasMore: page * limit < filtered.length,
      },
    });
  } catch (error) {
    console.error('Error fetching Stripe payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe payments' },
      { status: 500 }
    );
  }
}
