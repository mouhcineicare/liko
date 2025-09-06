import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import FeedBack from "@/lib/db/models/FeedBack";

export async function GET() {
  try {
    await connectDB();
    
    // Get total patients (clients served)
    const patientCount = await User.countDocuments({ role: "patient" });
    
    // Get total therapists (team members)
    const therapistCount = await User.countDocuments({ role: "therapist" });
    
    // Get all feedbacks
    const feedbacks = await FeedBack.find().sort({ createdAt: -1 }).limit(10);
    
    return NextResponse.json({
      success: true,
      statistics: {
        clientsServed: patientCount,
        teamMembers: therapistCount,
      },
      feedbacks
    });
    
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}