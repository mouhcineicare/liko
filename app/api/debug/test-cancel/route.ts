import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import { Balance } from "@/lib/db/models"
import Appointment from "@/lib/db/models/Appointment"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { appointmentId, charge = false } = await req.json()

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 })
    }

    await connectDB()

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId)
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Verify the patient owns this appointment
    if (appointment.patient.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find or create the patient's balance
    let balance = await Balance.findOne({ user: session.user.id })
    if (!balance) {
      balance = new Balance({
        user: session.user.id,
        balanceAmount: 0
      })
    }

    // Calculate refund based on payment method and remaining sessions
    const refundMultiplier = charge ? 0.5 : 1.0
    let refundAmount = 0

    // Calculate remaining sessions
    const remainingSessions = appointment.totalSessions - appointment.completedSessions

    console.log('Test cancel - Refund calculation inputs:', {
      appointmentPrice: appointment.price,
      paymentMethod: appointment.payment?.method,
      isBalance: appointment.isBalance,
      charge,
      refundMultiplier,
      totalSessions: appointment.totalSessions,
      completedSessions: appointment.completedSessions,
      remainingSessions
    })

    if (appointment.payment && appointment.payment.method === 'stripe') {
      // Stripe payment - refund to balance based on remaining sessions
      const remainingSessionsValue = remainingSessions * (appointment.payment.unitPrice || appointment.price);
      refundAmount = remainingSessionsValue * refundMultiplier;
      console.log('Test cancel - Stripe payment - refunding to balance:', {
        remainingSessions,
        unitPrice: appointment.payment.unitPrice || appointment.price,
        remainingSessionsValue,
        refundMultiplier,
        refundAmount
      });
    } else if (appointment.isBalance || (appointment.payment && appointment.payment.method === 'balance')) {
      // Balance payment - refund based on appointment price
      refundAmount = appointment.price * refundMultiplier
      console.log('Test cancel - Balance payment calculation:', {
        price: appointment.price,
        refundMultiplier,
        refundAmount
      })
    } else if (appointment.payment && appointment.payment.method === 'mixed') {
      // Mixed payment - calculate refund based on remaining sessions
      const remainingSessionsValue = remainingSessions * (appointment.payment.unitPrice || appointment.price);
      refundAmount = remainingSessionsValue * refundMultiplier;
      console.log('Test cancel - Mixed payment - refunding to balance:', {
        remainingSessions,
        unitPrice: appointment.payment.unitPrice || appointment.price,
        remainingSessionsValue,
        refundMultiplier,
        refundAmount
      });
    } else {
      // Fallback - use appointment price
      refundAmount = appointment.price * refundMultiplier
      console.log('Test cancel - Fallback calculation:', {
        price: appointment.price,
        refundMultiplier,
        refundAmount
      })
    }

    // Round to 2 decimal places
    refundAmount = Math.round(refundAmount * 100) / 100

    console.log('Test cancel - Refund calculation:', {
      appointmentId,
      price: appointment.price,
      refundMultiplier,
      refundAmount,
      payment: appointment.payment,
      isBalance: appointment.isBalance
    })

    // SIMPLE BALANCE UPDATE - Use balanceAmount as source of truth
    const oldBalance = balance.balanceAmount
    balance.balanceAmount += refundAmount
    balance.updatedAt = new Date()

    // Add history for tracking (optional)
    try {
      const historyItem = {
        action: "added",
        amount: refundAmount,
        plan: appointment.plan,
        reason: `Test cancellation (${charge ? '50% charge' : 'full refund'}) - ${refundAmount} AED refunded`,
        createdAt: new Date(),
        date: new Date(),
        appointmentId: appointmentId,
        type: "refund",
        description: `Test appointment cancellation refund - ${appointment.plan || 'Unknown Plan'}`,
        surcharge: 0
      }

      balance.history = balance.history || []
      balance.history.push(historyItem)
      console.log('History item added for tracking')
    } catch (historyError) {
      console.log('History add failed, but balance update will continue:', historyError.message)
    }

    await balance.save()

    return NextResponse.json({
      success: true,
      message: "Test cancellation completed",
      appointment: {
        _id: appointment._id,
        price: appointment.price,
        status: appointment.status,
        payment: appointment.payment,
        isBalance: appointment.isBalance
      },
      balance: {
        oldBalance,
        newBalance: balance.balanceAmount,
        refundAmount,
        wasNewBalance: !balance._id
      },
      calculation: {
        refundMultiplier,
        charge,
        finalAmountRefunded: refundAmount
      }
    })
  } catch (error) {
    console.error("Test cancel error:", error)
    return NextResponse.json({ 
      error: "Test cancellation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
