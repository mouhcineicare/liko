// File: app/api/admin/patient/[id]/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import TherapyProfile from "@/lib/db/models/Therapy-profile";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapyId = params.id;
    if (!therapyId) {
      return NextResponse.json(
        { error: "Therapy ID is required" },
        { status: 400 }
      );
    }

    const profile = await TherapyProfile.findOne({ therapyId });
    if (!profile) {
      return NextResponse.json(
        { error: "Therapy profile not found" },
        { status: 404 }
      );
    }

    // Extract and format availability days
    const availableDays = profile.availability?.map((avail: any) => avail.day) || [];
    
    return NextResponse.json({
      success: true,
      availableDays
    });

  } catch (error) {
    console.error("Error fetching therapy availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch therapy availability" },
      { status: 500 }
    );
  }
}