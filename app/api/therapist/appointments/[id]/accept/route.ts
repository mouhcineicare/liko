import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
import { Types } from "mongoose";
import { NotificationType, triggerNotification } from "@/lib/services/notifications";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    // Update appointment
    const appointment = await Appointment.findByIdAndUpdate(
      params.id,
      {
        isAccepted: true,
        status: 'approved',
        isConfirmed: true,
      },
      { new: true }
    ).populate('patient');

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Update patient's therapy assignment
    if (appointment.patient) {
      await User.findByIdAndUpdate(appointment.patient._id, {
        therapy: new Types.ObjectId(session.user.id.toString())
      });
    }

    await triggerNotification(NotificationType.APPOINTMENT_REQUEST_APPROVED, appointment.patient._id.toString(),{
      therapistName: session.user.name,
      planName: appointment.plan
    })

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error accepting appointment:", error);
    return NextResponse.json(
      { error: "Error accepting appointment" },
      { status: 500 }
    );
  }
}