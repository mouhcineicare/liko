import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const therapistId = params.id;
    if (!therapistId) {
      return NextResponse.json(
        { error: "Therapist ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find all active appointments for this therapist
    const activeAppointments = await Appointment.find({
      therapist: therapistId,
      status: { $in: ["pending", "pending_approval", "approved", "in_progress"] },
      paymentStatus: "completed"
    }).distinct("patient");

    // Count unique patients
    const patientCount = activeAppointments.length;

    // Get therapist details to check their patient limit
    const therapist = await User.findById(therapistId);
    const patientLimit = therapist?.weeklyPatientsLimit || 0;

    return NextResponse.json({
      patientCount,
      patientLimit,
      hasReachedLimit: patientCount >= patientLimit
    });
  } catch (error) {
    console.error("Error fetching therapist patients:", error);
    return NextResponse.json(
      { error: "Failed to fetch therapist patients" },
      { status: 500 }
    );
  }
}
