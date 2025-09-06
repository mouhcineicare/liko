import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get therapist session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    const { meetingLink } = await request.json();
    const appointmentId = params.id;

    // Find appointment and verify therapist ownership
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      therapist: session.user.id
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Update meeting link
    appointment.meetingLink = meetingLink;
    await appointment.save();

    return NextResponse.json({ 
      success: true, 
      meetingLink: appointment.meetingLink 
    });

  } catch (error) {
    console.error('Error updating meeting link:', error);
    return NextResponse.json({ error: 'Failed to update meeting link' }, { status: 500 });
  }
}

