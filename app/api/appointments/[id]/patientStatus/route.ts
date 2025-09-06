import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json();
    const appointmentId = params.id;

    await connectDB();
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Update status
    appointment.patientApproved = status;

    await appointment.save();


    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Error updating appointment status" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  });
}