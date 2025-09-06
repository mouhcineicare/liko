import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import TherapistApplication from "@/lib/db/models/TherapistApplication"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 })
    }

    // Parse request body
    const body = await request.json()
    const { status, statusNotes } = body

    // Validate status
    if (!status || !["pending", "reviewing", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    await connectDB()

    // Update application status
    const updatedApplication = await TherapistApplication.findByIdAndUpdate(
      id,
      {
        status,
        statusNotes,
        updatedAt: new Date(),
      },
      { new: true },
    )

    if (!updatedApplication) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      status: updatedApplication.status,
      statusNotes: updatedApplication.statusNotes,
    })
  } catch (error) {
    console.error("Error updating therapist application status:", error)
    return NextResponse.json({ error: "Failed to update therapist application status" }, { status: 500 })
  }
}

