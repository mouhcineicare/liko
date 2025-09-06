import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import Appointment from "@/lib/db/models/Appointment"
import Balance from "@/lib/db/models/Balance"
import Plan from "@/lib/db/models/Plan"
import { isPast } from "date-fns"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { appointmentId, charge, reduceSession } = await req.json()

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
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

    // Verify appointment is not expired (using UTC for comparison)
    const nowUTC = new Date()
    const appointmentDateUTC = new Date(appointment.date)
    
    if (isPast(appointmentDateUTC)) {
      return NextResponse.json({ 
        error: "Cannot cancel expired appointments",
        details: {
          appointmentDate: appointmentDateUTC.toISOString(),
          currentTime: nowUTC.toISOString()
        }
      }, { status: 400 })
    }

    // Verify there are remaining sessions to return
    const remainingSessions = appointment.totalSessions - appointment.completedSessions
    if (remainingSessions <= 0) {
      return NextResponse.json({ 
        error: "No remaining sessions to return",
        details: {
          totalSessions: appointment.totalSessions,
          completedSessions: appointment.completedSessions
        }
      }, { status: 400 })
    }

    // Find or create the patient's balance
    let balance = await Balance.findOne({ user: session.user.id })
    if (!balance) {
      // Create new balance with default values
      balance = new Balance({
        user: session.user.id,
        totalSessions: 0,
        spentSessions: 0
      })
    }

    // Calculate sessions based on appointment price using 90AED rate
    const DEFAULT_BALANCE_RATE = 90; // Constant rate used in the system
    
    // Determine how many sessions to add based on charge
    let sessionsToAdd;
    if (charge) {
      // 50% return: (appointment.price / 2) / 90AED
      const halfPrice = appointment.price / 2;
      sessionsToAdd = halfPrice / DEFAULT_BALANCE_RATE;
    } else {
      // 100% return: appointment.price / 90AED
      sessionsToAdd = appointment.price / DEFAULT_BALANCE_RATE;
    }

    // Add sessions to balance
    balance.totalSessions += sessionsToAdd
    
    // Find the plan associated with the appointment for history record
    // Try to find plan by title first, then by plan ID if appointment has planId
    let plan = null;
    if (appointment.plan) {
      plan = await Plan.findOne({ title: appointment.plan });
    }
    
    // Add history record
    balance.history.push({
      action: "added",
      sessions: sessionsToAdd,
      plan: plan?._id, // Include plan ObjectId if found
      reason: charge ? 
        `Appointment cancellation (50% charge applied) - ${appointment.price} AED refunded as ${sessionsToAdd} sessions` :
        `Appointment cancellation (full sessions returned) - ${appointment.price} AED refunded as ${sessionsToAdd} sessions`,
      createdAt: new Date()
    })

    // Update appointment status
    appointment.status = "cancelled"

    // Save both the appointment and balance changes
    await Promise.all([
      appointment.save(),
      balance.save()
    ])

    return NextResponse.json({
      message: "Appointment cancelled successfully",
      appointment: {
        _id: appointment._id,
        status: appointment.status,
        date: appointment.date,
        price: appointment.price,
        remainingSessionsBeforeCancel: remainingSessions
      },
      balance: {
        totalSessions: balance.totalSessions,
        remainingSessions: balance.totalSessions - balance.spentSessions,
        sessionsAdded: sessionsToAdd,
        wasNewBalance: !balance._id // Indicates if this was a newly created balance
      },
      calculation: {
        appointmentPrice: appointment.price,
        sessionRate: DEFAULT_BALANCE_RATE,
        exactSessionsCalculated: appointment.price / DEFAULT_BALANCE_RATE,
        chargeApplied: charge,
        finalSessionsAdded: sessionsToAdd
      },
      timeValidation: {
        currentTimeUTC: nowUTC.toISOString(),
        appointmentTimeUTC: appointmentDateUTC.toISOString(),
        wasExpired: isPast(appointmentDateUTC)
      }
    })
  } catch (error) {
    console.error("Error cancelling appointment:", error)
    return NextResponse.json({ error: "Error cancelling appointment" }, { status: 500 })
  }
}