// used for list returned on the users => patients page to assign therapy to a patient
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import mongoose from "mongoose"

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const searchQuery = searchParams.get("search") || ""
    const skip = (page - 1) * limit

    // Build query
    const query: any = { role: "therapist" }

    // Add search filter if provided
    if (searchQuery) {
      query.$or = [
        { fullName: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { specialties: { $regex: searchQuery, $options: "i" } },
      ]
    }

    // Get total count for pagination
    const totalCount = await User.countDocuments(query)

    // Fetch therapists with pagination
    const therapists = await User.find(query)
      .select("fullName email image specialties completedSessions level weeklyPatientsLimit isCalendarConnected")
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limit)

    // Calculate remaining weekly sessions for each therapist
    const therapistsWithAvailability = await Promise.all(
      therapists.map(async (therapist) => {
        const startOfWeek = new Date()
        startOfWeek.setHours(0, 0, 0, 0)
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Start of current week

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        const Appointment = mongoose.model("Appointment")
        const weeklyAppointments = await Appointment.countDocuments({
          therapist: therapist._id,
          date: {
            $gte: startOfWeek,
            $lte: endOfWeek,
          },
          status: { $in: ["pending", "approved", "in_progress"] },
        })

        const remainingWeeklySessions = therapist.weeklyPatientsLimit - weeklyAppointments

        return {
          ...therapist.toObject(),
          isCalendarConnected: therapist.isCalendarConnected,
          remainingWeeklySessions,
        }
      }),
    )

    return NextResponse.json({
      therapists: therapistsWithAvailability,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching therapists:", error)
    return NextResponse.json({ error: "Error fetching therapists" }, { status: 500 })
  }
}

