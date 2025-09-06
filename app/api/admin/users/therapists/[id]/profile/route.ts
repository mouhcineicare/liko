import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import TherapyProfile from "@/lib/db/models/Therapy-profile"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const therapistId = params.id
    if (!therapistId) {
      return NextResponse.json({ error: "Therapist ID is required" }, { status: 400 })
    }

    await connectDB()

    // Get the therapist user data
    const therapist = await User.findById(therapistId)
    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Get the therapist profile data
    const profile = await TherapyProfile.findOne({ therapyId: therapistId })
    if (!profile) {
      return NextResponse.json({
        therapist,
        profile: null,
        message: "Therapist profile not created yet",
      })
    }

    // Return both therapist and profile data
    return NextResponse.json({
      therapist,
      profile,
    })
  } catch (error) {
    console.error("Error fetching therapist profile:", error)
    return NextResponse.json({ error: "Error fetching therapist profile" }, { status: 500 })
  }
}

// Add the PUT method to handle profile updates
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const therapistId = params.id
    if (!therapistId) {
      return NextResponse.json({ error: "Therapist ID is required" }, { status: 400 })
    }

    // Parse the request body
    const body = await request.json()

    await connectDB()

    // Check if therapist exists
    const therapist = await User.findById(therapistId)
    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Update or create the therapist profile
    const updatedProfile = await TherapyProfile.findOneAndUpdate(
      { therapyId: therapistId },
      {
        $set: {
          aboutMe: body.aboutMe,
          therapeuticApproach: body.therapeuticApproach,
          communicationApproach: body.communicationApproach,
          professionalExperience: body.professionalExperience,
          mentalHealthExpertise: body.mentalHealthExpertise,
          communicationModes: body.communicationModes,
          spokenLanguages: body.spokenLanguages,
          licenseInformation: body.licenseInformation,
          availability: body.availability,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true, // Create if it doesn't exist
        new: true, // Return the updated document
      },
    )

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: "Therapist profile updated successfully",
    })
  } catch (error) {
    console.error("Error updating therapist profile:", error)
    return NextResponse.json({ error: "Error updating therapist profile" }, { status: 500 })
  }
}

