import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";

// Migration: Set therapistPaid = true for all appointments where isPaid === true
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await connectDB();
    // Find all appointments where isPaid is true and therapistPaid is not true
    const result = await Appointment.updateMany(
      { isPaid: true, therapistPaid: { $ne: true } },
      { $set: { therapistPaid: true } }
    );
    return NextResponse.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error: any) {
    console.error("Error migrating therapistPaid field:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
