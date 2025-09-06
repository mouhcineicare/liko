export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import TherapistPayment from "@/lib/db/models/TherapistPayment";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get total paid amount
    const totalPaid = await TherapistPayment.aggregate([
      {
        $match: {
          therapist: session.user.id,
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

    // Get pending amount from completed appointments not yet paid
    const pendingAmount = await Appointment.aggregate([
      {
        $match: {
          therapist: session.user.id,
          status: "completed",
          paymentStatus: "completed",
          therapistPaid: { $ne: true }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$price" }
        }
      }
    ]);

    // Get pending appointments count
    const pendingAppointments = await Appointment.countDocuments({
      therapist: session.user.id,
      status: "completed",
      paymentStatus: "completed",
      therapistPaid: { $ne: true }
    });

    // Get total completed appointments
    const completedAppointments = await Appointment.countDocuments({
      therapist: session.user.id,
      status: "completed"
    });

    return NextResponse.json({
      totalPaid: totalPaid[0]?.total || 0,
      totalPending: pendingAmount[0]?.total || 0,
      pendingAppointments,
      completedAppointments
    });
  } catch (error) {
    console.error("Error fetching payment summary:", error);
    return NextResponse.json(
      { error: "Error fetching payment summary" },
      { status: 500 }
    );
  }
}