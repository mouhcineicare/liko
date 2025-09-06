import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import TherapistApplication from "@/lib/db/models/TherapistApplication"

export async function GET(request: Request, { params }: { params: { id: string } }) {
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

    await connectDB()

    // Get application by ID
    const application = await TherapistApplication.findById(id).lean()

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error("Error fetching therapist application:", error)
    return NextResponse.json({ error: "Failed to fetch therapist application" }, { status: 500 })
  }
}

