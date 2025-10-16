import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import Appointment from '@/lib/db/models/Appointment';
import { updateAppointmentStatus } from '@/lib/services/appointments/legacy-wrapper';
import { StatusValidator } from '@/lib/middleware/statusValidation';
import { StatusService } from '@/lib/services/status/StatusService';
import { APPOINTMENT_STATUSES } from '@/lib/utils/statusMapping';
import type { AppointmentStatus } from '@/lib/utils/statusMapping';

/**
 * Enhanced API Route Template for Status Updates
 * Use this template for all new status-related API routes
 */

interface StatusUpdateRequest {
  status: AppointmentStatus;
  reason?: string;
  meta?: any;
}

interface Actor {
  id: string;
  role: 'patient' | 'therapist' | 'admin';
}

/**
 * Generic status update handler with full validation
 */
export async function handleStatusUpdate(
  request: NextRequest,
  appointmentId: string,
  allowedRoles: Array<'patient' | 'therapist' | 'admin'> = ['admin']
) {
  try {
    // 1. Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!allowedRoles.includes(session.user.role as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse and validate request
    const { status, reason, meta }: StatusUpdateRequest = await request.json();
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // 3. Connect to database
    await connectDB();

    // 4. Get appointment with populated data
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "fullName email")
      .populate("therapist", "fullName email");

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // 5. Create actor object
    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as any
    };

    // 6. Validate permissions
    const { canModify, errors: permissionErrors } = StatusValidator.canModify(appointment, actor);
    if (!canModify) {
      return NextResponse.json({ 
        error: 'Permission denied', 
        details: permissionErrors.map(e => e.message).join(', ')
      }, { status: 403 });
    }

    // 7. Validate status transition
    const validationErrors = StatusValidator.validateTransition(appointment, status);
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Invalid status transition', 
        details: validationErrors.map(e => e.message).join(', '),
        validationErrors
      }, { status: 400 });
    }

    // 8. Perform status update using centralized system
    const updatedAppointment = await updateAppointmentStatus(
      appointmentId,
      status,
      actor,
      { 
        reason: reason || `Status updated to ${status}`,
        meta: {
          ...meta,
          route: request.url,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      }
    );

    // 9. Return success response
    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
      message: `Status updated to ${status} successfully`
    });

  } catch (error) {
    console.error('Status update error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Forbidden transition')) {
        return NextResponse.json({ 
          error: 'Invalid status transition', 
          details: error.message 
        }, { status: 400 });
      }
      
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Enhanced appointment fetcher with status processing
 */
export async function getAppointmentWithStatus(appointmentId: string) {
  await connectDB();
  
  const appointment = await Appointment.findById(appointmentId)
    .populate("patient", "fullName email image telephone timeZone")
    .populate("therapist", "fullName email image");

  if (!appointment) {
    return null;
  }

  // Add computed status fields
  const appointmentData = appointment.toObject();
  const currentStatus = StatusService.getCurrentStatus(appointmentData);
  const statusDisplay = StatusService.getDisplayStatus(appointmentData);
  
  return {
    ...appointmentData,
    computedStatus: currentStatus,
    statusDisplay,
    canReschedule: StatusService.canReschedule(appointmentData),
    canCancel: StatusService.canCancel(appointmentData),
    canJoinMeeting: StatusService.canJoinMeeting(appointmentData),
    nextPossibleStatuses: StatusService.getNextPossibleStatuses(appointmentData)
  };
}

/**
 * Bulk status update handler
 */
export async function handleBulkStatusUpdate(
  request: NextRequest,
  appointmentIds: string[],
  allowedRoles: Array<'patient' | 'therapist' | 'admin'> = ['admin']
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !allowedRoles.includes(session.user.role as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, reason }: StatusUpdateRequest = await request.json();
    await connectDB();

    const results = [];
    const errors = [];

    for (const appointmentId of appointmentIds) {
      try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
          errors.push({ appointmentId, error: 'Appointment not found' });
          continue;
        }

        const actor: Actor = { id: session.user.id, role: session.user.role as any };
        
        // Validate transition
        const validationErrors = StatusValidator.validateTransition(appointment, status);
        if (validationErrors.length > 0) {
          errors.push({ 
            appointmentId, 
            error: 'Invalid transition', 
            details: validationErrors.map(e => e.message) 
          });
          continue;
        }

        const updatedAppointment = await updateAppointmentStatus(
          appointmentId,
          status,
          actor,
          { reason: reason || `Bulk update to ${status}` }
        );

        results.push({ appointmentId, success: true, appointment: updatedAppointment });
      } catch (error) {
        errors.push({ appointmentId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: results.length > 0,
      results,
      errors,
      summary: {
        total: appointmentIds.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('Bulk status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Status validation endpoint handler
 */
export async function handleStatusValidation(appointmentId: string) {
  try {
    await connectDB();
    
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const validation = StatusValidator.getValidationSummary(appointment);
    const currentStatus = StatusService.getCurrentStatus(appointment);
    const nextPossibleStatuses = StatusService.getNextPossibleStatuses(appointment);

    return NextResponse.json({
      appointmentId,
      currentStatus,
      nextPossibleStatuses,
      validation,
      statusDisplay: StatusService.getDisplayStatus(appointment)
    });

  } catch (error) {
    console.error('Status validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

