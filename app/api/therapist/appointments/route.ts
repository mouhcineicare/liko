import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import Plan from "@/lib/db/models/Plan";
import { createAppointment } from "@/lib/api/appointments";

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
    })
      .populate("patient", "fullName email image telephone")
      .sort({ date: -1 }); // Sort by date in descending order (newest first)

    // Process appointments to include session information
    const processedAppointments = appointments.map(apt => {
      // Determine total sessions based on plan type
      let totalSessions = 1; // Default to 1
    switch (apt.planType) {
      case 'x2_sessions':
        totalSessions = 2;
        break;
      case 'x3_sessions':
        totalSessions = 3;
        break;
      case 'x4_sessions':
        totalSessions = 4;
        break;
      case 'x5_sessions':
        totalSessions = 5;
        break;
      case 'x6_sessions':
        totalSessions = 6; // Default monthly sessions
      case 'x7_sessions':
        totalSessions = 7;
        break;
      case 'x8_sessions':
          totalSessions = 8;
         break;
      case 'x9_sessions':
          totalSessions = 9;
          break;
      case 'x10_sessions':
          totalSessions = 10;
          break;
      case 'x12_sessions':
          totalSessions = 12;
          break;
      case 'x12_sessions':
          totalSessions = 12;
          break;
    }
      return {
        ...apt.toObject(),
        totalSessions,
        completedSessions: apt.completedSessions || 0,
      };
    });

    return NextResponse.json(processedAppointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Error fetching appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    const { patientId, planId, sessions, price, meetingLink, reason } = body
    if (!patientId || !planId || !sessions || !Array.isArray(sessions) || sessions.length === 0 || price === undefined || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await connectDB()

    // Verify patient exists
    const patient = await User.findById(patientId)
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Verify plan exists
    const plan = await Plan.findById(planId)
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    // Validate sessions
    const validatedSessions = sessions.map((session: any) => {
      const date = new Date(session.date)
      if (isNaN(date.getTime())) {
        throw new Error("Invalid session date")
      }
      return { date: date.toISOString(), status: 'in_progress', payment: 'not_paid' }
    })

    const patientTimeZone = await User.findById(patientId)

    // Prepare recurring sessions array with new structure
    const recurringSessions = validatedSessions;

    // Create new appointment
    const newAppointment = {
      patient: patientId,
      therapist: session.user.id,
      date: new Date(sessions[0].date), // First session is the main date
      status: 'approved',
      paymentStatus: 'completed',
      plan: plan.title,
      planType: plan.type,
      price,
      therapyType: plan.therapyType,
      meetingLink: meetingLink || "",
      totalSessions: sessions.length,
      completedSessions: 0,
      recurring: recurringSessions,
      isConfirmed: true,
      hasPreferedDate: false,
      localTimeZone: patientTimeZone.timeZone || "Asia/Dubai",
      reason: reason
    }

    await createAppointment(newAppointment)

    // Update patient's therapy if not already set
    if (!patient.therapy) {
      patient.therapy = session.user.id
      await patient.save()
    }

    return NextResponse.json({
      message: "Appointment created successfully",
      appointment: newAppointment,
    })
  } catch (error) {
    console.error("Error creating appointment:", error)
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }
}