import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const now = new Date();

    // Get appointment statistics
    const [
      totalAppointments,
      pendingAppointments,
      activeAppointments,
      completedAppointments,
      recentAppointments,
      totalPatients,
      totalTherapists,
    ] = await Promise.all([
      Appointment.countDocuments({}),
      Appointment.countDocuments({ status: "pending" }),
      Appointment.countDocuments({
        date: { $gt: now },
        status: { $in: ["pending_approval", "approved", "in_progress"] },
      }),
      Appointment.countDocuments({ status: "completed" }),
      Appointment.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("patient", "fullName")
        .populate("therapist", "fullName"),
      User.countDocuments({ role: "patient" }),
      User.countDocuments({ role: "therapist" }),
    ]);

    return NextResponse.json({
      totalAppointments,
      pendingAppointments,
      activeAppointments,
      completedAppointments,
      recentAppointments,
      totalPatients,
      totalTherapists,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Error fetching dashboard statistics" },
      { status: 500 }
    );
  }
}
