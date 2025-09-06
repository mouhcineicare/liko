import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import Appointment from "@/lib/db/models/Appointment"
import bcrypt from "bcryptjs"
import { saveBase64ImageTherapy } from "@/lib/utils/image"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get the therapist
    const therapist = await User.findById(params.id)
    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Get all appointments for this therapist with completed payment status
    const appointments = await Appointment.find({
      therapist: params.id,
      paymentStatus: "completed",
    }).populate("patient", "_id")

    // Count unique patients
    const uniquePatientIds = new Set()
    appointments.forEach((apt) => {
      if (apt.patient && apt.patient._id) {
        uniquePatientIds.add(apt.patient._id.toString())
      }
    })

    const patientCount = uniquePatientIds.size

    // Get the therapist's patient limit (using weeklyPatientsLimit field)
    const patientLimit = therapist.weeklyPatientsLimit || 10 // Default to 10 if not set

    // Check if therapist has reached their limit
    const hasReachedLimit = patientCount >= patientLimit

    return NextResponse.json({
      therapistId: therapist._id,
      fullName: therapist.fullName,
      telephone: therapist.telephone,
      email: therapist.email,
      image: therapist.image,
      specialties: therapist.specialties,
      completedSessions: therapist.completedSessions,
      weeklyPatientsLimit: therapist.weeklyPatientsLimit,
      patientCount,
      patientLimit,
      hasReachedLimit,
      availableSlots: Math.max(0, patientLimit - patientCount),
      isCalendarConnected: therapist.isCalendarConnected,
      calendarStatus: therapist.isCalendarConnected 
      ? 'Connected' 
      : 'Not Connected',
    calendarStatusColor: therapist.isCalendarConnected 
      ? 'bg-green-100 text-green-800' 
      : 'bg-orange-100 text-orange-800'
    })
  } catch (error) {
    console.error("Error getting therapist patient count:", error)
    return NextResponse.json({ error: "Error getting therapist patient count" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fullName, email, telephone, summary, specialties, password, profile, image } = await req.json()

    await connectDB()
    const therapist = await User.findById(params.id)

    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Check if email is being changed and if it's already in use
    if (email !== therapist.email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() })
      if (existingUser) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 })
      }
    }

    // Update basic info
    if (fullName) therapist.fullName = fullName
    if (email) therapist.email = email.toLowerCase()
    if (telephone) therapist.telephone = telephone
    if (summary) therapist.summary = summary
    if (specialties) therapist.specialties = specialties
    if (profile) therapist.profile = profile
    if(image) therapist.image = await saveBase64ImageTherapy(image, therapist._id.toString())

    // Update password if provided
    if (password) {
      therapist.password = password;
    }

    await therapist.save()

    return NextResponse.json({
      success: true,
      message: "Therapist updated successfully",
    })
  } catch (error) {
    console.error("Error updating therapist:", error)
    return NextResponse.json({ error: "Error updating therapist" }, { status: 500 })
  }
}

