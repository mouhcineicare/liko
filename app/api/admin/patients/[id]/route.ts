import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import PatientOnboarding from "@/lib/db/models/PatientOnboarding";
import Appointment from "@/lib/db/models/Appointment";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get patient details
    const patient = await User.findById(params.id);
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get onboarding responses
    const onboarding = await PatientOnboarding.findOne({ patient: params.id });

    // Get appointments
    const appointments = await Appointment.find({ patient: params.id })
      .populate("therapist", "fullName image")
      // .sort({ createdAt: 1 });

    // Combine all data
    const patientData = {
      _id: patient._id,
      fullName: patient.fullName,
      email: patient.email,
      telephone: patient.telephone,
      image: patient.image,
      status: patient.status,
      createdAt: patient.createdAt,
      onboarding: onboarding || null,
      appointments: appointments || []
    };

    return NextResponse.json(patientData);
  } catch (error) {
    console.error("Error fetching patient details:", error);
    return NextResponse.json(
      { error: "Error fetching patient details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fullName, email, telephone, password } = await req.json();

    await connectDB();
    const patient = await User.findById(params.id);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Check if email is being changed and if it's already in use
    if (email !== patient.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Update basic info
    patient.fullName = fullName;
    patient.email = email.toLowerCase();
    patient.telephone = telephone;

    // Update password if provided
    if (password) {
      patient.password = password;
    }

    await patient.save();

    return NextResponse.json({ 
      success: true,
      message: "Patient updated successfully" 
    });
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { error: "Error updating patient" },
      { status: 500 }
    );
  }
}