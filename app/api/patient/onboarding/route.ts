import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import PatientOnboarding from "@/lib/db/models/PatientOnboarding";
import { triggerAccountConfirmationEmail, triggerNewAppointmentEmail, triggerNewRegistrationEmail } from "@/lib/services/email-triggers";
import User from "@/lib/db/models/User";
import Appointment from "@/lib/db/models/Appointment";
import { createAppointment } from "@/lib/api/appointments";



export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const onboarding = await PatientOnboarding.findOne({ patient: session.user.id });

    if (!onboarding) {
      return NextResponse.json({ responses: [] });
    }

    return NextResponse.json(onboarding);
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    return NextResponse.json(
      { error: "Error fetching onboarding data" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { responses } = await req.json();
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "Invalid responses data" },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Find existing onboarding or create new one
    let onboarding = await PatientOnboarding.findOne({ patient: session.user.id });
    
    if (onboarding) {
      // Update existing responses
      onboarding.responses = responses as any;
      await onboarding.save();
    } else {
      // Create new onboarding record
      onboarding = new PatientOnboarding({
        patient: session.user.id,
        responses
      });
      await onboarding.save();
    }

    return NextResponse.json({
      message: "Onboarding data updated successfully",
      onboarding
    });
  } catch (error) {
    console.error("Error updating onboarding data:", error);
    return NextResponse.json(
      { error: "Error updating onboarding data" },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const { email, password, fullName, telephone, responses, appointmentData } = await req.json();

    if (!email || !password || !fullName || !telephone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    // Create user - password will be hashed by the model's pre-save middleware
    const user = new User({
      email: email.toLowerCase(),
      password,
      fullName,
      telephone,
      role: "patient",
      status: "pending",
      initialPlan: {
        plan: appointmentData.plan,
        therapyType: appointmentData.therapyType,
      }
    });

    await user.save();

      // Send confirmation email
      await triggerAccountConfirmationEmail(user);
      // Notify admin about new registration
      await triggerNewRegistrationEmail(user);
      
    let appointment;

    if(appointmentData){
      let totalSessions = 1;
    switch (appointmentData?.planType) {
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
  
    const appointmentD = {
      patient: user._id,
      date: appointmentData.date,
      plan: appointmentData.plan,
      planType: appointmentData.planType,
      price: appointmentData.price,
      therapyType: appointmentData.therapyType,
      status: "pending",
      paymentStatus: 'pending',
      totalSessions,
      completedSessions: 0,
      isConfirmed: false,
      recurring: appointmentData.recurring,
      hasPreferedDate: true,
    };

    appointment = await createAppointment(appointmentD);
   }

    // Send new appointment email
    // await triggerNewAppointmentEmail(appointment);

    if(!appointment){
      return NextResponse.json({
        success: false,
        error: "Error creating appointment",
      }, { status: 500 });
    }

    // return NextResponse.json({
    //   appointmentId: appointment._id,
    //   message: "Appointment created successfully",
    // });
    // }

    // Store onboarding responses
    if (responses && responses.length > 0) {
      const onboarding = new PatientOnboarding({
        patient: user._id,
        responses: responses.map((response: any) => ({
          questionId: response.questionId,
          question: response.question,
          answer: response.answer,
          type: response.type
        }))
      });

      await onboarding.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user._id,
        appointmentId: appointment?._id ?? null,
      }
    });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Error creating account" },
      { status: 500 }
    );
  }
}


export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  });
}