import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all completed appointments that haven't been paid to therapists
    const completedAppointments = await Appointment.find({
      status: "completed",
      paymentStatus: "completed",
      therapistPaid: { $ne: true }
    })
    .populate("therapist", "fullName")
    .populate("patient", "fullName")
    .sort({ date: -1 }); // Sort by date in descending order (newest first)

    return NextResponse.json(completedAppointments);
  } catch (error) {
    console.error("Error fetching completed unpaid appointments:", error);
    return NextResponse.json(
      { error: "Error fetching completed unpaid appointments" },
      { status: 500 }
    );
  }
}