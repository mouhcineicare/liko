// app/api/admin/users/patients/verified-payments/route.ts

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import User from '@/lib/db/models/User'
import dbConnect from '@/lib/db/connect'
import { authOptions } from '@/lib/auth/config'

import { getAllStripePaymentsByCustomerId } from '@/lib/stripe/getAllPayments'
import { getStripeCustomerIdByEmail } from '@/lib/stripe/getCustomerIdByEmail'

export async function POST(req: Request) {
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, customerId: inputCustomerId, email: inputEmail } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user || user.role !== 'patient') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const userCustomerId = user.stripeCustomerId
    const userEmail = user.email

    let stripeCustomerId = userCustomerId || inputCustomerId || null
    let customerEmail = inputEmail || userEmail || null

    // If no customerId yet, try to get it using email
    if (!stripeCustomerId && customerEmail) {
      stripeCustomerId = await getStripeCustomerIdByEmail(customerEmail)
    }

    if (!stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No Stripe customer found',
        canSearch: true,
        searchOptions: {
          email: customerEmail,
          customerId: null
        }
      }, { status: 404 })
    }

    // Use extracted function to get all payments
    const { payments, summary } = await getAllStripePaymentsByCustomerId(stripeCustomerId, customerEmail)

    return NextResponse.json({
      payments,
      customerId: stripeCustomerId,
      email: customerEmail,
      summary
    })

  } catch (error) {
    console.error('Error fetching customer payments:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
