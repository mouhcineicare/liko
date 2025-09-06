import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import { Appointment, TherapistPayment } from '@/lib/db/models';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const appointmentId = params.id;
    const appointment = await Appointment.findById(appointmentId)
      .populate('therapist', 'fullName email level')
      .populate('patient', 'fullName email');

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Get all sessions from the appointment
    const sessions = [];
    
    // Add main session
    sessions.push({
      _id: `${appointmentId}-main`,
      date: appointment.date,
      price: appointment.price,
      status: 'completed',
      payment: 'paid',
      isMain: true
    });

    // Add recurring sessions
    if (appointment.recurring && appointment.recurring.length > 0) {
      appointment.recurring.forEach((session: any, index: number) => {
        if (typeof session === 'object') {
          sessions.push({
            _id: `${appointmentId}-${session.index ?? index}`,
            date: session.date,
            price: session.price || (appointment.price / (appointment.totalSessions || 1)),
            status: session.status || 'completed',
            payment: 'paid',
            index: session.index ?? index
          });
        } else {
          sessions.push({
            _id: `${appointmentId}-${index}`,
            date: session,
            price: appointment.price / (appointment.totalSessions || 1),
            status: 'completed',
            payment: 'paid',
            index
          });
        }
      });
    }

    // Calculate total amount from all sessions
    const totalAmount = sessions.reduce((sum: number, session: any) => {
      return sum + (session.price || 0);
    }, 0);

    // Calculate payout amount based on therapist level
    const payoutPercentage = appointment.therapist?.level === 2 ? 0.57 : 0.5;
    const payoutAmount = totalAmount * payoutPercentage;

    // Create therapist payment record
    const paymentRecord = await TherapistPayment.create({
      therapist: appointment.therapist?._id,
      amount: payoutAmount,
      paymentMethod: "manual",
      manualNote: "Marked as paid by admin",
      sessions: sessions.map(session => ({
        id: session._id,
        price: session.price,
        date: session.date,
        status: session.status,
        paymentStatus: session.payment,
        index: session.index
      })),
      appointments: [appointmentId],
      status: "completed",
      paidAt: new Date(),
      processedBy: session.user.id,
      therapistLevel: appointment.therapist?.level || 1,
      patient: appointment.patient._id,
      sessionPrice: appointment.price,
      payoutPercentage
    });

    // Update the appointment
    const updatedRecurring = (appointment.recurring || []).map((s: any, index: number) => {
      if (typeof s === 'object') {
        return {
          ...s,
          payment: 'paid',
          status: 'completed'
        };
      }
      return {
        date: s,
        status: 'completed',
        payment: 'paid',
        index
      };
    });

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { 
        isPaid: true,
        paymentStatus: 'completed',
        therapistPaid: true,
        recurring: updatedRecurring,
        status: 'completed'
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      payment: paymentRecord,
      message: "Appointment marked as paid and payment history created"
    });
  } catch (error: any) {
    console.error('Error marking appointment as paid:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}