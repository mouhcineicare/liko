import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import TherapistPayment from "@/lib/db/models/TherapistPayment";
import Appointment from "@/lib/db/models/Appointment";
import { authOptions } from "@/lib/auth/config";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Fetch payments with therapist info and populate appointments
    const payments = await TherapistPayment.find()
      .populate("therapist", "fullName email")
      .populate("processedBy", "fullName")
      .sort({ paidAt: -1, createdAt: -1 });

    // Get all unique appointment IDs from all payments with proper validation
    const allAppointmentIds = [...new Set(
      payments.flatMap(payment => 
        payment.sessions.flatMap((session: any) => {
          try {
            // Handle both string and object session formats
            const sessionId = typeof session === 'string' ? session : session?.id;
            if (!sessionId) return [];
            
            const [appointmentId] = sessionId.split('-');
            return mongoose.Types.ObjectId.isValid(appointmentId) ? [appointmentId] : [];
          } catch (error) {
            console.error('Error processing session:', error);
            return [];
          }
        }).filter(Boolean)
      )
    )].filter(Boolean);

    // Fetch all appointments in one query with patient and therapist data
    const appointments = await Appointment.find({
      _id: { $in: allAppointmentIds }
    })
      .populate("patient", "fullName email")
      .populate("therapist", "fullName level");

    // Create a map for quick lookup
    const appointmentMap = new Map();
    appointments.forEach(app => appointmentMap.set(app._id.toString(), app));

    // Process each payment
    const formattedPayments = await Promise.all(payments.map(async (payment) => {
      // Process each session in the payment
      const processedSessions = await Promise.all(payment.sessions.map(async (session: any) => {
        try {
          // Handle both string and object session formats
          const sessionId = typeof session === 'string' ? session : session?.id;
          const sessionPrice = typeof session === 'string' ? payment.sessionPrice : session?.price;
          
          if (!sessionId) return null;

          const [appointmentId, indexStr] = sessionId.split('-');
          if (!appointmentId || !indexStr) return null;

          const appointment = appointmentMap.get(appointmentId);
          if (!appointment) return null;

          const index = indexStr === '1000' ? 1000 : parseInt(indexStr);
          if (isNaN(index)) return null;

          let sessionDate = appointment.date;
          let sessionStatus = appointment.status;
          let sessionPaymentStatus = 'not_paid';

          // Try to find session in recurring array
          if (Array.isArray(appointment.recurring)) {
            const recurringSession = appointment.recurring.find((s: any) => {
              if (typeof s === 'object') {
                return s.index === index;
              }
              return false;
            });
            
            if (recurringSession) {
              sessionDate = recurringSession.date || sessionDate;
              sessionStatus = recurringSession.status || sessionStatus;
              sessionPaymentStatus = recurringSession.payment || sessionPaymentStatus;
            }
          }

          return {
            _id: sessionId,
            appointmentId,
            date: sessionDate,
            price: sessionPrice || 0, // Default to 0 if price is missing
            status: sessionStatus,
            paymentStatus: 'paid',
            isPaid: true,
            index,
            patientName: appointment.patient?.fullName || '',
            patientId: appointment.patient?._id,
            appointmentType: appointment.plan,
            therapistLevel: appointment.therapist?.level || 1,
            paidAt: payment.paidAt?.toISOString(),
            isCurrent: index === 1000
          };
        } catch (error) {
          console.error('Error processing session:', error);
          return null;
        }
      }));

      // Filter out null sessions
      const validSessions = processedSessions.filter(Boolean);

      // Group sessions by appointment
      const sessionsByAppointment: Record<string, any[]> = {};
      validSessions.forEach((session: any) => {
        if (!session?.appointmentId) return;
        if (!sessionsByAppointment[session.appointmentId]) {
          sessionsByAppointment[session.appointmentId] = [];
        }
        sessionsByAppointment[session.appointmentId].push(session);
      });

      // Create appointment details for each group
      const processedAppointments = await Promise.all(
        Object.entries(sessionsByAppointment).map(async ([appointmentId, sessions]) => {
          const appointment = appointmentMap.get(appointmentId);
          if (!appointment) return null;

          // Check if current session (index 1000) is paid
          const isCurrentPaid = sessions.some(s => s.index === 1000);

          return {
            _id: appointment._id,
            date: appointment.date,
            price: appointment.price,
            plan: appointment.plan,
            status: appointment.status,
            patient: appointment.patient,
            paymentStatus: appointment.paymentStatus,
            totalSessions: appointment.totalSessions,
            recurring: appointment.recurring,
            therapist: appointment.therapist,
            isPaid: isCurrentPaid,
            therapistPaid: appointment.therapistPaid,
            sessions
          };
        })
      );

      // Filter out null appointments
      const validAppointments = processedAppointments.filter(Boolean);

      // Calculate total amount from all sessions
      let totalAmount = validSessions.reduce(
        (sum: number, session: any) => sum + (session.price || 0), 
        0
      );

      // Fall back to payment.amount if totalAmount is 0 (no session prices available)
      if (totalAmount === 0 && payment.amount) {
        totalAmount = payment.amount;
      }

      return {
        ...payment.toObject(),
        amount: totalAmount,
        sessions: validSessions,
        appointments: validAppointments,
        paidAt: payment.paidAt?.toISOString(),
        createdAt: payment.createdAt?.toISOString()
      };
    }));

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Error fetching payment history", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}