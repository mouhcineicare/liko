import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import Appointment from "@/lib/db/models/Appointment"
import PatientOnboarding from "@/lib/db/models/PatientOnboarding"
import User from "@/lib/db/models/User"
import { updateAppointmentStatus } from "@/lib/services/appointments/legacy-wrapper"
import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get appointment with populated patient and therapist
    const appointment = await Appointment.findById(params.id)
      .populate("patient", "fullName email telephone image")
      .populate("therapist", "fullName email image weeklyPatientsLimit")

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Initialize variables for patient-related data
    let onboarding = null
    let patientStats = null
    let countPatients = 0

    // Only fetch patient-related data if patient exists
    if (appointment.patient) {
      // Get patient's onboarding data
      onboarding = await PatientOnboarding.findOne({
        patient: appointment.patient._id,
      })

      // Get patient's stats
      patientStats = await Appointment.aggregate([
        {
          $match: {
            patient: appointment.patient._id,
            paymentStatus: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalAppointments: { $sum: 1 },
            completedAppointments: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            upcomingAppointments: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$date", new Date()] },
                      { $in: ["$status", ["pending_approval", "pending", "approved", "in_progress"]] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])

      // Count appointments for this patient and therapist
      if (appointment.therapist) {
        countPatients = await Appointment.countDocuments({
          therapist: appointment.therapist,
          patient: appointment.patient,
        })
      }
    }

    // Get therapist's stats if there is a therapist
    let therapistStats = null

    if (appointment.therapist) {
      therapistStats = await Appointment.aggregate([
        {
          $match: {
            therapist: appointment.therapist._id,
            paymentStatus: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalAppointments: { $sum: 1 },
            completedAppointments: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            upcomingAppointments: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$date", new Date()] },
                      { $in: ["$status", ["pending_approval", "pending", "approved", "in_progress"]] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
    }

    // Get previous therapists' details if any
    let previousTherapists: Array<{
      fullName: string
      email: string
      image: string
      completedSessions: number
    }> = []
    if (appointment.oldTherapies && appointment.oldTherapies?.length > 0) {
      previousTherapists = (
        await Promise.all(
          appointment?.oldTherapies.map(async (therapistId) => {
            const therapist = await User.findById(therapistId).select("fullName email image completedSessions")
            return therapist
          }),
        )
      ).filter((therapist) => therapist !== null) as {
        fullName: string
        email: string
        image: string
        completedSessions: number
      }[]
    }

    // Prepare the response object with all necessary data
    const appointmentData = {
      ...appointment.toObject(),
      onboarding,
      patientStats: patientStats?.[0] || null,
      therapistStats: therapistStats?.[0] || null,
      previousTherapists,
      therapist: appointment.therapist && typeof appointment.therapist === "object" && "toObject" in appointment.therapist
        ? {
            ...(appointment.therapist as any).toObject(),
          }
        : appointment.therapist
        ? {
            _id: appointment.therapist.toString(),
          }
        : null,
      countPatients,
    }

    return NextResponse.json(appointmentData)
  } catch (error) {
    console.error("Error fetching appointment details:", error)
    return NextResponse.json({ error: "Error fetching appointment details" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB()

    const deletedAppointment = await Appointment.findByIdAndDelete(params.id)

    if (!deletedAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Appointment deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = params.id;
    const body = await request.json();

    // Validate required fields
    const { status, paymentStatus, patient, plan, price, sessions, therapist, isBalance, date } = body;
    if (!status || !paymentStatus || !patient || !plan || price === undefined || !sessions || !Array.isArray(sessions) || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    // Verify patient exists
    const patientExists = await User.findById(patient);
    if (!patientExists) {
      return NextResponse.json({ error: "Patient not found" }, { status: 400 });
    }

    // Get existing appointment data
    const existingAppointment = await Appointment.findById(id);
    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Handle payment status
    const finalPaymentStatus = paymentStatus === 'failed' ? 'pending' : paymentStatus;

    // Prepare sessions data
    const mainSession = sessions[0];
    const recurringSessions = sessions.slice(1);
    const isSingleSession = recurringSessions.length === 0;

    // Prepare update data - now including the main date
    const updateData: any = {
      date: new Date(date), // Use the provided main date
      paymentStatus: finalPaymentStatus,
      patient,
      plan,
      price,
      meetingLink: body.meetingLink || "",
      totalSessions: sessions.length,
      updatedAt: new Date(),
      isBalance,
    };

    // Handle sessions
    if (isSingleSession) {
      updateData.recurring = [];
      
      if (status === "completed") {
        updateData.completedSessions = 1;
      } else if (existingAppointment.status === "completed") {
        updateData.completedSessions = 0;
      }
    } else {
      updateData.recurring = recurringSessions.map(session => ({
        date: session.date,
        status: session.status || 'in_progress',
        payment: session.payment || 'not_paid'
      }));

      const completedCount = recurringSessions.filter(s => s.status === "completed").length;
      updateData.completedSessions = (status === "completed" ? 1 : 0) + completedCount;
    }

    // Handle therapist assignment
    if (therapist) {
      updateData.therapist = therapist;
      updateData.isConfirmed = true;
      updateData.hasPreferedDate = false;
      
      if (patientExists.therapy?.toString() !== therapist) {
        patientExists.therapy = therapist;
        await patientExists.save();
        
        await Appointment.updateMany(
          { patient, therapist: { $exists: false } },
          { $set: { therapist, isConfirmed: true, hasPreferedDate: false } }
        );
      }
    }

    // Update appointment data first (without status)
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("patient therapist");

    if (!updatedAppointment) {
      return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
    }

    // Handle status transition using new system
    if (status && status !== existingAppointment.status) {
      // Map legacy statuses to new ones
      let newStatus = status;
      if (status === 'approved') {
        newStatus = APPOINTMENT_STATUSES.CONFIRMED;
      } else if (status === 'rejected') {
        newStatus = APPOINTMENT_STATUSES.CANCELLED;
      } else if (status === 'in_progress') {
        newStatus = APPOINTMENT_STATUSES.CONFIRMED;
      }

      const actor = { id: session.user.id, role: 'admin' as const };
      
      const finalAppointment = await updateAppointmentStatus(
        id,
        newStatus,
        actor,
        { 
          reason: `Admin updated appointment status to ${status}`,
          meta: { 
            originalStatus: status,
            adminUpdate: true,
            updateData: Object.keys(updateData)
          }
        }
      );

      return NextResponse.json({
        message: "Appointment updated successfully",
        appointment: finalAppointment,
      });
    }

    return NextResponse.json({
      message: "Appointment updated successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update appointment" },
      { status: 500 }
    );
  }
}

