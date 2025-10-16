import { StatusService, type AppointmentData } from "@/lib/services/status/StatusService";
import { getAllowedTransitions } from "@/lib/services/appointments/transition";
import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";
import type { AppointmentStatus } from "@/lib/utils/statusMapping";

export interface StatusValidationError {
  code: string;
  message: string;
  field?: string;
  currentStatus?: string;
  targetStatus?: string;
}

/**
 * Status Validation Middleware
 * Prevents invalid status transitions and ensures business rules are followed
 */
export class StatusValidator {
  
  /**
   * Validate a status transition
   */
  static validateTransition(
    appointment: AppointmentData, 
    targetStatus: AppointmentStatus
  ): StatusValidationError[] {
    const errors: StatusValidationError[] = [];
    const currentStatus = StatusService.getCurrentStatus(appointment);
    
    // Check if transition is allowed
    const allowedTransitions = getAllowedTransitions(currentStatus);
    if (!allowedTransitions.includes(targetStatus)) {
      errors.push({
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
        currentStatus,
        targetStatus
      });
    }
    
    // Validate business rules for specific transitions
    const businessRuleErrors = this.validateBusinessRules(appointment, targetStatus);
    errors.push(...businessRuleErrors);
    
    return errors;
  }
  
  /**
   * Validate business rules for status transitions
   */
  static validateBusinessRules(
    appointment: AppointmentData, 
    targetStatus: AppointmentStatus
  ): StatusValidationError[] {
    const errors: StatusValidationError[] = [];
    
    // Rule: Cannot schedule without therapist assigned
    if (targetStatus === APPOINTMENT_STATUSES.PENDING_SCHEDULING && !appointment.therapist) {
      errors.push({
        code: 'MISSING_THERAPIST',
        message: 'Cannot schedule appointment without therapist assigned',
        field: 'therapist',
        targetStatus
      });
    }
    
    // Rule: Cannot confirm without a scheduled date/time
    if (targetStatus === APPOINTMENT_STATUSES.CONFIRMED && !appointment.date) {
      errors.push({
        code: 'MISSING_DATE',
        message: 'Cannot confirm appointment without a scheduled date/time',
        field: 'date',
        targetStatus
      });
    }
    
    // Rule: Cannot proceed to matching without completed payment
    if (targetStatus === APPOINTMENT_STATUSES.PENDING_MATCH && 
        appointment.paymentStatus !== 'completed' && 
        !appointment.isStripeVerified && 
        !appointment.isBalance) {
      errors.push({
        code: 'PAYMENT_NOT_COMPLETED',
        message: 'Cannot proceed to matching without completed payment',
        field: 'paymentStatus',
        targetStatus
      });
    }
    
    // Rule: Cannot change status of cancelled appointments
    const currentStatus = StatusService.getCurrentStatus(appointment);
    if (currentStatus === APPOINTMENT_STATUSES.CANCELLED && 
        targetStatus !== APPOINTMENT_STATUSES.CANCELLED) {
      errors.push({
        code: 'CANCELLED_IMMUTABLE',
        message: 'Cannot change status of cancelled appointments',
        currentStatus,
        targetStatus
      });
    }
    
    // Rule: Cannot change status of completed appointments (except for admin corrections)
    if (currentStatus === APPOINTMENT_STATUSES.COMPLETED && 
        targetStatus !== APPOINTMENT_STATUSES.COMPLETED &&
        targetStatus !== APPOINTMENT_STATUSES.CANCELLED) {
      errors.push({
        code: 'COMPLETED_IMMUTABLE',
        message: 'Cannot change status of completed appointments',
        currentStatus,
        targetStatus
      });
    }
    
    return errors;
  }
  
