import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import TherapistPayoutInfo from "@/lib/db/models/TherapistPayoutInfo";
import Appointment from "@/lib/db/models/Appointment";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import mongoose from "mongoose";
import { verifyStripePayment } from "@/lib/stripe/verification";

export const dynamic = "force-dynamic";

function getDefaultPayoutDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function isPaymentVerified(appointment: any): Promise<boolean> {
  // Balance appointments are always verified
  if (appointment.isBalance) {
    return true;
  }

  // Manual payments marked as completed
  if (appointment.paymentStatus === 'completed' && appointment.paymentMethod === 'manual') {
    return true;
  }

  // Check Stripe payments using both checkout session and payment intent IDs
  const verification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
  return verification.paymentStatus === 'paid';
}

async function calculatePendingAmount(therapistId: mongoose.Types.ObjectId): Promise<number> {
  // Get all completed appointments that haven't been paid to therapist
  const appointments = await Appointment.find({
    therapist: therapistId,
    status: "completed",
    $or: [
      { therapistPaid: false },
      { therapistPaid: { $exists: false } }
    ]
  }).lean();

  let totalPending = 0;

  for (const appointment of appointments) {
    const isVerified = await isPaymentVerified(appointment);
    if (!isVerified) continue;

    // Calculate therapist's share based on total sessions
    const totalSessions = appointment.totalSessions || 1;
    const therapistPercentage = totalSessions >= 9 ? 0.57 : 0.5;
    const sessionValue = appointment.price / totalSessions;
    
    // Count how many sessions are completed but not paid
    let unpaidSessions = 0;
    
    // Check main appointment session
    if (appointment.status === 'completed') {
      unpaidSessions += 1;
    }
    
    // Check recurring sessions
    if (Array.isArray(appointment.recurring)) {
      unpaidSessions += appointment.recurring.filter(s => {
        const session = typeof s === 'string' ? 
          { status: 'completed', payment: 'not_paid' } : s;
        return session.status === 'completed' && 
               (session.payment === 'not_paid' || !session.payment);
      }).length;
    }

    totalPending += sessionValue * unpaidSessions * therapistPercentage;
  }

  return totalPending;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const therapistId = new mongoose.Types.ObjectId(session.user.id);

    // Get payout settings
    const payoutInfo = await TherapistPayoutInfo.findOne({
      therapist: therapistId
    }).select("payoutSettings");

    // Calculate default payout date if not set
    let expectedPayoutDate = payoutInfo?.payoutSettings?.expectedPayoutDate;
    if (!expectedPayoutDate) {
      expectedPayoutDate = getDefaultPayoutDate();
    }

    // Get total paid amount
    const paidPayments = await TherapistPayment.aggregate([
      {
        $match: {
          therapist: therapistId,
          status: "completed"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    // Calculate pending amount
    const totalPending = await calculatePendingAmount(therapistId);

    // Counts for debugging
    const paidCount = await TherapistPayment.countDocuments({
      therapist: therapistId,
      status: "completed"
    });

    const pendingAppointments = await Appointment.countDocuments({
      therapist: therapistId,
      status: "completed",
      $or: [
        { therapistPaid: false },
        { therapistPaid: { $exists: false } }
      ]
    });

    return NextResponse.json({
      expectedPayoutDate: expectedPayoutDate,
      payoutFrequency: payoutInfo?.payoutSettings?.schedule || 'weekly',
      totalPaid: paidPayments[0]?.total || 0 / 2,
      totalPending: totalPending / 2,
      isManual: payoutInfo?.payoutSettings?.schedule === 'manual',
      debug: {
        paidCount : paidCount/2,
        pendingAppointments: pendingAppointments/2
      }
    });
  } catch (error) {
    console.error("Error fetching payout data:", error);
    return NextResponse.json(
      { error: "Failed to fetch payout data" },
      { status: 500 }
    );
  }
}