import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { verifyStripePayment } from '@/lib/stripe/verification';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    // First get all pending appointments
    const appointments = await Appointment.find({
      therapist: session.user.id,
      isAccepted: false
    })
    .populate('patient', 'fullName')
    .sort({ createdAt: -1 });

    // Verify payments for each appointment and filter
    const verifiedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        // Check if payment is covered by balance
        if (appointment.isBalance) {
          return {
            ...appointment.toObject(),
            isStripeVerified: true,
            paymentStatus: 'paid_by_balance',
            subscriptionStatus: 'none',
            isSubscriptionActive: false
          };
        }

        // Otherwise verify Stripe payment
        const verification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
        
        // Check if payment was successful
        const isPaymentVerified = verification.paymentStatus === 'paid';
        
        if (isPaymentVerified) {
          return {
            ...appointment.toObject(),
            isStripeVerified: true,
            paymentStatus: verification.paymentStatus,
            subscriptionStatus: verification.subscriptionStatus,
            isSubscriptionActive: verification.paymentStatus === 'paid'
          };
        }
        return null;
      })
    );

    // Filter out null values (unverified appointments)
    const filteredAppointments = verifiedAppointments.filter(appt => appt !== null);

    return NextResponse.json(filteredAppointments);
  } catch (error) {
    console.error("Error fetching appointment requests:", error);
    return NextResponse.json(
      { error: "Error fetching appointment requests" },
      { status: 500 }
    );
  }
}