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

    const { appointmentId, charge, reduceSession, dedupeKey } = await req.json()

    if (!appointmentId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Check for idempotency if dedupeKey is provided
    if (dedupeKey) {
      const existingRefund = await Balance.findOne({
        user: session.user.id,
        'history.reason': { $regex: `dedupeKey:${dedupeKey}` }
      });
      
      if (existingRefund) {
        console.log('Refund already processed for dedupeKey:', dedupeKey);
        return NextResponse.json({ 
          message: "Refund already processed",
          dedupeKey 
        });
      }
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

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ 
        error: "Appointment is already cancelled",
        details: {
          appointmentId,
          currentStatus: appointment.status,
          message: "This appointment has already been cancelled and cannot be cancelled again."
        }
      }, { status: 400 })
    }

    // Check if appointment is already completed
    if (appointment.status === 'completed') {
      return NextResponse.json({ 
        error: "Cannot cancel completed appointment",
        details: {
          appointmentId,
          currentStatus: appointment.status,
          message: "This appointment has already been completed and cannot be cancelled."
        }
      }, { status: 400 })
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

    // Use refund calculator for accurate refunds based on payment breakdown
    let refundResult;
    let sessionsToAdd;
    
    // Simplified refund calculation (avoiding complex imports for now)
    const DEFAULT_BALANCE_RATE = 90;
    
    // Determine refund policy
    let refundMultiplier: number;
    if (reduceSession > 0) {
      refundMultiplier = reduceSession;
    } else if (charge) {
      refundMultiplier = 0.5;
    } else {
      refundMultiplier = 1.0;
    }
    
    // Calculate refund based on payment method and stored payment breakdown
    if (appointment.payment && appointment.payment.method) {
      // Use stored payment breakdown for accurate refunds
      const payment = appointment.payment;
      
      if (payment.method === 'balance') {
        // Payment was made with balance - refund based on sessions deducted
        sessionsToAdd = remainingSessions * refundMultiplier;
      } else if (payment.method === 'stripe') {
        // Payment was made with Stripe - refund based on stored session units
        const remainingUnits = (payment.sessionsPaidWithStripe || 0) - (payment.refundedUnitsFromStripe || 0);
        sessionsToAdd = remainingUnits * refundMultiplier;
      } else if (payment.method === 'mixed') {
        // Mixed payment - refund from both sources
        const remainingBalanceUnits = (payment.sessionsPaidWithBalance || 0) - (payment.refundedUnitsFromBalance || 0);
        const remainingStripeUnits = (payment.sessionsPaidWithStripe || 0) - (payment.refundedUnitsFromStripe || 0);
        const totalRemainingUnits = remainingBalanceUnits + remainingStripeUnits;
        sessionsToAdd = totalRemainingUnits * refundMultiplier;
      }
    } else {
      // Fallback to legacy calculation for old appointments
      if (appointment.isBalance) {
        sessionsToAdd = remainingSessions * refundMultiplier;
      } else {
        const perSessionPrice = appointment.price / (appointment.totalSessions || 1);
        const perSessionPriceInSessions = perSessionPrice / DEFAULT_BALANCE_RATE;
        sessionsToAdd = perSessionPriceInSessions * refundMultiplier;
      }
    }
    
    // Round to 2 decimal places to avoid floating point issues
    sessionsToAdd = Math.round(sessionsToAdd * 100) / 100;
    
    refundResult = { 
      fromBalance: sessionsToAdd, 
      fromStripe: 0, 
      moneyRefund: 0, 
      sessionUnitsRefunded: sessionsToAdd 
    };
    
    console.log('Session refund calculation:', {
      appointmentId,
      refundMultiplier,
      refundResult,
      appointmentData: {
        sessionCount: appointment.sessionCount || appointment.totalSessions,
        sessionUnitsTotal: appointment.sessionUnitsTotal || (appointment.price / 90),
        completedSessions: appointment.completedSessions,
        payment: appointment.payment,
        isBalance: appointment.isBalance,
        price: appointment.price,
        totalSessions: appointment.totalSessions
      },
      charge,
      reduceSession,
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
    const paymentMethod = appointment.isBalance ? 'balance' : 'stripe';
    const refundAmount = appointment.isBalance ? 
      `${remainingSessions} sessions` : 
      `${appointment.price} AED (${sessionsToAdd} sessions)`;
    
    const reason = charge ? 
      `Appointment cancellation (50% charge applied) - ${refundAmount} refunded as ${sessionsToAdd} sessions (${paymentMethod} payment)` :
      `Appointment cancellation (full refund) - ${refundAmount} refunded as ${sessionsToAdd} sessions (${paymentMethod} payment)`;
    
    const historyItem = {
      action: "added",
      sessions: sessionsToAdd,
      plan: appointment.plan, // Use the plan title/name from appointment, not the plan ID
      reason: dedupeKey ? `${reason} dedupeKey:${dedupeKey}` : reason,
      createdAt: new Date()
    };
    
    console.log('Adding history item:', JSON.stringify(historyItem, null, 2));
    // Don't push to balance.history - we'll use raw MongoDB operations instead

    // Use new status system for cancellation
    const { updateAppointmentStatus } = await import("@/lib/services/appointments/legacy-wrapper");
    const { APPOINTMENT_STATUSES, LEGACY_STATUS_MAPPING } = await import("@/lib/utils/statusMapping");

    // Double-check status before attempting transition (extra safety)
    if (appointment.status === 'cancelled') {
      console.log('Appointment already cancelled, skipping status transition');
      return NextResponse.json({
        message: "Appointment is already cancelled",
        appointment: {
          _id: appointment._id,
          status: appointment.status,
          date: appointment.date,
          price: appointment.price
        },
        balance: {
          totalSessions: balance.totalSessions,
          remainingSessions: balance.totalSessions - balance.spentSessions,
          sessionsAdded: 0,
          wasNewBalance: !balance._id
        }
      });
    }

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
          originalStatus: appointment.status
        }
      }
    );

    // Save balance changes using raw MongoDB operations to avoid schema issues
    try {
      console.log('Attempting to update balance with:', {
        balanceId: balance._id,
        sessionsToAdd,
        historyItem: JSON.stringify(historyItem, null, 2)
      });

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
        throw new Error(`Failed to update balance: ${saveError.message}`);
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