import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get pagination parameters from URL
    const url = new URL(req.url)
    const skip = Number.parseInt(url.searchParams.get("skip") || "0")
    const limit = Number.parseInt(url.searchParams.get("limit") || "4") // Default to 4 appointments

    // Get total count for pagination - only count completed appointments
    const totalCount = await Appointment.countDocuments({
      patient: session.user.id,
      status: "completed" // Only count completed appointments
    })

    // Get paginated appointments - only completed appointments
    const appointments = await Appointment.find({
      patient: session.user.id,
      status: "completed" // Only get completed appointments
    })
      .populate("therapist", "fullName image _id profile googleCalendarId googleRefreshToken date")
      .sort({ date: -1 }) // Sort by date descending (most recent first)
      .skip(skip)
      .limit(limit)

    return NextResponse.json({
      appointments,
      total: totalCount,
      ok: true,
    })
  } catch (error) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json({ error: "Error fetching appointments" }, { status: 500 })
  }
}


export async function PUT(req: Request) {
  try {
    const { appointmentId, newDate } = await req.json();

    if (!appointmentId || !newDate) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await connectDB();

    // Update the appointment's date in the database
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { date: newDate, isDateUpdated: true }, // Set isDateUpdated to true
      { new: true }
    );

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, appointment: updatedAppointment });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}