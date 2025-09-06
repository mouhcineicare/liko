import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export const dynamic = 'force-dynamic';
// Define the route with the correct parameter
export async function GET(
  req: Request,
  { params }: { params: { id: string } } // Ensure patientId is extracted from params
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapistId = session.user.id;
    const patientId = params.id; // Extract patientId from params

    // Verify the therapist is accessing their own data
    if (therapistId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is missing" }, { status: 400 });
    }

    await connectDB();

    // Get all appointments for this patient with this therapist
    const appointments = await Appointment.find({
      therapist: therapistId,
      patient: patientId,
    })
      .populate("patient", "fullName email telephone") // Populate patient details
      .populate("therapist", "fullName email specialties summary"); // Populate therapist details

    if (!appointments || appointments.length === 0) {
      return NextResponse.json(
        { error: "No appointments found for this patient" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: appointments,
      ok: true,
    });
  } catch (error) {
    console.error("Error fetching patient appointments:", error);
    return NextResponse.json(
      { error: "Error fetching patient appointments" },
      { status: 500 }
    );
  }
}