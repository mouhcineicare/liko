import { APPOINTMENT_STATUSES, LEGACY_STATUS_MAPPING, STATUS_CONFIG, STATUS_FLOW } from "@/lib/utils/statusMapping";
import type { AppointmentStatus } from "@/lib/utils/statusMapping";

export interface StatusDisplay {
  label: string;
  className: string;
  bgColor: string;
  color: string;
  icon: string;
  description: string;
}

export interface AppointmentData {
  _id: string;
  status: string;
  customStatus?: string;
  paymentStatus?: string;
  isStripeVerified?: boolean;
  isBalance?: boolean;
  therapistValidated?: boolean;
  therapist?: any;
  date?: string;
  isRescheduled?: boolean;
  meetingLink?: string;
}

/**
 * Centralized Status Service - Single Source of Truth for all status logic
 * This service handles status mapping, display, filtering, and business rules
 */
export class StatusService {
  
  /**
   * Get the current canonical status from any appointment object
   * Handles all status sources (status, customStatus, payment flags, etc.)
   */
  static getCurrentStatus(appointment: AppointmentData): AppointmentStatus {
    // Handle custom status override first
    if (appointment.customStatus) {
      return LEGACY_STATUS_MAPPING[appointment.customStatus] || appointment.customStatus as AppointmentStatus;
    }

    // Handle payment-based status logic
    if (!appointment.isStripeVerified && !appointment.isBalance) {
      return APPOINTMENT_STATUSES.UNPAID;
    }

    // Handle therapist validation logic
    if (appointment.status === 'completed' && appointment.therapistValidated) {
      return APPOINTMENT_STATUSES.COMPLETED;
    }

    // Handle rescheduled appointments
    if (appointment.isRescheduled && appointment.status === 'confirmed') {
      return APPOINTMENT_STATUSES.RESCHEDULED;
    }

    // Map legacy statuses
    const mappedStatus = LEGACY_STATUS_MAPPING[appointment.status] || appointment.status;
    return mappedStatus as AppointmentStatus;
  }

  /**
   * Get display information for any appointment
   */
  static getDisplayStatus(appointment: AppointmentData): StatusDisplay {
    const currentStatus = this.getCurrentStatus(appointment);
    return STATUS_CONFIG[currentStatus] || {
      label: currentStatus,
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      bgColor: 'bg-gray-50',
      color: 'text-gray-600',
      icon: '❓',
      description: 'Unknown status'
    };
  }

  /**
   * Check if an appointment is in an upcoming state
   */
  static isUpcoming(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    const now = new Date();
    const appointmentDate = appointment.date ? new Date(appointment.date) : null;
    
    return (
      (status === APPOINTMENT_STATUSES.CONFIRMED || status === APPOINTMENT_STATUSES.RESCHEDULED) &&
      appointmentDate && appointmentDate > now
    );
  }

  /**
   * Check if an appointment is completed
   */
  static isCompleted(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    return status === APPOINTMENT_STATUSES.COMPLETED;
  }

  /**
   * Check if an appointment is cancelled
   */
  static isCancelled(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    return status === APPOINTMENT_STATUSES.CANCELLED || status === APPOINTMENT_STATUSES.NO_SHOW;
  }

  /**
   * Check if an appointment requires payment
   */
  static requiresPayment(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    return status === APPOINTMENT_STATUSES.UNPAID;
  }

  /**
   * Check if an appointment is pending therapist matching
   */
  static isPendingMatch(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    return status === APPOINTMENT_STATUSES.PENDING_MATCH || 
           status === APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE;
  }

  /**
   * Check if an appointment is pending scheduling
   */
  static isPendingScheduling(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    return status === APPOINTMENT_STATUSES.PENDING_SCHEDULING;
  }

  /**
   * Check if an appointment can be rescheduled
   */
  static canReschedule(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    return [
      APPOINTMENT_STATUSES.CONFIRMED,
      APPOINTMENT_STATUSES.RESCHEDULED,
      APPOINTMENT_STATUSES.PENDING_SCHEDULING
    ].includes(status);
  }

  /**
   * Check if an appointment can be cancelled
   */
  static canCancel(appointment: AppointmentData): boolean {
    const status = this.getCurrentStatus(appointment);
    return ![
      APPOINTMENT_STATUSES.COMPLETED,
      APPOINTMENT_STATUSES.CANCELLED,
      APPOINTMENT_STATUSES.NO_SHOW
    ].includes(status);
  }

  /**
   * Check if a meeting can be joined
   */
  static canJoinMeeting(appointment: AppointmentData): boolean {
    if (!appointment.meetingLink) return false;
    
    const status = this.getCurrentStatus(appointment);
    const appointmentDate = appointment.date ? new Date(appointment.date) : null;
    
    if (!appointmentDate) return false;
    
    const now = new Date();
    const twoHoursBefore = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
    
    return (
      (status === APPOINTMENT_STATUSES.CONFIRMED || status === APPOINTMENT_STATUSES.RESCHEDULED) &&
      now >= twoHoursBefore
    );
  }

  /**
   * Get the next possible statuses for an appointment
   */
  static getNextPossibleStatuses(appointment: AppointmentData): AppointmentStatus[] {
    const currentStatus = this.getCurrentStatus(appointment);
    return STATUS_FLOW[currentStatus]?.next || [];
  }

  /**
   * Check if a status transition is valid
   */
  static isValidTransition(from: AppointmentData, to: AppointmentStatus): boolean {
    const currentStatus = this.getCurrentStatus(from);
    const allowedTransitions = STATUS_FLOW[currentStatus]?.next || [];
    return allowedTransitions.includes(to);
  }

  /**
   * Get patient-friendly status message
   */
  static getPatientStatusMessage(appointment: AppointmentData): string {
    const status = this.getCurrentStatus(appointment);
    
    switch (status) {
      case APPOINTMENT_STATUSES.UNPAID:
        return "Complete payment to activate your appointment";
      case APPOINTMENT_STATUSES.PENDING:
        return "Payment processing...";
      case APPOINTMENT_STATUSES.PENDING_MATCH:
        return "Finding the perfect therapist for you";
      case APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE:
        return "Therapist assigned - waiting for acceptance";
      case APPOINTMENT_STATUSES.PENDING_SCHEDULING:
        return "Choose your appointment time";
      case APPOINTMENT_STATUSES.CONFIRMED:
        return "Appointment confirmed - see you soon!";
      case APPOINTMENT_STATUSES.RESCHEDULED:
        return "Appointment rescheduled successfully";
      case APPOINTMENT_STATUSES.COMPLETED:
        return "Session completed";
      case APPOINTMENT_STATUSES.CANCELLED:
        return "Appointment cancelled";
      case APPOINTMENT_STATUSES.NO_SHOW:
        return "Appointment missed";
      default:
        return "Status unknown";
    }
  }

  /**
   * Get therapist-friendly status message
   */
  static getTherapistStatusMessage(appointment: AppointmentData): string {
    const status = this.getCurrentStatus(appointment);
    
    switch (status) {
      case APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE:
        return "New patient assigned - accept or decline";
      case APPOINTMENT_STATUSES.PENDING_SCHEDULING:
        return "Patient waiting for time selection";
      case APPOINTMENT_STATUSES.CONFIRMED:
        return "Upcoming session";
      case APPOINTMENT_STATUSES.RESCHEDULED:
        return "Rescheduled session";
      case APPOINTMENT_STATUSES.COMPLETED:
        return appointment.therapistValidated ? "Session validated" : "Validate session for payment";
      default:
        return this.getPatientStatusMessage(appointment);
    }
  }
}

