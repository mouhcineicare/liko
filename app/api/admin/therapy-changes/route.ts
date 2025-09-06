import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import TherapyChangeRequest from "@/lib/db/models/TherapyChangeRequest"
import User from "@/lib/db/models/User"
import { NotificationType, triggerNotification } from "@/lib/services/notifications"
import { Types } from "mongoose"

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const searchQuery = searchParams.get("search") || ""
    const skip = (page - 1) * limit

    await connectDB()

    // Build the base query
    let baseQuery = TherapyChangeRequest.find()

    // Add search filter if query exists
    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i")
      
      baseQuery = baseQuery
        .populate({
          path: "patient",
          match: { fullName: searchRegex },
          select: "fullName email"
        })
        .populate({
          path: "currentTherapist",
          match: { fullName: searchRegex },
          select: "fullName"
        })
        .populate({
          path: "newTherapist",
          match: { fullName: searchRegex },
          select: "fullName"
        })
    } else {
      baseQuery = baseQuery
        .populate("patient", "fullName email")
        .populate("currentTherapist", "fullName")
        .populate("newTherapist", "fullName")
    }

    // Get total count for pagination (with same filters)
    const totalRequests = await TherapyChangeRequest.countDocuments(
      searchQuery ? {
        $or: [
          { "patient.fullName": new RegExp(searchQuery, "i") },
          { "currentTherapist.fullName": new RegExp(searchQuery, "i") },
          { "newTherapist.fullName": new RegExp(searchQuery, "i") }
        ]
      } : {}
    )

    const totalPages = Math.ceil(totalRequests / limit)

    // Fetch filtered therapy change requests with pagination
    const requests = await baseQuery
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Filter out requests where all populated fields didn't match the search
    const filteredRequests = searchQuery 
      ? requests.filter(req => 
          req.patient || 
          req.currentTherapist || 
          (req.newTherapist && searchQuery))
      : requests 

    return NextResponse.json({
      requests: filteredRequests,
      pagination: {
        currentPage: page,
        totalPages,
        totalRequests,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching therapy change requests:", error)
    return NextResponse.json({ error: "Error fetching requests" }, { status: 500 })
  }
}


export async function PUT(request: Request) {
  try {
    const { requestId, newTherapistId, status } = await request.json();
    
    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the therapy change request
    const changeRequest = await TherapyChangeRequest.findById(requestId)
      .populate('patient', 'fullName email _id')
      .populate('currentTherapist', 'fullName email')

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Therapy change request not found" },
        { status: 404 }
      );
    }

    console.log('current status', status)

    // Validate new therapist if being assigned
    if (status === "approved") {
      if (!newTherapistId) {
        return NextResponse.json(
          { error: "New therapist ID is required for approval" },
          { status: 400 }
        );
      }

      const newTherapist = await User.findById(newTherapistId);
      if (!newTherapist || newTherapist.role !== "therapist") {
        return NextResponse.json(
          { error: "Invalid therapist selected" },
          { status: 400 }
        );
      }

      // Check if the new therapist is the same as current therapist
      if (changeRequest.currentTherapist._id.toString() === newTherapistId) {
        return NextResponse.json(
          { error: "Patient is already assigned to this therapist" },
          { status: 400 }
        );
      }
    }

    // Update the therapy change request and related models
    if (status === "approved") {
      // Update the change request
      changeRequest.status = 'approved';
      changeRequest.newTherapist = newTherapistId;
      await changeRequest.save();

      console.log('we changed therapy id for user')

      // Update the patient's therapist reference
      await User.findByIdAndUpdate(changeRequest.patient._id, {
        therapy: new Types.ObjectId(newTherapistId.toString()) 
      });

      // Here you would typically trigger notifications
      // to patient, current therapist, and new therapist

    } else if (status === "rejected") {
      // Only update the status, don't change any therapist references
      changeRequest.status = 'rejected';
      console.log('we rejected therapy change request')
      await changeRequest.save();
    }

    await triggerNotification(NotificationType.NEW_THERAPIST_ASSIGNED, changeRequest.patient._id.toString())
    await triggerNotification(NotificationType.NEW_PATIENT_ASSIGNED, newTherapistId.toString())

    return NextResponse.json(
      { 
        message: "Therapy change request processed successfully", 
        changeRequest: await TherapyChangeRequest.findById(requestId)
          .populate('patient')
          .populate('currentTherapist')
          .populate('newTherapist')
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing therapy change:", error);
    return NextResponse.json(
      { error: "Failed to process therapy change request" },
      { status: 500 }
    );
  }
}