import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import mongoose from "mongoose";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import Appointment from "@/lib/db/models/Appointment";
import User from "@/lib/db/models/User";

export const dynamic = 'force-dynamic';

interface RecurringSession {
  date: string;
  status: string;
  paymentStatus: string;
  index: number;
}

interface AppointmentSession {
  _id: string;
  date: string | Date;
  price: number;
  status: 'not_paid' | 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled' | 'in_progress' | 'completed';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  isPaid: boolean;
  paidAt?: string;
  index?: number;
  sessionDate?: string;
  isCurrentSession?: boolean;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const appointmentId = searchParams.get('appointmentId');

    // If requesting sessions for a specific appointment
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient', 'fullName email');
      
      if (!appointment) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      // Get all payments that include this appointment's sessions
      const payments = await TherapistPayment.find({
        sessions: { $regex: new RegExp(`^${appointmentId}-`) }
      });

      // Extract paid session IDs and details
      const paidSessions = payments.flatMap((payment: any) => 
        payment.sessionsHistory
          .filter((s: {_id?: string}) => s._id?.startsWith(`${appointmentId}-`))
          .map((s: {_id: string, date: string, price: number, status: string}) => ({
            _id: s._id,
            date: s.date,
            price: s.price,
            status: s.status,
            paymentStatus: 'completed' as const,
            isPaid: true,
            paidAt: payment.paidAt
          }))
      );

      // Build complete session list
      const sessionPrice = appointment.price / appointment.totalSessions;
      const allSessions = [];

      // Main appointment session
      const mainSession = {
        _id: `${appointment._id}-0`,
        date: appointment.date,
        price: sessionPrice,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        isPaid: paidSessions.some(s => s._id === `${appointment._id}-0`)
      };
      if (mainSession.isPaid) {
        const paidSession = paidSessions.find(s => s._id === `${appointment._id}-0`);
        mainSession.paidAt = paidSession?.paidAt;
      }
      allSessions.push(mainSession);

      // Add recurring sessions
      if (appointment.recurring?.length > 0) {
        appointment.recurring.forEach((date, index) => {
          const sessionId = `${appointment._id}-${index + 1}`;
          const isPaid = paidSessions.some(s => s._id === sessionId);
          const session = {
            _id: sessionId,
            date,
            price: sessionPrice,
            status: appointment.status,
            paymentStatus: appointment.paymentStatus,
            isPaid,
            index: index + 1
          };
          if (isPaid) {
            const paidSession = paidSessions.find(s => s._id === sessionId);
            session.paidAt = paidSession?.paidAt;
            session.paymentStatus = 'completed';
          }
          allSessions.push(session);
        });
      }

