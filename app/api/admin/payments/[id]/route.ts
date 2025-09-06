import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import { TherapistPayment } from "@/lib/db/models";

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { id } = params;
    const updateData = await req.json();

    // Validate update data
    const allowedUpdates = ["status", "price", "paymentStatus"];
    const isValidUpdate = Object.keys(updateData).every(key => 
      allowedUpdates.includes(key)
    );

    if (!isValidUpdate) {
      return NextResponse.json(
        { error: "Invalid update fields" },
        { status: 400 }
      );
    }

    // Update the appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment
    });
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: error.message || "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { id } = params;

    const deletedAppointment = await Appointment.findByIdAndDelete(id);
    if (!deletedAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Clean up any related payments
    await TherapistPayment.updateMany(
      { appointments: id },
      { $pull: { appointments: id } }
    );

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully"
    });
  } catch (error: any) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: error.message || "Deletion failed" },
      { status: 500 }
    );
  }
}