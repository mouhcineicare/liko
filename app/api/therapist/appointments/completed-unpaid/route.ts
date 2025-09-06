export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";


export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all completed appointments that have been validated by therapist but not paid yet
    const completedUnpaidAppointments = await Appointment.find({
      therapist: session.user.id,
      status: "completed",
      paymentStatus: "completed",
      therapistValidated: true,
      therapistPaid: { $ne: true }
    }).sort({ date: -1 }); // Sort by date in descending order (newest first)

    return NextResponse.json(completedUnpaidAppointments);
  } catch (error) {
    console.error("Error fetching completed unpaid appointments:", error);
    return NextResponse.json(
      { error: "Error fetching completed unpaid appointments" },
      { status: 500 }
    );
  }
}