import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import stripe from "@/lib/stripe";
import { verifyStripePayment } from '@/lib/stripe/verification';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const url = new URL(req.url);
    const skip = Number.parseInt(url.searchParams.get("skip") || "0");
    const limit = Number.parseInt(url.searchParams.get("limit") || "4");
    const currentDateParam = url.searchParams.get("date");
    const currentDate = currentDateParam ? new Date(Number(currentDateParam)) : new Date();

    // Get counts for all statuses (same logic as POST endpoint)
    const statusCounts = {
      all: await Appointment.countDocuments({ patient: session.user.id }),
      pending_match: await Appointment.countDocuments({ 
        patient: session.user.id,
        $or: [
          { therapist: null },
          { therapist: { $exists: false } }
        ]
      }),
      matched_pending_therapist_acceptance: await Appointment.countDocuments({ 
        patient: session.user.id,
        therapist: { $ne: null },
        isAccepted: false
      }),
      pending_scheduling: await Appointment.countDocuments({ 
        patient: session.user.id,
        isAccepted: true,
        status: 'pending_scheduling'
      }),
      confirmed: await Appointment.countDocuments({
        patient: session.user.id,
        $or: [
          { 
            isAccepted: true, 
            isConfirmed: true,
            status: { $in: ['confirmed', 'rescheduled'] }
          },
          {
            status: 'rescheduled',
            isConfirmed: true
          }
        ]
      }),
      completed: await Appointment.countDocuments({ 
        patient: session.user.id,
        status: 'completed'
      }),
      cancelled: await Appointment.countDocuments({ 
        patient: session.user.id,
        status: 'cancelled'
      }),
      upcoming: await Appointment.countDocuments({ 
        patient: session.user.id,
        date: { $gte: new Date() },
        status: { $ne: 'cancelled' }
      }),
      past: await Appointment.countDocuments({ 
        patient: session.user.id,
        date: { $lt: new Date() }
      })
    };

    // Get paginated appointments
    const appointments = await Appointment.find({
      patient: session.user.id,
    })
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'therapist',
        select: 'fullName image telephone specialties summary experience'
      });

    // Verify payments using the shared verification method
    const verifiedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        const verification = await verifyStripePayment(appointment.checkoutSessionId, appointment.paymentIntentId);
        
        // Map the appointment status to custom statuses
        let customStatus = '';
        
        if (appointment.status === 'cancelled') {
          customStatus = 'cancelled';
        } 
        else if (appointment.status === 'completed') {
          customStatus = 'completed';
        }
        else if (!appointment.therapist) {
          customStatus = 'pending_match';
        }
        else if (appointment.therapist && appointment.isAccepted === false) {
          customStatus = 'matched_pending_therapist_acceptance';
        }
        else if (appointment.isAccepted === true && appointment.isConfirmed === true) {
          customStatus = 'confirmed';
        }
        else if (appointment.isAccepted === true && appointment.status === 'pending_scheduling') {
          customStatus = 'pending_scheduling';
        }
        else if (appointment.status === 'rescheduled' && appointment.isConfirmed === true) {
          customStatus = 'confirmed';
        }
        else {
          customStatus = appointment.status;
        }

        return {
          ...appointment.toObject(),
          status: customStatus,
          isStripeVerified: verification.paymentStatus === 'paid',
          isBalance: appointment.isBalance || false,
          isSubscriptionActive: verification.paymentStatus === 'paid',
          canReschedule: appointment.status === 'cancelled',
          paymentStatus: verification.paymentStatus,
          subscriptionStatus: verification.subscriptionStatus
        };
      })
    );

    return NextResponse.json({
      appointments: verifiedAppointments,
      total: statusCounts.all, // Use total count from statusCounts
      counts: statusCounts,    // Include all status counts
      ok: true,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Error fetching appointments" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { appointmentId, newDate } = await req.json();

    if (!appointmentId || !newDate) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    await connectDB();

    // Update the appointment's date in the database
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { date: newDate, isDateUpdated: true },
      { new: true }
    );

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, appointment: updatedAppointment });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}