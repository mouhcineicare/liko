import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    // Validate query parameters
    if (!start || !end) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    // Parse start and end dates
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Fetch appointments for the specified month
    const appointments = await Appointment.find({
      therapist: session.user.id,
      date: { $gte: startDate, $lte: endDate }, // Filter by date range
      paymentStatus: "completed", // Only fetch completed appointments
    })
      .populate("patient", "fullName email image telephone") // Populate patient details
      .sort({ date: -1 }); // Sort by date in descending order

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 }
    );
  }
}