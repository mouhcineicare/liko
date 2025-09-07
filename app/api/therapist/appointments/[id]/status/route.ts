import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { updateAppointmentStatus } from '@/lib/services/appointments/legacy-wrapper';
import { APPOINTMENT_STATUSES } from '@/lib/utils/statusMapping';

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

    const appointmentId = params.id;
    const { status } = await request.json();

    // Validate status - use correct enum values
    const validStatuses = ['confirmed', 'upcoming', 'completed', 'no-show', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Find the appointment and verify it belongs to this therapist
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      therapist: session.user.id
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Check if already validated - return success with redirect info
    if (appointment.therapistValidated === true) {
      return NextResponse.json({ 
        success: true,
        message: 'Appointment has already been validated - cannot change status',
        alreadyValidated: true,
        redirectTo: 'completed'
      });
    }

    // Check if already marked as no-show
    if (appointment.status === 'no-show' && status !== 'no-show') {
      return NextResponse.json({ 
        success: true,
        message: 'Appointment has already been marked as no-show',
        alreadyNoShow: true,
        redirectTo: 'cancelled'
      });
    }

    // Map legacy statuses to new ones
    let newStatus = status;
    if (status === 'upcoming') {
      newStatus = APPOINTMENT_STATUSES.CONFIRMED;
    }

    // Determine actor
    const actor = { id: session.user.id, role: 'therapist' as const };

    // Use new transition system
    const updatedAppointment = await updateAppointmentStatus(
      appointmentId,
      newStatus,
      actor,
      { 
        reason: status === 'no-show' ? 'Marked as no-show by therapist' : `Status changed to ${status} by therapist`,
        meta: { 
          originalStatus: status,
          therapistValidated: appointment.therapistValidated,
          legacyAudit: {
            fromStatus: appointment.status,
            toStatus: status,
            timestamp: new Date(),
            performedBy: session.user.id,
            performedByRole: 'therapist'
          }
        }
      }
    );

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Error updating appointment status:', error);
    return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Origin': '*'
    }
  });
}