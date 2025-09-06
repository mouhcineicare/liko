import { NextResponse } from 'next/server';
import stripe from '@/lib/stripe';
import { authOptions } from '@/lib/auth/config';
import { getServerSession } from 'next-auth';

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const patientEmail = searchParams.get('email');
    const limit = Number(searchParams.get('limit')) || 1000;

    if (!patientEmail) {
      return NextResponse.json({ error: 'Patient email is required' }, { status: 400 });
    }

    // Fetch charges with expanded customer and balance_transaction
    const charges = await stripe.charges.list({
      limit,
      expand: ['data.customer', 'data.balance_transaction'],
    });


    // Format the charges with proper type checking
    const payments: FormattedPayment[] = charges.data.map((charge: any) => {
      // Extract customer information
      let customerEmail = charge.billing_details?.email || '';
      let customerName = charge.billing_details?.name || '';
      

      // Handle balance transaction safely
      let fee = 0;
      let net = 0;
      
      if (charge.balance_transaction && typeof charge.balance_transaction === 'object') {
        fee = charge.balance_transaction.fee ? charge.balance_transaction.fee / 100 : 0;
        net = charge.balance_transaction.net ? charge.balance_transaction.net / 100 : 0;
      }

      // Get payment method details
      const paymentMethod = charge.payment_method_details?.type || 'unknown';

      return {
        id: charge.id,
        type: 'charge' as const,
        amount: charge.amount / 100,
        currency: charge.currency,
        status: !charge.refunded ? charge.status : "Refunded",
        created: new Date(charge.created * 1000),
        description: customerEmail || charge.description,
        customer_email: customerEmail,
        customer_name: customerName,
        payment_method: paymentMethod,
        receipt_url: charge.receipt_url,
        fee,
        net,
      };
    });

    // Add debugging information in development
    const debug = process.env.NODE_ENV === 'development' ? {
      rawFirstCharge: charges.data.length > 0 ? {
        id: charges.data[0].id,
        customer: charges.data[0].customer,
      } : null
    } : null;


    const filteredPayments = payments.filter(payment => payment.customer_email === patientEmail);

    return NextResponse.json({
      payments: filteredPayments,
      pagination: {
        total: payments.length,
        hasMore: charges.has_more,
      }
    });
  } catch (error) {
    console.error('Error fetching Stripe payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe payments' },
      { status: 500 }
    );
  }
}
