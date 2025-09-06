import stripe from '@/lib/stripe'

export async function getStripeCustomerIdByEmail(email: string): Promise<string | null> {
  if (!email) return null

  const customers = await stripe.customers.list({
    email,
    limit: 1
  })

  if (customers.data.length > 0) {
    return customers.data[0].id
  }

  return null
}
