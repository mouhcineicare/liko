// TODO: Migrate to Supabase - Currently using MongoDB
console.warn('Route not yet migrated to Supabase');

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/db/connect'
import Appointment from '@/lib/db/models/Appointment'
import { authOptions } from '@/lib/auth/config'
import { verifyStripePaymentId } from '@/lib/stripe/verify-stripe-payment'

export const dynamic = 'force-dynamic'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // TODO: Migrate to Supabase - Currently using MongoDB
  return NextResponse.json({ error: "Route not yet migrated to Supabase" }, { status: 501 });
  
  try {
    await dbConnect()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = await req.json()
    const appointmentId = params.id

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })
    }

    let verification
    try {
      // Try verifying payment with Stripe
      verification = await verifyStripePaymentId(paymentId)
    } catch (verifyError) {
      console.error('Error verifying Stripe payment:', verifyError)
      return NextResponse.json({
        error: 'Failed to verify payment',
        details: verifyError instanceof Error ? verifyError.message : String(verifyError),
      }, { status: 400 })
    }

    if (!verification || verification.status !== 'valid') {
      return NextResponse.json(
        {
          error: 'Payment cannot be linked',
          details: verification?.reason || 'Payment is not valid or not found',
          verificationResult: verification
        },
        { status: 400 }
      )
    }

    // Proceed with updating appointment
    const updateData: any = {
      checkoutSessionId: paymentId,
      paymentStatus: 'completed',
      isPaid: true,
      isAccepted: false,
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    )

    if (!updatedAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      message: 'Payment linked successfully',
      verificationResult: verification
    })

  } catch (error) {
    console.error('Error linking payment:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        suggestion: 'Please verify the payment ID and try again'
      },
      { status: 500 }
    )
  }
}
