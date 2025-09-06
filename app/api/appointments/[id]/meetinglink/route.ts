// File: /api/appointments/[id]/meetinglink/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db/connect';
import { authOptions } from '@/lib/auth/config';
import { Appointment } from '@/lib/db/models';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to database
    await connectDB();

    // Get the current session
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "therapist" && session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get appointment ID from params
    const appointmentId = params.id;
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const { meetingLink } = await request.json();
    if (!meetingLink) {
      return NextResponse.json(
        { error: 'Meeting link is required' },
        { status: 400 }
      );
    }

    // Validate meeting link format (basic URL validation)
    try {
      new URL(meetingLink);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid meeting link format' },
        { status: 400 }
      );
    }

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Update the meeting link
    appointment.meetingLink = meetingLink;
    
    // If appointment was pending scheduling, update status to in_progress
    if (appointment.status === 'pending_scheduling') {
      appointment.status = 'in_progress';
    }

    // Save the updated appointment
    await appointment.save();

    return NextResponse.json(
      { 
        message: 'Meeting link updated successfully',
        appointment: {
          _id: appointment._id,
          meetingLink: appointment.meetingLink,
          status: appointment.status,
          date: appointment.date,
          patient: appointment.patient
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating meeting link:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting link' },
      { status: 500 }
    );
  }
}