import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { appointmentId } = await req.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Calculate remaining sessions
    const totalSessions = appointment.totalSessions || 1;
    const completedSessions = appointment.completedSessions || 0;
    const remainingSessions = totalSessions - completedSessions;

    // Calculate the new price (50% of the current price)
    const newPrice = appointment.price * 0.5;

    // Update the appointment
    const updatedCompletedSessions = completedSessions + 1;
    const updatedRemainingSessions = totalSessions - updatedCompletedSessions;
    const newDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Add 24 hours

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        completedSessions: remainingSessions <= 0 ? 0 : updatedCompletedSessions,
        price: newPrice,
        paymentStatus: 'pending',
        remainingSessions: remainingSessions <= 0 ? 1 : updatedRemainingSessions,
        date: newDate,
      },
      { new: true }
    );

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Failed to update appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        appointment: updatedAppointment,
        redirectToPayment: true,
        paymentAmount: newPrice,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error marking appointment as not shown:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}