import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { triggerTherapistAssignmentEmail } from "@/lib/services/email-triggers";
import User from "@/lib/db/models/User";
import { Types } from "mongoose";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { therapistId, isConfirmed } = await req.json();
    if (!therapistId) {
      return NextResponse.json(
        { error: "Therapist ID is required" },
        { status: 400 }
      );
    }

    await connectDB();
    const appointment = await Appointment.findByIdAndUpdate(
      params.id,
      {
        therapist: new Types.ObjectId(therapistId.toString()),
        paymentStatus: "completed",
        isAccepted: false,
      },
      { new: true }
    );

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    const patient = await User.findById(appointment.patient);

    if(!patient){
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if patient already has a therapist before updating
    const hasExistingTherapist = patient.therapy;
    
    // Update patient's therapy assignment
    patient.therapy = therapistId;
    await patient.save();

    // Update ALL non-completed, non-cancelled appointments for this patient with the new therapist
    // If patient already has a therapist, new appointments should be confirmed
    
    const updateResult = await Appointment.updateMany(
      {
        patient: appointment.patient,
        status: { $nin: ['completed', 'cancelled'] } // Exclude completed AND cancelled appointments
      },
      {
        $set: {
          therapist: new Types.ObjectId(therapistId.toString()),
          hasPreferedDate: false,
          isAccepted: false,
          // When admin assigns therapist, patient is matched - all appointments should be confirmed
          // This ensures patient can rebook even if first appointment was cancelled
          status: 'confirmed'
        }
      }
    );

    console.log(`Updated ${updateResult.modifiedCount} non-completed appointments for patient ${patient.fullName}`);

    // Notify therapist about new assignment
    await triggerTherapistAssignmentEmail(appointment);

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error assigning therapist:", error);
    return NextResponse.json(
      { error: "Error assigning therapist" },
      { status: 500 }
    );
  }
}
