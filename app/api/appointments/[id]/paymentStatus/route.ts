import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { paymentStatus } = await request.json();
    
    if (!["pending", "completed", "refunded","failed"].includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      );
    }

    await connectDB();
    
    if(paymentStatus === "pending" || paymentStatus === "failed"){
      const updatedAppointment = await Appointment.findByIdAndUpdate(
      params.id,
      { paymentStatus, status: 'unpaid' },
      { new: true }
    );
        if (!updatedAppointment) {
          return NextResponse.json(
              { error: "Appointment not found" },
              { status: 404 }
          );
        }

    return NextResponse.json(updatedAppointment);
    } else {
      const updateData = { 
        paymentStatus,
        ...(paymentStatus === "completed" && { 
          isStripeVerified: true,
          status: "pending_match" // Use new status system
        })
      };
      
      console.log('PaymentStatus API: Updating appointment with data:', updateData);
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );
    
    console.log('PaymentStatus API: Updated appointment:', {
      _id: updatedAppointment?._id,
      paymentStatus: updatedAppointment?.paymentStatus,
      isStripeVerified: updatedAppointment?.isStripeVerified,
      status: updatedAppointment?.status,
      isBalance: updatedAppointment?.isBalance
    });

      if (!updatedAppointment) {
           return NextResponse.json(
             { error: "Appointment not found" },
             { status: 404 }
           );
      }

      return NextResponse.json(updatedAppointment);
    }
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}