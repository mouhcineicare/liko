import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { createAppointment } from "@/lib/api/appointments";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { triggerNewAppointmentEmail } from "@/lib/services/email-triggers";
import { syncAppointmentWithCalendar } from "@/lib/services/google";
import Plan from "@/lib/db/models/Plan";
import { Types } from "mongoose";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
  
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      patient,
      date,
      recurring,
      plan,
      price,
      therapyType,
      status = "unpaid",
      paymentStatus = "pending",
      hasPreferedDate,
      localTimeZone,
    } = await req.json();

    // Validate required fields
    if (!date || !plan || parseFloat(price)<0 || !therapyType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate therapy type
    const validTherapyTypes = ['individual', 'couples', 'kids', 'psychiatry'];
    if (!validTherapyTypes.includes(therapyType)) {
      return NextResponse.json(
        { error: "Invalid therapy type" },
        { status: 400 }
      );
    }

    await connectDB();

    // Get patient data to check for existing therapy assignment
    const patientData = await User.findById(patient || session.user.id);
    console.log('patientData', patientData,'patient id', patient || session.user.id)
    if (!patientData) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }


    const planType = await Plan.findOne({title: plan});

    if(!planType){
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Calculate total sessions based on plan type
    let totalSessions = 1;
    switch (planType?.type) {
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
          totalSessions = 6;
        break;
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
        case 'x11_sessions':
          totalSessions = 11;
        break;
        case 'x12_sessions':
          totalSessions = 12;
        break;
    }

    // Create appointment data
    const appointmentData = {
      patient: patient || session.user.id,
      therapist: (session.user.therapyId ? new Types.ObjectId(session.user.therapyId) : undefined) || (patientData.therapy ? new Types.ObjectId(patientData.therapy.toString()) : undefined), // Use existing therapist if available
      date,
      plan,
      planType: planType.type,
      price,
      therapyType,
      status: patientData.therapy ? "confirmed" : "unpaid", // Auto-approve if patient has therapist
      paymentStatus,
      totalSessions,
      completedSessions: 0,
      // If user has a therapist, mark both accepted and confirmed; otherwise leave isAccepted null
      isConfirmed: patientData.therapy ? true : false,
      isAccepted: patientData.therapy ? true : null,
      recurring: Array.isArray(recurring) ? recurring.map((r: any) => ({
        date: typeof r === 'string' ? r : r?.date,
        status: (typeof r === 'object' && r?.status) ? r.status : 'confirmed',
        payment: (typeof r === 'object' && r?.payment) ? r.payment : 'unpaid',
      })) : [],
      hasPreferedDate,
      localTimeZone,
    };

    const appointment = await createAppointment(appointmentData);

    // If patient has a therapist, sync with Google Calendar
    if (patientData.therapy) {
      const therapist = await User.findById(patientData.therapy);
      if (therapist?.googleRefreshToken) {
        try {
          await syncAppointmentWithCalendar(appointment, therapist, localTimeZone);
        } catch (error) {
          console.error("Error syncing with Google Calendar:", error);
          // Don't fail the request if calendar sync fails
        }
      }
    }

    // Send new appointment email
    await triggerNewAppointmentEmail(appointment);

    return NextResponse.json({
      appointmentId: appointment._id,
      message: "Appointment created successfully",
    });
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      {
        error: "Error creating appointment",
        details: error.message,
      },
      { status: 500 }
    );
  }
}