  /**
   * Validate appointment data integrity
   */
  static validateAppointmentData(appointment: AppointmentData): StatusValidationError[] {
    const errors: StatusValidationError[] = [];
    
    // Required fields
    if (!appointment._id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Appointment ID is required',
        field: '_id'
      });
    }
    
    if (!appointment.status) {
      errors.push({
        code: 'MISSING_STATUS',
        message: 'Appointment status is required',
        field: 'status'
      });
    }
    
    // Validate status consistency
    const currentStatus = StatusService.getCurrentStatus(appointment);
    if (currentStatus === APPOINTMENT_STATUSES.CONFIRMED && !appointment.therapist) {
      errors.push({
        code: 'INCONSISTENT_STATE',
        message: 'Confirmed appointments must have a therapist assigned',
        field: 'therapist'
      });
    }
    
    if (currentStatus === APPOINTMENT_STATUSES.COMPLETED && !appointment.therapist) {
      errors.push({
        code: 'INCONSISTENT_STATE',
        message: 'Completed appointments must have a therapist assigned',
        field: 'therapist'
      });
    }
    
    return errors;
  }
  
  /**
   * Check if an appointment can be modified by a specific actor
   */
  static canModify(
    appointment: AppointmentData, 
    actor: { id: string; role: 'patient' | 'therapist' | 'admin' }
  ): { canModify: boolean; errors: StatusValidationError[] } {
    const errors: StatusValidationError[] = [];
    const currentStatus = StatusService.getCurrentStatus(appointment);
    
    // Admin can modify anything
    if (actor.role === 'admin') {
      return { canModify: true, errors: [] };
    }
    
    // Patient restrictions
    if (actor.role === 'patient') {
      // Patients cannot modify completed or cancelled appointments
      if ([APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW].includes(currentStatus)) {
        errors.push({
          code: 'PATIENT_CANNOT_MODIFY',
          message: 'Patients cannot modify completed or cancelled appointments',
          currentStatus
        });
      }
      
      // Patients can only cancel or reschedule their own appointments
      if (appointment.patient !== actor.id && appointment.patient?._id !== actor.id) {
        errors.push({
          code: 'NOT_PATIENT_APPOINTMENT',
          message: 'Patients can only modify their own appointments'
        });
      }
    }
    
    // Therapist restrictions
    if (actor.role === 'therapist') {
      // Therapists can only modify appointments assigned to them
      if (appointment.therapist !== actor.id && appointment.therapist?._id !== actor.id) {
        errors.push({
          code: 'NOT_THERAPIST_APPOINTMENT',
          message: 'Therapists can only modify appointments assigned to them'
        });
      }
      
      // Therapists cannot modify cancelled appointments
      if (currentStatus === APPOINTMENT_STATUSES.CANCELLED) {
        errors.push({
          code: 'THERAPIST_CANNOT_MODIFY_CANCELLED',
          message: 'Therapists cannot modify cancelled appointments',
          currentStatus
        });
      }
    }
    
    return { canModify: errors.length === 0, errors };
  }
  
  /**
   * Get validation summary for an appointment
   */
  static getValidationSummary(appointment: AppointmentData): {
    isValid: boolean;
    errors: StatusValidationError[];
    warnings: StatusValidationError[];
  } {
    const errors: StatusValidationError[] = [];
    const warnings: StatusValidationError[] = [];
    
    // Data integrity validation
    const dataErrors = this.validateAppointmentData(appointment);
    errors.push(...dataErrors);
    
    // Check for potential issues
    const currentStatus = StatusService.getCurrentStatus(appointment);
    
    // Warning: Appointment without date
    if (!appointment.date && currentStatus !== APPOINTMENT_STATUSES.UNPAID) {
      warnings.push({
        code: 'MISSING_DATE_WARNING',
        message: 'Appointment should have a scheduled date',
        field: 'date'
      });
    }
    
    // Warning: Confirmed appointment without meeting link
    if (currentStatus === APPOINTMENT_STATUSES.CONFIRMED && !appointment.meetingLink) {
      warnings.push({
        code: 'MISSING_MEETING_LINK',
        message: 'Confirmed appointment should have a meeting link',
        field: 'meetingLink'
      });
    }
    
    // Warning: Completed appointment without therapist validation
    if (currentStatus === APPOINTMENT_STATUSES.COMPLETED && !appointment.therapistValidated) {
      warnings.push({
        code: 'MISSING_THERAPIST_VALIDATION',
        message: 'Completed appointment should be validated by therapist',
        field: 'therapistValidated'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

