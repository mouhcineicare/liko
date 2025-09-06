import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { normalizeAppointmentSessions } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get("appointmentId");

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    // Find the appointment with therapist data
    const appointment = await Appointment.findById(appointmentId)
      .populate("therapist", "level")
      .populate("patient", "fullName email");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Find all payments that include this appointment's sessions
    const payments = await TherapistPayment.find({
      "appointments": appointmentId
    });

    // Extract all paid session IDs
    const paidSessionIds = new Set();
    payments.forEach(payment => {
      payment.sessions.forEach((sessionId: any) => {
        if (sessionId.startsWith(`${appointmentId}-`)) {
          paidSessionIds.add(sessionId);
        }
      });
    });

    // Calculate session price
    const sessionPrice = appointment.price / appointment.totalSessions;
    const therapistLevel = (appointment.therapist as any)?.level || 1;
    const paymentPercentage = therapistLevel === 2 ? 0.57 : 0.5;

    // Use normalization utility for robust session handling
    const normalizedSessions = normalizeAppointmentSessions(
      appointment.date,
      appointment.recurring,
      appointment.price,
      appointment.totalSessions
    ).map((sess, idx) => ({
      ...sess,
      _id: `${appointment._id}-${idx}`,
      isPaid: false, // You can update this if you want to check paidSessionIds
      adjustedPrice: sess.price * paymentPercentage
    }));
    // Mark paid sessions
    normalizedSessions.forEach(sess => {
      if (sess._id && paidSessionIds.has(sess._id)) {
        sess.isPaid = true;
      }
    });

    return NextResponse.json({
      success: true,
      sessions: normalizedSessions,
      therapistLevel,
      sessionPrice,
      paymentPercentage,
      appointment: {
        _id: appointment._id,
        plan: appointment.plan,
        patient: appointment.patient,
        totalSessions: appointment.totalSessions,
        totalPrice: appointment.price
      }
    });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load session data" },
      { status: 500 }
    );
  }
}