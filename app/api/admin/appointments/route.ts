import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import connectDB from '@/lib/db/connect'
import Appointment from '@/lib/db/models/Appointment'
import User from '@/lib/db/models/User'
import { Types } from 'mongoose'


export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    const { patient, therapist, sessions, plan, price, therapyType, status, paymentStatus, meetingLink } = body
    if (!patient || !sessions || !Array.isArray(sessions) || sessions.length === 0 || !plan || !price || !therapyType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await connectDB()

    // Verify patient exists
    const patientExists = await User.findById(patient)
    if (!patientExists) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Verify therapist exists if provided
    if (therapist) {
      const therapistExists = await User.findById(therapist)
      if (!therapistExists) {
        return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
      }
    }

    // Validate sessions
    const validatedSessions = sessions.map(session => {
      const date = new Date(session)
      if (isNaN(date.getTime())) {
        throw new Error("Invalid session date")
      }
      return date
    })

    // Create new appointment
    const recurringSessions = validatedSessions.slice(1).map(dateObj => ({
      date: dateObj.toISOString(),
      status: 'in_progress',
      payment: 'not_paid',
    }));
    const newAppointment = new Appointment({
      patient,
      therapist: new Types.ObjectId(therapist.toString()) || null,
      date: validatedSessions[0], // First session is the main date
      status,
      paymentStatus,
      plan,
      price,
      therapyType,
      meetingLink: meetingLink || "",
      totalSessions: validatedSessions.length,
      completedSessions: 0,
      recurring: recurringSessions, // Always use correct object format
      isAccepted: therapist ? true : null, // Set to true if therapist assigned, null if not
      isConfirmed: therapist ? true : false, // Set to true if therapist assigned, false if not
      hasPreferedDate: !therapist, // Set to true if no therapist assigned
      isStripeVerified: paymentStatus === 'completed' ? true : false, // Admin-created appointments are verified
    })

    await newAppointment.save()

    // Update patient's therapy if not already set and therapist is assigned
    if (therapist && !patientExists.therapy) {
      patientExists.therapy = therapist
      await patientExists.save()
    }

    return NextResponse.json({
      message: "Appointment created successfully",
      appointment: newAppointment,
    })
  } catch (error) {
    console.error("Error creating appointment:", error)
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }
}