      return NextResponse.json({
        appointment: {
          _id: appointment._id,
          plan: appointment.plan,
          patient: appointment.patient,
          totalSessions: appointment.totalSessions,
          totalPrice: appointment.price,
          therapistId: appointment.therapist,
        },
        sessions: allSessions,
        paidCount: paidSessions.length,
        unpaidCount: appointment.totalSessions - paidSessions.length
      });
    }

    // Get all payments with populated data and session details
    const payments = await TherapistPayment.find()
      .populate("therapist", "fullName email level")
      .populate({
        path: "appointments",
        populate: { path: "patient", select: "fullName email" }
      })
      .sort({ createdAt: -1 });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Error fetching payments" },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const {
      therapistId,
      paymentMethod,
      sessions,
      manualNote,
      therapistLevel,
      walletAddress,
      transactionId,
      stripeTransferId
    } = await req.json();

    if (!therapistId || !sessions?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sessionsByAppointment: Record<string, { 
      sessionIds: string[],
      prices: number[],
      amount: number 
    }> = {};
    const appointmentIds: string[] = [];

    for (const session of sessions) {
      const [appointmentId] = session.id.split('-');
      
      if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
  return NextResponse.json(
    { error: `Invalid appointment ID format: ${appointmentId}` },
    { status: 400 }
  );
}

      if (!sessionsByAppointment[appointmentId]) {
        sessionsByAppointment[appointmentId] = { 
          sessionIds: [], 
          prices: [], 
          amount: 0 
        };
        appointmentIds.push(appointmentId);
      }
      sessionsByAppointment[appointmentId].sessionIds.push(session.id);
      sessionsByAppointment[appointmentId].prices.push(session.price);
      sessionsByAppointment[appointmentId].amount += session.price;
    }

    const therapist = await User.findById(therapistId);
    if (!therapist) {
      return NextResponse.json(
        { error: "Therapist not found" },
        { status: 404 }
      );
    }

    const appointments = await Appointment.find({
      _id: { $in: appointmentIds },
      therapist: therapistId
    });

    if (appointments.length !== appointmentIds.length) {
      const missingIds = appointmentIds.filter(id => 
  !appointments.some((a: {_id: {toString: () => string}}) => a._id.toString() === id)
);
      return NextResponse.json(
        { error: `Appointments not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    const paymentRecords = [];
    let firstSessionPrice = 0;

    // Update appointment sessions to mark them as paid
    for (const appointmentId in sessionsByAppointment) {
      const { sessionIds: paidSessionIds, prices: sessionPrices } = sessionsByAppointment[appointmentId];
      const currentAppointment = await Appointment.findById(appointmentId);
      
      if (currentAppointment) {
        // Mark main session as paid if included
        if (paidSessionIds.includes(`${appointmentId}-0`)) {
          currentAppointment.paymentStatus = 'completed';
        }
        
        // Mark recurring sessions as paid
        currentAppointment.recurring = currentAppointment.recurring.map((s: any, idx: number) => {
          const sessionId = `${appointmentId}-${idx + 1}`;
          if (paidSessionIds.includes(sessionId)) {
            return {
              ...(typeof s === 'object' ? s : { date: s }),
              paymentStatus: 'completed',
              price: sessionPrices[paidSessionIds.indexOf(sessionId)]
            };
          }
          return typeof s === 'object' ? s : { date: s };
        });
        
        await currentAppointment.save();
      }
      const { sessionIds, prices, amount } = sessionsByAppointment[appointmentId];
      
      if (!firstSessionPrice && prices.length > 0) {
        firstSessionPrice = prices[0];
      }

      // Update the payment data creation
const paymentData = {
  therapist: therapistId,
  amount,
  paymentMethod: paymentMethod || 'manual',
  sessions: sessionIds.map((id, idx) => ({
    id,
    price: prices[idx]
  })),
  appointments: [appointmentId],
  sessionPrice: amount / sessionIds.length,
  therapistLevel,
  processedBy: session.user.id,
  status: "completed",
  paidAt: new Date(),
  ...(paymentMethod === 'usdt' && { 
    cryptoAddress: walletAddress,
    transactionId
  }),
  ...(paymentMethod === 'manual' && { 
    manualNote
  }),
  ...(paymentMethod === 'stripe' && {
    stripeTransferId
  })
};

      const payment = await TherapistPayment.create(paymentData);
      paymentRecords.push(payment);

      const appointment = appointments.find(a => a._id.toString() === appointmentId);
      if (appointment) {
        let updatedRecurring = (appointment.recurring || []).map((s: any, idx: number) => {
          if (typeof s === 'object' && s.index !== undefined) return s;
          if (typeof s === 'string') return { 
            date: s, 
            status: 'completed', 
            payment: 'not_paid', 
            index: idx 
          };
          return { 
            date: new Date().toISOString(), 
            status: 'completed', 
            payment: 'not_paid', 
            index: idx 
          };
        });

        let isCurrentSessionPaid = false;

        for (let i = 0; i < sessionIds.length; i++) {
          const [_, sessionIndexStr] = sessionIds[i].split('-');
          const index = parseInt(sessionIndexStr);
          
          if (isNaN(index)) continue;

          if (index === 1000) {
            isCurrentSessionPaid = true;
            continue;
          }

          const sessionIndex = updatedRecurring.findIndex(s => s.index === index);
          if (sessionIndex !== -1) {
            updatedRecurring[sessionIndex] = {
              ...updatedRecurring[sessionIndex],
              payment: 'paid',
              price: prices[i]
            };
          }
        }

        updatedRecurring.sort((a, b) => a.index - b.index);

        const updateData: any = {
          recurring: updatedRecurring,
          $inc: { paidAmount: amount },
          therapistPaid: updatedRecurring.every(s => s.payment === 'paid')
        };

        if (isCurrentSessionPaid) {
          updateData.therapistPaid = true;
        }

        await Appointment.findByIdAndUpdate(
          appointment._id, 
          { $set: updateData },
          { new: true }
        );
      }
    }

    return NextResponse.json({
      success: true,
      paymentIds: paymentRecords.map(p => p._id),
      message: "Payments processed successfully",
      sessionPrice: firstSessionPrice
    });

  } catch (error: any) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      { error: error.message || "Payment processing failed" },
      { status: 500 }
    );
  }
}

