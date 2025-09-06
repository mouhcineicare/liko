import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { verifyStripePayment } from "@/lib/stripe/verification";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Find the appointment and populate the therapist and patient fields
    const appointment = await Appointment.findById(params.id)
      .populate("therapist", "fullName image") // Populate therapist details
      .populate("patient", "telephone fullName email image"); // Populate patient details

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify payment status if appointment has Stripe session ID
    let paymentStatus = appointment.paymentStatus;
    if (appointment.checkoutSessionId) {
      try {
        const verification = await verifyStripePayment(appointment.checkoutSessionId);
        paymentStatus = verification.paymentStatus === 'paid' ? 'completed' : verification.paymentStatus;
      } catch (error) {
        console.error('Error verifying payment:', error);
        // Keep original paymentStatus if verification fails
      }
    }

    // Return appointment with verified payment status
    const appointmentWithVerifiedPayment = {
      ...appointment.toObject(),
      paymentStatus
    };

    return NextResponse.json(appointmentWithVerifiedPayment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { error: "Error fetching appointment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const appointment = await Appointment.findById(params.id);

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    await appointment.deleteOne();

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { error: "Error fetching appointment" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
    },
  });
}