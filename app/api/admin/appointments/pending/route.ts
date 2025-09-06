import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    await connectDB();
    const [appointments, total] = await Promise.all([
      Appointment.find({
        therapist: { $ne: null },
        paymentStatus: "completed",
      })
        .populate("patient", "fullName")
        .populate("therapist", "fullName image")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
        
      Appointment.countDocuments({
        therapist: { $ne: null },
        status: "pending",
        paymentStatus: "completed",
      })
    ]);

    return NextResponse.json({
      appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching pending appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 }
    );
  }
}