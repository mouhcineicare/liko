// /app/api/update-session/route.ts
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth/config';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { Appointment } from '@/lib/db/models';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const { appointmentId, sessionIndex } = await request.json();

    // Validate inputs
    if (!appointmentId || !mongoose.Types.ObjectId.isValid(appointmentId)) {
      return NextResponse.json(
        { error: 'Valid appointmentId is required' },
        { status: 400 }
      );
    }

    if (sessionIndex === undefined || sessionIndex === null) {
      return NextResponse.json(
        { error: 'sessionIndex is required' },
        { status: 400 }
      );
    }

    const numericIndex = Number(sessionIndex);
    if (isNaN(numericIndex) || numericIndex < 0) {
      return NextResponse.json(
        { error: 'sessionIndex must be a positive number' },
        { status: 400 }
      );
    }

    // Find and validate appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Get existing recurring sessions
    let recurringSessions = appointment.recurring || [];
    
    // Ensure all sessions are in object format with index
    recurringSessions = recurringSessions.map((s: any, idx: number) => {
      if (typeof s === 'object' && 'index' in s) {
        return s;
      }
      return {
        date: typeof s === 'string' ? s : (s && typeof s === 'object' && 'date' in s ? s.date : new Date().toISOString()),
        status: typeof s === 'object' && 'status' in s ? s.status : 'in_progress',
        payment: typeof s === 'object' && 'payment' in s ? s.payment : 'not_paid',
        index: idx,
        price: typeof s === 'object' && 'price' in s ? s.price : appointment.price / (appointment.totalSessions || 1)
      };
    });

    // Find the session by index
    const sessionToUpdate = recurringSessions.find(s => 'index' in s && s.index === numericIndex);
    
    if (!sessionToUpdate || typeof sessionToUpdate !== 'object') {
      return NextResponse.json(
        { 
          error: `Session with index ${numericIndex} not found`,
          availableIndices: recurringSessions.map(s => 'index' in s ? s.index : -1) 
        },
        { status: 404 }
      );
    }

    // Update only the found session status
    if ('status' in sessionToUpdate) {
      sessionToUpdate.status = 'completed';
    }
    
    // Keep all other sessions unchanged
    const updatedRecurring = [...recurringSessions];

    // Save the updated appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { recurring: updatedRecurring },
      { new: true }
    );

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: 'Failed to update appointment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedSession: {
        index: numericIndex,
        status: 'completed',
        date: 'date' in sessionToUpdate ? sessionToUpdate.date : '',
        payment: 'payment' in sessionToUpdate ? sessionToUpdate.payment : ''
      },
      message: 'Session status updated successfully',
      appointment: {
        _id: updatedAppointment._id,
        status: updatedAppointment.status
      }
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update session status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}