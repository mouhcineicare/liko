import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import Appointment from "@/lib/db/models/Appointment"
import { triggerPatientAssignmentEmail, triggerTherapistAssignmentEmail } from "@/lib/services/email-triggers"
import { Types } from "mongoose"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const patientId = params.id
    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 })
    }

    const body = await req.json()
    const { therapistId } = body

    if (!therapistId) {
      return NextResponse.json({ error: "Therapist ID is required" }, { status: 400 })
    }

    await connectDB()

    // Verify patient exists and is a patient
    const patient = await User.findOne({
      _id: patientId,
      role: "patient",
    })

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 })
    }

    // Verify therapist exists and is a therapist
    const therapist = await User.findOne({
      _id: new Types.ObjectId(therapistId.toString()),
      role: "therapist",
    })

    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 })
    }

    // Check if patient already has a therapist before updating
    const hasExistingTherapist = patient.therapy;
    
    // Update patient's therapist
    const updatedPatient = await User.findByIdAndUpdate(
      patientId, 
      { therapy: new Types.ObjectId(therapistId.toString()) }, 
      { new: true }
    )

    if (!updatedPatient) {
      return NextResponse.json({ error: "Failed to update patient" }, { status: 500 })
    }

    // Find all NON-COMPLETED, NON-CANCELLED appointments for this patient and update them
    const nonCompletedAppointments = await Appointment.find({
      patient: patientId,
      status: { $nin: ['completed', 'cancelled'] } // Exclude completed AND cancelled appointments
    })

    if (nonCompletedAppointments.length > 0) {
      const appointmentIds = nonCompletedAppointments.map(app => app._id)
      
      // Update all non-completed appointments with the new therapist
      const updateResult = await Appointment.updateMany(
        { _id: { $in: appointmentIds } },
        {
          $set: {
            therapist: therapistId,
            hasPreferedDate: false,
            isAccepted: false,
            // When admin assigns therapist, patient is matched - all appointments should be confirmed
            // This ensures patient can rebook even if first appointment was cancelled
            status: 'confirmed'
          }
        }
      )

      console.log(`Updated ${updateResult.modifiedCount} non-completed appointments with new therapist`)
    }

    // Send emails
    await triggerTherapistAssignmentEmail({therapist: therapistId, patient: patientId})
    await triggerPatientAssignmentEmail({patient: patientId, therapist: therapistId})

    return NextResponse.json({
      success: true,
      message: "Therapist assigned successfully",
      patient: {
        _id: updatedPatient._id,
        fullName: updatedPatient.fullName,
        email: updatedPatient.email,
        therapy: updatedPatient.therapy,
      },
      updatedAppointments: nonCompletedAppointments.length
    })
  } catch (error) {
    console.error("Error assigning therapist:", error)
    return NextResponse.json({
      error: "Failed to assign therapist",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}