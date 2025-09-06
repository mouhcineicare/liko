import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import PatientOnboarding from "@/lib/db/models/PatientOnboarding";
import { triggerAppointmentStatusEmail } from "@/lib/services/email-triggers";
import { NotificationType, triggerNotification } from "@/lib/services/notifications";

const normalizeRecurring = (recurring: Array<string | { date: string; status?: string; payment?: string }>): { date: string; status: string; payment: string }[] => {
  if (!Array.isArray(recurring)) return [];
  return recurring.map((item) => {
    if (typeof item === 'string') {
      return { date: item, status: 'in_progress', payment: 'not_paid' };
    } else if (typeof item === 'object' && item !== null) {
      return {
        date: item.date,
        status: item.status || 'in_progress',
        payment: item.payment || 'not_paid',
      };
    } else {
      return { date: '', status: 'in_progress', payment: 'not_paid' };
    }
  });
};

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get appointment with populated patient
    const appointment = await Appointment.findById(params.id)
      .populate("patient", "fullName email telephone image");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Verify the therapist has access to this appointment
    if (appointment?.therapist?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get patient's onboarding data
    const onboarding = await PatientOnboarding.findOne({ 
      patient: appointment.patient._id 
    }).lean(); // Use lean() for better performance

    // Get patient's stats
    const patientStats = await Appointment.aggregate([
      {
        $match: {
          patient: appointment.patient._id,
          paymentStatus: "completed"
        }
      },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          upcomingAppointments: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$date", new Date()] },
                    { $in: ["$status", ["pending_approval", "pending", "approved", "in_progress"]] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Convert appointment to plain object and add additional data
    const appointmentData = {
      ...appointment.toObject(),
      onboarding: onboarding || null,
      patientStats: patientStats[0] || {
        totalAppointments: 0,
        completedAppointments: 0,
        upcomingAppointments: 0
      }
    };

    return NextResponse.json(appointmentData);
  } catch (error) {
    console.error("Error fetching appointment details:", error);
    return NextResponse.json(
      { error: "Error fetching appointment details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      comment,
      date,
      meetingLink,
      patientTimezone,
      isRecurring = false,
      recurringIndex = null
    } = await req.json();

    await connectDB();

    const appointment = await Appointment.findById(params.id)
      .populate("patient", "fullName email")
      .populate("therapist", "fullName email");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Prepare updates
    const updates: Record<string, any> = {
      comment,
      meetingLink: meetingLink || "",
      updatedAt: new Date(),
    };

    if (isRecurring && recurringIndex !== null) {
      // Handle recurring session update
      if (!appointment.recurring || recurringIndex >= appointment.recurring.length) {
        return NextResponse.json(
          { error: "Invalid recurring session index" },
          { status: 400 }
        );
      }

      // Create a new array with the updated session
      const updatedRecurring = [...appointment.recurring];
      updatedRecurring[recurringIndex] = {
        ...updatedRecurring[recurringIndex],
        date: new Date(date),
      };

      updates.recurring = updatedRecurring;
      updates.isDateUpdated = new Date(appointment.recurring[recurringIndex].date).toISOString() !== new Date(date).toISOString();
    } else {
      // Handle main appointment update
      updates.date = new Date(date);
      updates.isDateUpdated = new Date(appointment.date).toISOString() !== new Date(date).toISOString();
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true }
    ).populate("patient therapist");

    if (!updatedAppointment) {
      throw new Error("Failed to update appointment");
    }

    if (updates.isDateUpdated) {
      // Implement your email notification logic here if needed
      await triggerAppointmentStatusEmail(updatedAppointment, "rescheduled");
      await triggerNotification(NotificationType.APPOINTMENT_RESCHEDULED, appointment.patient._id.toString(),{
            therapistName: session.user.name,
            planName: appointment.plan
          })
    }

    return NextResponse.json({
      message: "Appointment updated successfully",
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error updating appointment" },
      { status: 500 }
    );
  }
}