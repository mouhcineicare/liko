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
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all appointments for this therapist
    const appointments = await Appointment.find({
      therapist: session.user.id,
      paymentStatus: "completed",
      status: "completed"
    })
      .populate("patient", "fullName email image telephone")
      .sort({ date: 1 }); // Sort by date in ascending order (closest first)

    // Group appointments by patient
    const groupedAppointments = appointments.reduce((acc, apt) => {
      const patientId = apt.patient._id.toString();
      if (!acc[patientId]) {
        acc[patientId] = {
          patient: apt.patient,
          appointments: [],
          collapsed: false, // Add collapsed state for frontend
        };
      }
      acc[patientId].appointments.push(apt);
      return acc;
    }, {});

    // Process appointments to include session information
    for (const patientId in groupedAppointments) {
      const group = groupedAppointments[patientId];

      // Sort appointments for each patient by date (closest first)
      group.appointments.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Add session information to each appointment
      group.appointments = group.appointments.map((apt) => {
        let totalSessions = apt.totalSessions;
        apt.isConfirmed = apt.isConfirmed;
        return {
          ...apt.toObject(),
          totalSessions,
          completedSessions: apt.completedSessions || 0,
        };
      });
    }

    return NextResponse.json(groupedAppointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 }
    );
  }
}