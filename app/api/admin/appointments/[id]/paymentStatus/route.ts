import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { paymentStatus } = await request.json();
    
    if (!["pending", "completed", "refunded", "failed"].includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      );
    }

    await connectDB();
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      params.id,
      { paymentStatus },
      { new: true }
    );

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}