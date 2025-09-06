import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import PatientOnboarding from "@/lib/db/models/PatientOnboarding";
import Appointment from "@/lib/db/models/Appointment";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapistId = session.user.id;
    const patientId = params.id;

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is missing" }, { status: 400 });
    }

    await connectDB();

    // Verify the therapist has appointments with this patient
    const hasAppointments = await Appointment.findOne({
      therapist: therapistId,
      patient: patientId
    });

    if (!hasAppointments) {
      return NextResponse.json({ error: "No appointments found with this patient" }, { status: 404 });
    }

    // Get patient onboarding data
    const onboarding = await PatientOnboarding.findOne({ patient: patientId });

    if (!onboarding) {
      return NextResponse.json({ 
        responses: [],
        message: "No onboarding data found for this patient"
      });
    }

    return NextResponse.json({
      responses: onboarding.responses,
      completedAt: onboarding.createdAt
    });

  } catch (error) {
    console.error("Error fetching patient onboarding:", error);
    return NextResponse.json(
      { error: "Error fetching patient onboarding data" },
      { status: 500 }
    );
  }
}
