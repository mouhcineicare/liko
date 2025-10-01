import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import Appointment from "@/lib/db/models/Appointment"
import { Balance } from "@/lib/db/models"
import Plan from "@/lib/db/models/Plan"
import { isPast } from "date-fns"
import mongoose from "mongoose"

export async function POST(req: Request) {
  // Set a timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
  });

  const cancellationPromise = (async () => {
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
        user: new mongoose.Types.ObjectId(session.user.id),
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
    let balance = await Balance.findOne({ user: new mongoose.Types.ObjectId(session.user.id) })
    console.log('Balance lookup result:', {
      userId: session.user.id,
      balanceFound: !!balance,
      balanceData: balance ? {
        balanceAmount: balance.balanceAmount
      } : null
    })
    
    if (!balance) {
      // Create new balance with default values
      balance = new Balance({
        user: new mongoose.Types.ObjectId(session.user.id),
        balanceAmount: 0
      })
      await balance.save()
      console.log('Created and saved new balance for user:', session.user.id)
    }

    // Determine refund policy
    let refundMultiplier: number;
    if (reduceSession > 0) {
      refundMultiplier = reduceSession;
    } else if (charge) {
      refundMultiplier = 0.5;
    } else {
      refundMultiplier = 1.0;
    }
    
    // Calculate refund amount based on payment method and remaining sessions
    let refundAmount = 0;
    
    console.log('Refund calculation inputs:', {
      appointmentPrice: appointment.price,
      paymentMethod: appointment.payment?.method,
      isBalance: appointment.isBalance,
      charge,
      refundMultiplier,
      totalSessions: appointment.totalSessions,
      completedSessions: appointment.completedSessions,
      remainingSessions,
      requestPayload: {
        appointmentId,
        charge,
        reduceSession,
        dedupeKey
      },
      fullAppointmentData: {
        _id: appointment._id,
        price: appointment.price,
        payment: appointment.payment,
        isBalance: appointment.isBalance,
        plan: appointment.plan,
        status: appointment.status
      }
    });

    // Calculate refund based on appointment price (not remaining sessions)
    const effectivePrice = appointment.price > 0 ? appointment.price : 
      (appointment.payment?.unitPrice || appointment.payment?.sessionsPaidWithBalance || appointment.payment?.sessionsPaidWithStripe || 0);
    
    refundAmount = effectivePrice * refundMultiplier;
    
    console.log('Refund calculation:', {
      appointmentPrice: appointment.price,
      effectivePrice,
      refundMultiplier,
      refundAmount,
      paymentMethod: appointment.payment?.method,
      isBalance: appointment.isBalance
    });
    
    // Round to 2 decimal places to avoid floating point issues
    refundAmount = Math.round(refundAmount * 100) / 100;
    
    console.log('FINAL REFUND CALCULATION:', {
      appointmentId,
      appointmentPrice: appointment.price,
      appointmentPriceType: typeof appointment.price,
      refundMultiplier,
      refundAmount,
      refundAmountType: typeof refundAmount,
      willUpdateBalance: refundAmount > 0,
      paymentMethod: appointment.payment?.method,
      isBalance: appointment.isBalance,
      appointmentData: {
        _id: appointment._id,
        price: appointment.price,
        plan: appointment.plan,
        payment: appointment.payment,
        isBalance: appointment.isBalance,
        totalSessions: appointment.totalSessions,
        completedSessions: appointment.completedSessions
      }
    });
    
    const refundResult = { 
      fromBalance: refundAmount, 
      fromStripe: 0, 
      moneyRefund: 0, 
      amountRefunded: refundAmount 
    };
    
    console.log('Refund calculation:', {
      appointmentId,
      refundMultiplier,
      refundResult,
      appointmentData: {
        sessionCount: appointment.sessionCount || appointment.totalSessions,
        completedSessions: appointment.completedSessions,
        payment: appointment.payment,
        isBalance: appointment.isBalance,
        price: appointment.price,
        totalSessions: appointment.totalSessions
      },
      charge,
      reduceSession,
      refundAmount,
      debugInfo: {
        paymentMethod: appointment.payment?.method,
        sessionsPaidWithBalance: appointment.payment?.sessionsPaidWithBalance,
        unitPrice: appointment.payment?.unitPrice,
        remainingUnits: appointment.payment ? (appointment.payment.sessionsPaidWithBalance || 0) - (appointment.payment.refundedUnitsFromBalance || 0) : 'N/A',
        calculatedRemainingAmount: appointment.payment ? ((appointment.payment.sessionsPaidWithBalance || 0) - (appointment.payment.refundedUnitsFromBalance || 0)) * (appointment.payment.unitPrice || appointment.price) : 'N/A'
      }
    });

    // Note: Balance will be updated via MongoDB $inc operation below
    // Don't update in memory to avoid double increment
    
    // Update refunded units in appointment payment record
    if (appointment.payment && appointment.payment.method && refundAmount > 0) {
      const unitsRefunded = refundAmount / (appointment.payment.unitPrice || appointment.price);
      
      if (appointment.payment.method === 'balance') {
        appointment.payment.refundedUnitsFromBalance = (appointment.payment.refundedUnitsFromBalance || 0) + unitsRefunded;
      } else if (appointment.payment.method === 'mixed') {
        appointment.payment.refundedUnitsFromBalance = (appointment.payment.refundedUnitsFromBalance || 0) + unitsRefunded;
      }
      
      // Save the appointment with updated refund tracking
      await appointment.save();
    }
    
    // Find the plan associated with the appointment for history record
    // Try to find plan by title first, then by plan ID if appointment has planId
    let plan = null;
    if (appointment.plan) {
      plan = await Plan.findOne({ title: appointment.plan });
    }
    
    // Add history record
    const paymentMethod = appointment.isBalance ? 'balance' : 'stripe';
    
    const reason = charge ? 
      `Appointment cancellation (50% charge applied) - ${refundAmount} AED refunded (${paymentMethod} payment)` :
      `Appointment cancellation (full refund) - ${refundAmount} AED refunded (${paymentMethod} payment)`;
    
    const historyItem = {
      action: "added" as const,
      amount: refundAmount,
      plan: appointment.plan,
      reason: dedupeKey ? `${reason} dedupeKey:${dedupeKey}` : reason,
      createdAt: new Date(),
      date: new Date(),
      appointmentId: appointmentId,
      type: "refund",
      description: `Appointment cancellation refund - ${appointment.plan || 'Unknown Plan'}`,
      surcharge: 0
    };
    
    console.log('Adding history item:', JSON.stringify(historyItem, null, 2));
    // Don't push to balance.history - we'll use raw MongoDB operations instead

    // Simple status update - bypass complex transition system for now
    console.log('Updating appointment status to cancelled');
    
    // Status check already done earlier, proceed with cancellation

    // Simple status update
    appointment.status = 'cancelled';
    await appointment.save();
    
    const updatedAppointment = appointment;

    // SIMPLE BALANCE UPDATE - Use balanceAmount as source of truth
    let balanceUpdateSuccess = false;
    let balanceUpdateError: unknown = null;
    let finalBalanceAmount = balance.balanceAmount;

    console.log('BALANCE UPDATE START:', {
      refundAmount,
      currentBalance: balance.balanceAmount,
      willUpdate: refundAmount > 0,
      balanceId: balance._id,
      balanceIdType: typeof balance._id,
      userId: session.user.id,
      userIdType: typeof session.user.id,
      charge,
      refundMultiplier,
      balanceDocument: {
        _id: balance._id,
        user: balance.user,
        balanceAmount: balance.balanceAmount
      }
    });

    if (refundAmount > 0) {
      try {
        console.log('Updating balance amount:', {
          currentBalance: balance.balanceAmount,
          refundAmount,
          newBalance: balance.balanceAmount + refundAmount
        });

        // Update balance using MongoDB updateOne to avoid schema issues
        const updateResult = await Balance.updateOne(
          { user: new mongoose.Types.ObjectId(session.user.id) },
          {
            $inc: { balanceAmount: refundAmount },
            $set: { updatedAt: new Date() }
          }
        );
        
        console.log('MongoDB update result:', {
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          acknowledged: updateResult.acknowledged
        });
        
        // Update the local balance object for response
        balance.balanceAmount += refundAmount;
        
        finalBalanceAmount = balance.balanceAmount;
        balanceUpdateSuccess = true;
        console.log('Balance updated successfully:', {
          oldBalance: balance.balanceAmount - refundAmount,
          refundAmount,
          newBalance: finalBalanceAmount
        });
      } catch (updateError) {
        console.error('Error updating balance:', updateError);
        balanceUpdateError = updateError;
        throw new Error(`Failed to update balance: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
      }
    } else {
      console.log('No balance update needed - refund amount is 0');
      balanceUpdateSuccess = true; // No update needed is still success
    }

    // Verify balance was actually updated in database
    let verifiedBalanceAmount = finalBalanceAmount;
    if (balanceUpdateSuccess) {
      try {
        const verificationBalance = await Balance.findOne({ user: new mongoose.Types.ObjectId(session.user.id) });
        if (verificationBalance) {
          verifiedBalanceAmount = verificationBalance.balanceAmount;
          console.log('Balance verification:', {
            expectedBalance: finalBalanceAmount,
            actualBalance: verifiedBalanceAmount,
            match: finalBalanceAmount === verifiedBalanceAmount
          });
        }
      } catch (verifyError) {
        console.error('Balance verification failed:', verifyError);
      }
    }

    console.log('Cancellation completed successfully, sending response');
    
    // Determine the response message based on balance update success
    let responseMessage = "Appointment cancelled successfully";
    if (balanceUpdateSuccess) {
      responseMessage += " and balance added successfully";
    } else {
      responseMessage += " but balance update failed";
    }
    
    return NextResponse.json({
      message: responseMessage,
      appointment: {
        _id: updatedAppointment._id,
        status: updatedAppointment.status,
        date: updatedAppointment.date,
        price: updatedAppointment.price,
        remainingSessionsBeforeCancel: remainingSessions
      },
      balance: {
        balanceAmount: verifiedBalanceAmount, // Show verified balance from database
        amountRefunded: refundAmount,
        wasNewBalance: !balance._id, // Indicates if this was a newly created balance
        updateSuccess: balanceUpdateSuccess,
        updateError: balanceUpdateError ? (balanceUpdateError instanceof Error ? balanceUpdateError.message : 'Unknown error') : null,
        verification: {
          expectedBalance: finalBalanceAmount,
          actualBalance: verifiedBalanceAmount,
          match: finalBalanceAmount === verifiedBalanceAmount
        }
      },
      calculation: {
          totalSessions: appointment.totalSessions,
          completedSessions: appointment.completedSessions,
          remainingSessions: remainingSessions,
        chargeApplied: charge,
        finalAmountRefunded: refundAmount
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
  })();

  try {
    return await Promise.race([cancellationPromise, timeoutPromise]);
  } catch (error) {
    console.error("Cancellation failed:", error);
    return NextResponse.json({ 
      error: "Cancellation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}