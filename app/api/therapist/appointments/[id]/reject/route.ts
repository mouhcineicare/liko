import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";
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

    const { declineComment } = await req.json();

    await connectDB();
    
    // Update appointment
    const appointment = await Appointment.findByIdAndUpdate(
      params.id,
      {
        isAccepted: true,
        declineComment,
        status: 'pending_scheduling',
        isConfirmed: false,
      },
      { new: true }
    ).populate('patient');

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    await triggerNotification(NotificationType.APPOINTMENT_REQUEST_REJECTED, appointment.patient._id.toString(),{
          therapistName: session.user.name,
        })

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error rejecting appointment:", error);
    return NextResponse.json(
      { error: "Error rejecting appointment" },
      { status: 500 }
    );
  }
}