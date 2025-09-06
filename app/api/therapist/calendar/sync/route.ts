import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import Appointment from "@/lib/db/models/Appointment";
import { syncAppointmentWithCalendar } from "@/lib/services/google";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get therapist with refresh token
    const therapist = await User.findById(session.user.id);
    if (!therapist || !therapist.googleRefreshToken) {
      return NextResponse.json(
        { error: "Calendar not connected" },
        { status: 400 }
      );
    }

    // Get all approved appointments for this therapist
    const appointments = await Appointment.find({
      therapist: session.user.id,
      status: { $in: ["approved", "in_progress"] },
      date: { $gte: new Date() }, // Only future appointments
    }).populate("patient", "fullName email");

    // Sync each appointment
    const syncPromises = appointments.map((appointment) =>
      syncAppointmentWithCalendar(appointment, therapist)
    );

    await Promise.all(syncPromises);

    return NextResponse.json({
      message: "Appointments synced successfully",
      count: appointments.length,
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json(
      { error: "Error syncing calendar" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: "POST, OPTIONS",
    },
  });
}
