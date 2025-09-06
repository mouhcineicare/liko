import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import Appointment from "@/lib/db/models/Appointment";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const safeGet = (obj: any, path: string, defaultValue: any = null) => {
  try {
    return path.split('.').reduce((acc, part) => acc?.[part], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "therapist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 1. Get all payments for the therapist
    const payments = await TherapistPayment.find({ 
      therapist: new mongoose.Types.ObjectId(session.user.id)
    })
    .sort({ paidAt: -1 })
    .lean();

    if (!payments.length) {
      return NextResponse.json([], { status: 200 });
    }

    // 2. Collect all possible appointment IDs from both sources
    const allAppointmentIds = new Set<string>();

    // From direct appointments array
    payments.forEach(payment => {
      if (payment.appointments?.length) {
        payment.appointments.forEach(aptId => {
          if (mongoose.Types.ObjectId.isValid(aptId)) {
            allAppointmentIds.add(aptId.toString());
          }
        });
      }
    });

    // From sessions array
    payments.forEach(payment => {
      if (payment.sessions?.length) {
        payment.sessions.forEach(session => {
          let aptId;
          if (typeof session === 'string') {
            aptId = session.split('-')[0];
          } else if (session?.id) {
            aptId = typeof session.id === 'string' ? 
              session.id.split('-')[0] : 
              session.id.toString();
          }

          if (aptId && mongoose.Types.ObjectId.isValid(aptId)) {
            allAppointmentIds.add(aptId);
          }
        });
      }
    });

    // 3. Fetch all related appointments in one query
    const appointments = await Appointment.find({
      _id: { $in: Array.from(allAppointmentIds).map(id => new mongoose.Types.ObjectId(id)) }
    })
    .populate({
      path: 'patient',
      select: 'fullName email'
    })
    .lean();

    const appointmentMap = new Map<string, any>();
    appointments.forEach(app => {
      appointmentMap.set(app._id.toString(), {
        ...app,
        patient: app.patient || {
          _id: null,
          fullName: 'Unknown Patient',
          email: 'No email'
        },
        recurring: app.recurring || []
      });
    });

    // 4. Transform payments data with fallback logic
    const transformedPayments = payments.map(payment => {
      const basePayment = {
        _id: payment._id.toString(),
        amount: payment.amount || 0,
        status: payment.status || 'completed',
        paymentMethod: payment.paymentMethod || 'manual',
        transactionId: payment.transactionId || null,
        paidAt: payment.paidAt?.toISOString() || new Date().toISOString(),
        createdAt: payment.createdAt?.toISOString() || new Date().toISOString(),
        appointments: [] as any[]
      };

      // First try to process sessions (new format)
      if (payment.sessions?.length) {
        const sessionsByAppointment: Record<string, any[]> = {};
        
        payment.sessions.forEach(session => {
          let aptId;
          let sessionIndex = 0;
          let amount = 0;

          if (typeof session === 'string') {
            const parts = session.split('-');
            aptId = parts[0];
            sessionIndex = parseInt(parts[1]) || 0;
            amount = payment.sessionPrice || 0;
          } else {
            aptId = session.id?.toString();
            sessionIndex = session.sessionIndex || 0;
            amount = session.price || 0;
          }

          if (aptId && mongoose.Types.ObjectId.isValid(aptId)) {
            if (!sessionsByAppointment[aptId]) {
              sessionsByAppointment[aptId] = [];
            }
            sessionsByAppointment[aptId].push({
              sessionIndex,
              amount,
              date: appointmentMap.get(aptId)?.recurring?.[sessionIndex]?.date ||
                    appointmentMap.get(aptId)?.date
            });
          }
        });

        // Create appointment objects from sessions
        Object.entries(sessionsByAppointment).forEach(([aptId, sessions]) => {
          const appointment = appointmentMap.get(aptId);
          if (appointment) {
            basePayment.appointments.push({
              ...appointment,
              sessionsPaid: sessions
            });
          }
        });
      }

      // Fallback to direct appointments array if no sessions processed
      if (basePayment.appointments.length === 0 && payment.appointments?.length) {
        payment.appointments.forEach(aptId => {
          const aptIdStr = aptId.toString();
          const appointment = appointmentMap.get(aptIdStr);
          if (appointment) {
            basePayment.appointments.push({
              ...appointment,
              sessionsPaid: [{
                sessionIndex: 0, // Mark as full payment
                amount: appointment.price || 0,
                date: appointment.date
              }]
            });
          }
        });
      }

      // Calculate total amount if not set
      if (!basePayment.amount && basePayment.appointments.length) {
        basePayment.amount = basePayment.appointments.reduce((sum, apt) => 
          sum + apt.sessionsPaid.reduce((sessionSum, session) => 
            sessionSum + session.amount, 0
          ), 0
        );
      }

      return basePayment;
    });

    return NextResponse.json(transformedPayments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Error fetching payments", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}