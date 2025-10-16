import { StatusService, type AppointmentData } from "@/lib/services/status/StatusService";
import { APPOINTMENT_STATUSES } from "@/lib/utils/statusMapping";

/**
 * Centralized Appointment Filtering Logic
 * Single source of truth for all appointment filtering across the application
 */
export class AppointmentFilters {
  
  /**
   * Filter upcoming appointments
   */
  static upcoming(appointments: AppointmentData[]): AppointmentData[] {
    const now = new Date();
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      const appointmentDate = appointment.date ? new Date(appointment.date) : null;
      
      return (
        (status === APPOINTMENT_STATUSES.CONFIRMED || status === APPOINTMENT_STATUSES.RESCHEDULED) &&
        appointmentDate && appointmentDate > now
      );
    });
  }

  /**
   * Filter unpaid appointments
   */
  static unpaid(appointments: AppointmentData[]): AppointmentData[] {
    const now = new Date();
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      const appointmentDate = appointment.date ? new Date(appointment.date) : null;
      
      return status === APPOINTMENT_STATUSES.UNPAID && 
             appointmentDate && appointmentDate > now;
    });
  }

  /**
   * Filter appointments pending therapist matching
   */
  static pendingMatch(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      return status === APPOINTMENT_STATUSES.PENDING_MATCH || 
             status === APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE;
    });
  }

  /**
   * Filter appointments pending scheduling
   */
  static pendingScheduling(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      return status === APPOINTMENT_STATUSES.PENDING_SCHEDULING;
    });
  }

  /**
   * Filter appointments pending validation (for therapists)
   */
  static pendingValidation(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      
      if (status !== APPOINTMENT_STATUSES.COMPLETED) return false;
      
      // Exclude appointments that are already paid (from previous validation system)
      if (appointment.therapistPaid) return false;
      
      // Show only appointments that haven't been validated by therapist yet
      if (appointment.therapistValidated) return false;
      
      // For unpaid appointments, only show if they're in the future
      if (!appointment.isStripeVerified) {
        const appointmentDate = appointment.date ? new Date(appointment.date) : null;
        const now = new Date();
        return appointmentDate && appointmentDate > now;
      }
      
      // Show all paid appointments (ready for validation)
      return true;
    });
  }

  /**
   * Filter completed appointments (validated and ready for payment)
   */
  static completed(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      return (status === APPOINTMENT_STATUSES.COMPLETED && appointment.therapistValidated && !appointment.therapistPaid) || 
             appointment.therapistPaid === true;
    });
  }

  /**
   * Filter cancelled/no-show appointments
   */
  static cancelled(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      return status === APPOINTMENT_STATUSES.CANCELLED || status === APPOINTMENT_STATUSES.NO_SHOW;
    });
  }

  /**
   * Filter appointments by patient ID
   */
  static byPatient(appointments: AppointmentData[], patientId: string): AppointmentData[] {
    return appointments.filter(appointment => 
      appointment.patient?._id === patientId || appointment.patient === patientId
    );
  }

  /**
   * Filter appointments by therapist ID
   */
  static byTherapist(appointments: AppointmentData[], therapistId: string): AppointmentData[] {
    return appointments.filter(appointment => 
      appointment.therapist?._id === therapistId || appointment.therapist === therapistId
    );
  }

  /**
   * Filter appointments that can be rescheduled
   */
  static canReschedule(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => StatusService.canReschedule(appointment));
  }

  /**
   * Filter appointments that can be cancelled
   */
  static canCancel(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => StatusService.canCancel(appointment));
  }

  /**
   * Filter appointments with meeting links available
   */
  static withMeetingLinks(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => 
      appointment.meetingLink && StatusService.canJoinMeeting(appointment)
    );
  }

  /**
   * Filter appointments by date range
   */
  static byDateRange(appointments: AppointmentData[], startDate: Date, endDate: Date): AppointmentData[] {
    return appointments.filter(appointment => {
      const appointmentDate = appointment.date ? new Date(appointment.date) : null;
      return appointmentDate && 
             appointmentDate >= startDate && 
             appointmentDate <= endDate;
    });
  }

  /**
   * Filter appointments for today
   */
  static today(appointments: AppointmentData[]): AppointmentData[] {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    return this.byDateRange(appointments, startOfDay, endOfDay);
  }

  /**
   * Filter appointments for this week
   */
  static thisWeek(appointments: AppointmentData[]): AppointmentData[] {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6, 23, 59, 59);
    
    return this.byDateRange(appointments, startOfWeek, endOfWeek);
  }

  /**
   * Get active appointments (paid and not cancelled/completed)
   */
  static active(appointments: AppointmentData[]): AppointmentData[] {
    return appointments.filter(appointment => {
      const status = StatusService.getCurrentStatus(appointment);
      return ![
        APPOINTMENT_STATUSES.UNPAID,
        APPOINTMENT_STATUSES.CANCELLED,
        APPOINTMENT_STATUSES.NO_SHOW,
        APPOINTMENT_STATUSES.COMPLETED
      ].includes(status);
    });
  }

  /**
   * Sort appointments by date (ascending)
   */
  static sortByDate(appointments: AppointmentData[], ascending: boolean = true): AppointmentData[] {
    return [...appointments].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  /**
   * Sort appointments by status priority (for admin dashboard)
   */
  static sortByStatusPriority(appointments: AppointmentData[]): AppointmentData[] {
    const statusPriority = {
      [APPOINTMENT_STATUSES.UNPAID]: 1,
      [APPOINTMENT_STATUSES.PENDING]: 2,
      [APPOINTMENT_STATUSES.PENDING_MATCH]: 3,
      [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE]: 4,
      [APPOINTMENT_STATUSES.PENDING_SCHEDULING]: 5,
      [APPOINTMENT_STATUSES.CONFIRMED]: 6,
      [APPOINTMENT_STATUSES.RESCHEDULED]: 7,
      [APPOINTMENT_STATUSES.COMPLETED]: 8,
      [APPOINTMENT_STATUSES.CANCELLED]: 9,
      [APPOINTMENT_STATUSES.NO_SHOW]: 10
    };

    return [...appointments].sort((a, b) => {
      const statusA = StatusService.getCurrentStatus(a);
      const statusB = StatusService.getCurrentStatus(b);
      const priorityA = statusPriority[statusA] || 999;
      const priorityB = statusPriority[statusB] || 999;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort by date (ascending)
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  }
}

