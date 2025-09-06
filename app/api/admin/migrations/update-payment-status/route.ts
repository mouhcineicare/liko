import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import stripe from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all appointments with checkoutSessionId
    const appointments = await Appointment.find({
      checkoutSessionId: { $exists: true, $ne: null }
    }).lean();

    let updatedCount = 0;
    let failedCount = 0;
    const results = [];

    for (const appointment of appointments) {
      try {
        // Retrieve the Stripe session
        const session = await stripe.checkout.sessions.retrieve(
          appointment.checkoutSessionId,
          { expand: ['payment_intent'] }
        );

        let newPaymentStatus = appointment.paymentStatus;
        
        if (session.payment_status === 'paid') {
          newPaymentStatus = 'completed';
        } else if (['unpaid', 'no_payment_required'].includes(session.payment_status)) {
          newPaymentStatus = 'pending';
        }

        // Only update if status changed
        if (newPaymentStatus !== appointment.paymentStatus) {
          await Appointment.updateOne(
            { _id: appointment._id },
            { $set: { paymentStatus: newPaymentStatus } }
          );
          updatedCount++;
          results.push({
            appointmentId: appointment._id,
            oldStatus: appointment.paymentStatus,
            newStatus: newPaymentStatus,
            success: true
          });
        }
      } catch (error) {
        failedCount++;
        results.push({
          appointmentId: appointment._id,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
        console.error(`Error processing appointment ${appointment._id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} appointments, ${failedCount} failed`,
      totalProcessed: appointments.length,
      updatedCount,
      failedCount,
      results
    });

  } catch (error) {
    console.error("Error updating payment statuses:", error);
    return NextResponse.json(
      { error: "Error updating payment statuses" },
      { status: 500 }
    );
  }
}