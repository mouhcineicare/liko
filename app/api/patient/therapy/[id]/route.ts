import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Ensure the user is authenticated and has the correct role
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to the database
    await connectDB();

    // Find the therapist by ID
    let therapist = null;
    let patient = null;

    // First try to get therapist from params.id if provided
    if (params.id && params.id !== 'null') {
      therapist = await User.findById(params.id);
    } 
    
    // If therapist not found via params.id, try to get from patient's assigned therapy
    if (!therapist) {
      // Get the latest patient data from DB (not relying on session which might be stale)
      patient = await User.findById(session.user.id);
      
      if (!patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      if (patient.therapy) {
        therapist = await User.findById(patient.therapy);
      }
    }

    // If therapist still not found, return a 404 error
    if (!therapist) {
      return NextResponse.json(
        { 
          error: "Therapist not found",
          message: "No therapist assigned to this patient" 
        }, 
        { status: 404 }
      );
    }

    // Return the therapist's information
    return NextResponse.json({
      success: true,
      data: {
        id: therapist._id,
        fullName: therapist.fullName,
        email: therapist.email,
        summary: therapist.summary,
        specialties: therapist.specialties,
        profile: therapist.profile,
        status: therapist.status,
        emailVerified: therapist.emailVerified,
        completedSessions: therapist.completedSessions,
        createdAt: therapist.createdAt,
        image: therapist.image,
        timeZone: therapist.timeZone,
      },
    });
  } catch (error) {
    console.error("Error fetching therapist:", error);
    return NextResponse.json(
      { error: "Error fetching therapist" },
      { status: 500 }
    );
  }
}