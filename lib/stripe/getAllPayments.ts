import stripe from '@/lib/stripe'
import Stripe from 'stripe'

// Helper to fetch all paginated Stripe data
async function getAllStripeData<T>(
  method: (params: any) => Promise<Stripe.ApiListPromise<T>>,
  params: any
): Promise<T[]> {
  let allData: T[] = []
  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const response = await method({
      ...params,
      limit: 100,
      starting_after: startingAfter
    })

    allData = [...allData, ...response.data]
    hasMore = response.has_more
    startingAfter = response.data[response.data.length - 1]?.id
  }

  return allData
}

// Helper to safely retrieve amount with fallback
function getValidAmount(amount: number | null | undefined, fallback: number = 0): number {
  return (typeof amount === 'number' && !isNaN(amount)) ? amount : fallback
}

export async function getAllStripePaymentsByCustomerId(stripeCustomerId: string, email?: string) {
  console.log('getAllStripePaymentsByCustomerId called with:', { stripeCustomerId, email });
  
  const [ charges, subscriptions, invoices] = await Promise.all([
    getAllStripeData(stripe.charges.list.bind(stripe.charges), {
      customer: stripeCustomerId,
      paid: true
    }),
    getAllStripeData(stripe.subscriptions.list.bind(stripe.subscriptions), {
      customer: stripeCustomerId,
      status: 'all',
      expand: ['data.latest_invoice']
    }),
    getAllStripeData(stripe.invoices.list.bind(stripe.invoices), {
      customer: stripeCustomerId,
      status: 'paid',
      expand: ['data.charge']
    })
  ])

  console.log('Retrieved from Stripe:', {
    charges: charges.length,
    subscriptions: subscriptions.length,
    invoices: invoices.length
  });

  // Log charge details
  console.log('Charge details:', charges.map(charge => ({
    id: charge.id,
    amount: charge.amount,
    description: charge.description,
    receipt_url: charge.receipt_url,
    status: charge.status,
    paid: charge.paid
  })));

  const paidPayments = await Promise.all([
    ...charges.map(charge => {
      const payment = {
        id: charge.id,
        type: 'charge' as const,
        amount: getValidAmount(charge.amount),
        currency: charge.currency || 'usd',
        created: charge.created,
        description: charge.description || 'Payment',
        metadata: charge.metadata,
        receipt_url: charge.receipt_url,
        status: charge.status
      };
      console.log(`Processed charge ${charge.id}:`, payment);
      return payment;
    }),

    ...subscriptions
      .filter(sub => ['active', 'trialing'].includes(sub.status))
      .map(sub => {
        const latestInvoice = sub.latest_invoice as Stripe.Invoice | null
        const payment = {
          id: sub.id,
          type: 'subscription' as const,
          amount: latestInvoice ? getValidAmount(latestInvoice.amount_paid) : 0,
          currency: sub.currency || 'usd',
          created: sub.created,
          description: `Subscription: ${sub.items.data[0]?.plan?.nickname || sub.id}`,
          metadata: sub.metadata,
          receipt_url: latestInvoice?.charge
            ? (latestInvoice.charge as Stripe.Charge)?.receipt_url
            : null,
          current_period_end: sub.current_period_end,
          status: sub.status,
        };
        console.log(`Processed subscription ${sub.id}:`, payment);
        return payment;
      }),

    ...invoices
      .filter(inv => !inv.subscription)
      .map(inv => {
        const payment = {
          id: inv.id,
          type: 'invoice' as const,
          amount: getValidAmount(inv.amount_paid),
          currency: inv.currency || 'usd',
          created: inv.created,
          description: inv.description || 'Payment',
          metadata: inv.metadata,
          receipt_url: inv.charge
            ? (inv.charge as Stripe.Charge)?.receipt_url
            : null,
            status: inv.status
        };
        console.log(`Processed invoice ${inv.id}:`, payment);
        return payment;
      })
  ])

  console.log('All processed payments before deduplication:', paidPayments.length);
  paidPayments.forEach(payment => {
    console.log(`Payment: ${payment.id} (${payment.type}) - Amount: ${payment.amount}, Receipt: ${!!payment.receipt_url}`);
  });

  const uniquePayments = paidPayments
    .filter((payment, index, self) =>
      index === self.findIndex(p => p.id === payment.id)
    )
    .sort((a, b) => b.created - a.created)

  console.log('Final unique payments:', uniquePayments.length, 'payments');
  console.log('Payment IDs:', uniquePayments.map(p => p.id));

  return {
    payments: uniquePayments,
    summary: {
      totalPayments: uniquePayments.length,
      totalAmount: uniquePayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      activeSubscriptions: uniquePayments.filter(p => p.type === 'subscription').length
    }
  }
}
