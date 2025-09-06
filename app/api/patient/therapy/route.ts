import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get the current patient with their therapy assignment
    const patient = await User.findById(session.user.id).select('therapy');
    
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      therapyId: patient.therapy?.toString() || null,
      hasTherapist: !!patient.therapy
    });

  } catch (error) {
    console.error("Error fetching patient therapy:", error);
    return NextResponse.json(
      { error: "Failed to fetch therapy information" },
      { status: 500 }
    );
  }
}