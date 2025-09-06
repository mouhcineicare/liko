import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import TherapistApplication from "@/lib/db/models/TherapistApplication"

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}

    // Add status filter if not "all"
    if (status !== "all") {
      query.status = status
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { "personalInfo.fullName": { $regex: search, $options: "i" } },
        { "personalInfo.email": { $regex: search, $options: "i" } },
        { "licensure.licenseNumber": { $regex: search, $options: "i" } },
      ]
    }

    // Get total count for pagination
    const total = await TherapistApplication.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get applications with pagination
    const applications = await TherapistApplication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select({
        personalInfo: {
          fullName: 1,
          email: 1,
          phoneNumber: 1,
        },
        licensure: {
          licenseNumber: 1,
        },
        status: 1,
        createdAt: 1,
      })
      .lean()

    return NextResponse.json({
      applications,
      currentPage: page,
      totalPages,
      totalApplications: total,
    })
  } catch (error) {
    console.error("Error fetching therapist applications:", error)
    return NextResponse.json({ error: "Failed to fetch therapist applications" }, { status: 500 })
  }
}

