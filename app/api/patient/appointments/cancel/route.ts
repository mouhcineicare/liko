import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import Appointment from "@/lib/db/models/Appointment"
import { Balance } from "@/lib/db/models"
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

    // Check if appointment is expired (for logging purposes)
    const nowUTC = new Date()
    const appointmentDateUTC = new Date(appointment.date)
    const isExpired = isPast(appointmentDateUTC)
    
    // Log appointment status for debugging
    console.log('Cancel appointment validation:', {
      appointmentId,
          appointmentDate: appointmentDateUTC.toISOString(),
      currentTime: nowUTC.toISOString(),
      isExpired,
      appointmentStatus: appointment.status
    })

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
    console.log('Balance lookup result:', {
      userId: session.user.id,
      balanceFound: !!balance,
      balanceData: balance ? {
        totalSessions: balance.totalSessions,
        spentSessions: balance.spentSessions,
        remainingSessions: balance.remainingSessions
      } : null
    })
    
    if (!balance) {
      // Create new balance with default values
      balance = new Balance({
        user: session.user.id,
        totalSessions: 0,
        spentSessions: 0
      })
      console.log('Created new balance for user:', session.user.id)
    }

    // Calculate sessions to return based on remaining sessions, not price
    // The appointment.totalSessions represents the sessions that were deducted from balance
    const remainingSessions = appointment.totalSessions - appointment.completedSessions;
    
    // Determine how many sessions to add based on charge
    let sessionsToAdd;
    if (charge) {
      // 50% return: return half of the remaining sessions
      sessionsToAdd = remainingSessions / 2;
    } else {
      // 100% return: return all remaining sessions
      sessionsToAdd = remainingSessions;
    }
    
    console.log('Session refund calculation:', {
      totalSessions: appointment.totalSessions,
      completedSessions: appointment.completedSessions,
      remainingSessions,
      charge,
      sessionsToAdd
    });

    // Add sessions to balance
    balance.totalSessions += sessionsToAdd
    
    // Find the plan associated with the appointment for history record
    // Try to find plan by title first, then by plan ID if appointment has planId
    let plan = null;
    if (appointment.plan) {
      plan = await Plan.findOne({ title: appointment.plan });
    }
    
    // Add history record
    const historyItem = {
      action: "added",
      sessions: sessionsToAdd,
      plan: appointment.plan, // Use the plan title/name from appointment, not the plan ID
      reason: charge ? 
        `Appointment cancellation (50% charge applied) - ${remainingSessions} sessions refunded as ${sessionsToAdd} sessions` :
        `Appointment cancellation (full sessions returned) - ${remainingSessions} sessions refunded as ${sessionsToAdd} sessions`,
      createdAt: new Date()
    };
    
    console.log('Adding history item:', JSON.stringify(historyItem, null, 2));
    // Don't push to balance.history - we'll use raw MongoDB operations instead

    // Use new status system for cancellation
    const { updateAppointmentStatus } = await import("@/lib/services/appointments/legacy-wrapper");
    const { APPOINTMENT_STATUSES, LEGACY_STATUS_MAPPING } = await import("@/lib/utils/statusMapping");

    // Debug: Log current appointment status and mapped status
    console.log('Cancel appointment debug:', {
      appointmentId,
      currentStatus: appointment.status,
      mappedStatus: LEGACY_STATUS_MAPPING[appointment.status as keyof typeof LEGACY_STATUS_MAPPING] || appointment.status,
      targetStatus: APPOINTMENT_STATUSES.CANCELLED
    });

    // Update appointment status using new transition system
    const actor = { id: session.user.id, role: 'patient' as const };
    const updatedAppointment = await updateAppointmentStatus(
      appointmentId,
      APPOINTMENT_STATUSES.CANCELLED,
      actor,
      { 
        reason: charge ? 'Appointment cancelled with 50% charge' : 'Appointment cancelled - full refund',
        meta: { 
          charge,
          sessionsToAdd,
          appointmentPrice: appointment.price,
          sessionRate: DEFAULT_BALANCE_RATE,
          originalStatus: appointment.status
        }
      }
    );

    // Save balance changes using raw MongoDB operations to avoid schema issues
    try {
      await Balance.findByIdAndUpdate(
        balance._id,
        {
          $inc: { totalSessions: sessionsToAdd },
          $push: { history: historyItem },
          $set: { updatedAt: new Date() }
        }
      );
      console.log('Balance updated successfully using raw MongoDB operations');
    } catch (updateError) {
      console.error('Error updating balance:', updateError);
      
      // Fallback: try to save the balance document directly (without history)
      try {
        balance.totalSessions += sessionsToAdd;
        balance.updatedAt = new Date();
        await balance.save();
        console.log('Balance saved successfully using Mongoose save (without history)');
        
        // Try to add history separately using raw MongoDB
        try {
          await Balance.findByIdAndUpdate(
            balance._id,
            { $push: { history: historyItem } }
          );
          console.log('History added separately using raw MongoDB');
        } catch (historyError) {
          console.error('Failed to add history separately:', historyError);
          // Don't throw - balance was updated successfully
        }
      } catch (saveError) {
        console.error('Both MongoDB update and Mongoose save failed:', saveError);
        throw new Error('Failed to update balance');
      }
    }

    return NextResponse.json({
      message: "Appointment cancelled successfully",
      appointment: {
        _id: updatedAppointment._id,
        status: updatedAppointment.status,
        date: updatedAppointment.date,
        price: updatedAppointment.price,
        remainingSessionsBeforeCancel: remainingSessions
      },
      balance: {
        totalSessions: balance.totalSessions,
        remainingSessions: balance.totalSessions - balance.spentSessions,
        sessionsAdded: sessionsToAdd,
        wasNewBalance: !balance._id // Indicates if this was a newly created balance
      },
        calculation: {
          totalSessions: appointment.totalSessions,
          completedSessions: appointment.completedSessions,
          remainingSessions: remainingSessions,
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
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("Forbidden transition")) {
        return NextResponse.json({ 
          error: "Cannot cancel this appointment in its current status",
          details: error.message 
        }, { status: 400 })
      }
      if (error.message.includes("not found")) {
        return NextResponse.json({ 
          error: "Appointment not found",
          details: error.message 
        }, { status: 404 })
      }
    }
    
    return NextResponse.json({ 
      error: "Error cancelling appointment",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}