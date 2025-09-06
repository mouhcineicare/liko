import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import Appointment from "@/lib/db/models/Appointment"
import User from "@/lib/db/models/User"
import mongoose from "mongoose"
import { verifyStripePayment } from '@/lib/stripe/verification'

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
    const therapistId = searchParams.get("therapist") || ""
    const plan = searchParams.get("plan") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const skip = (page - 1) * limit

    // Build the filter query
    const filterQuery: any = {}

    // Add search filter if query exists
    if (searchQuery) {
      // First, find patients and therapists that match the search query
      const matchingPatients = await User.find({
        fullName: new RegExp(searchQuery, "i"),
        role: "patient",
      }).select("_id stripeCustomerId email")

      const matchingTherapists = await User.find({
        fullName: new RegExp(searchQuery, "i"),
        role: "therapist",
      }).select("_id")

      const patientIds = matchingPatients.map((p) => p._id)
      const therapistIds = matchingTherapists.map((t) => t._id)

      // Add to filter query
      if (patientIds.length > 0 || therapistIds.length > 0) {
        filterQuery.$or = []

        if (patientIds.length > 0) {
          filterQuery.$or.push({ patient: { $in: patientIds } })
        }

        if (therapistIds.length > 0) {
          filterQuery.$or.push({ therapist: { $in: therapistIds } })
        }

        // Also search in plan field
        filterQuery.$or.push({ plan: new RegExp(searchQuery, "i") })
      } else {
        // If no matching users, just search in plan field
        filterQuery.plan = new RegExp(searchQuery, "i")
      }
    }

    // Add therapist filter
    if (therapistId) {
      filterQuery.therapist = new mongoose.Types.ObjectId(therapistId)
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
    const appointments = await Appointment.find(filterQuery)
      .populate("patient", "fullName stripeCustomerId email plan")
      .populate("therapist", "fullName image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enhance appointments with Stripe payment and subscription status
    const enhancedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const {
          paymentStatus, 
          subscriptionStatus, 
          isActive
        } = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);

        return {
          ...appointment,
          stripePaymentStatus: paymentStatus,
          stripeSubscriptionStatus: subscriptionStatus,
          isStripeActive: isActive || paymentStatus === 'paid'
        };
      })
    );

    return NextResponse.json({
      data: enhancedAppointments,
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