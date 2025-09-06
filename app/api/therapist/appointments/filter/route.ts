// app/api/therapist/appointments/filter/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import Appointment from "@/lib/db/models/Appointment"
import User from "@/lib/db/models/User"
import mongoose from "mongoose"

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const searchQuery = searchParams.get("search") || ""
    const plan = searchParams.get("plan") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const skip = (page - 1) * limit

    // Build the filter query - therapist is always the current therapist
    const filterQuery: any = {
      therapist: new mongoose.Types.ObjectId(session.user.id)
    }

    // Add search filter if query exists
    if (searchQuery) {
      // Find only patients assigned to this therapist that match the search
      const matchingPatients = await User.find({
        therapy: new mongoose.Types.ObjectId(session.user.id),
        $or: [
          { fullName: new RegExp(searchQuery, "i") },
          { email: new RegExp(searchQuery, "i") },
          { telephone: new RegExp(searchQuery, "i") }
        ],
        role: "patient",
      }).select("_id")

      const patientIds = matchingPatients.map((p) => p._id)

      if (patientIds.length > 0) {
        filterQuery.patient = { $in: patientIds }
      } else {
        // If no matching patients, return empty results
        return NextResponse.json({
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        })
      }
    }

    // Add plan filter
    if (plan) {
      filterQuery.plan = plan
    }

    // Add date range filter
    if (startDate || endDate) {
      filterQuery.date = {}

      if (startDate) {
        filterQuery.date.$gte = new Date(startDate)
      }

      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate)
        endDateTime.setHours(23, 59, 59, 999)
        filterQuery.date.$lte = endDateTime
      }
    }

    // Get total count with filters
    const totalCount = await Appointment.countDocuments(filterQuery)

    // Fetch appointments with filters, sorting, and pagination
    const baseQuery = Appointment.find(filterQuery)
      .populate("patient", "fullName email telephone image")
      .populate("therapist", "fullName image")

    const appointments = await baseQuery
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    return NextResponse.json({
      data: appointments,
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
    console.error("Error fetching filtered appointments:", error)
    return NextResponse.json({ error: "Error fetching appointments" }, { status: 500 })
  }
}