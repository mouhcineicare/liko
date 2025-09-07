// Clean status system for appointments
export const APPOINTMENT_STATUSES = {
  // Initial states
  UNPAID: 'unpaid',
  PENDING: 'pending',
  PENDING_MATCH: 'pending_match',
  MATCHED_PENDING_THERAPIST_ACCEPTANCE: 'matched_pending_therapist_acceptance',
  PENDING_SCHEDULING: 'pending_scheduling',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no-show',
  RESCHEDULED: 'rescheduled'
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES];

// Status flow mapping
export const STATUS_FLOW = {
  [APPOINTMENT_STATUSES.UNPAID]: {
    next: [APPOINTMENT_STATUSES.PENDING],
    displayName: 'Unpaid',
    description: 'Payment required to proceed',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  [APPOINTMENT_STATUSES.PENDING]: {
    next: [APPOINTMENT_STATUSES.PENDING_MATCH, APPOINTMENT_STATUSES.UNPAID],
    displayName: 'Processing Payment',
    description: 'Payment in progress',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  [APPOINTMENT_STATUSES.PENDING_MATCH]: {
    next: [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE],
    displayName: 'Finding Therapist',
    description: 'Looking for available therapist',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE]: {
    next: [APPOINTMENT_STATUSES.PENDING_SCHEDULING, APPOINTMENT_STATUSES.CANCELLED],
    displayName: 'Therapist Assigned',
    description: 'Waiting for therapist to accept',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  [APPOINTMENT_STATUSES.PENDING_SCHEDULING]: {
    next: [APPOINTMENT_STATUSES.CONFIRMED, APPOINTMENT_STATUSES.CANCELLED],
    displayName: 'Scheduling',
    description: 'Coordinating appointment time',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  [APPOINTMENT_STATUSES.CONFIRMED]: {
    next: [APPOINTMENT_STATUSES.COMPLETED, APPOINTMENT_STATUSES.CANCELLED, APPOINTMENT_STATUSES.NO_SHOW],
    displayName: 'Confirmed',
    description: 'Appointment scheduled and confirmed',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  [APPOINTMENT_STATUSES.COMPLETED]: {
    next: [],
    displayName: 'Completed',
    description: 'Session completed successfully',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  [APPOINTMENT_STATUSES.CANCELLED]: {
    next: [],
    displayName: 'Cancelled',
    description: 'Appointment was cancelled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  [APPOINTMENT_STATUSES.NO_SHOW]: {
    next: [],
    displayName: 'No Show',
    description: 'Patient did not attend',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  [APPOINTMENT_STATUSES.RESCHEDULED]: {
    next: [APPOINTMENT_STATUSES.CONFIRMED],
    displayName: 'Rescheduled',
    description: 'Appointment time changed',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  }
};

// Legacy status mapping for backward compatibility
export const LEGACY_STATUS_MAPPING = {
  'not_paid': APPOINTMENT_STATUSES.UNPAID,
  'pending': APPOINTMENT_STATUSES.PENDING,
  'pending_approval': APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE,
  'approved': APPOINTMENT_STATUSES.CONFIRMED,
  'rejected': APPOINTMENT_STATUSES.CANCELLED,
  'in_progress': APPOINTMENT_STATUSES.CONFIRMED,
  'completed_pending_validation': APPOINTMENT_STATUSES.COMPLETED,
  'completed_validated': APPOINTMENT_STATUSES.COMPLETED
};

// Helper function to get display info for any status
export const getStatusDisplay = (status: string) => {
  // First try to map legacy statuses
  const mappedStatus = LEGACY_STATUS_MAPPING[status as keyof typeof LEGACY_STATUS_MAPPING] || status;
  
  // Return the display info
  return STATUS_FLOW[mappedStatus as AppointmentStatus] || {
    displayName: status,
    description: 'Unknown status',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  };
};

// Helper function to check if status is terminal (no further transitions)
export const isTerminalStatus = (status: string): boolean => {
  const mappedStatus = LEGACY_STATUS_MAPPING[status as keyof typeof LEGACY_STATUS_MAPPING] || status;
  return STATUS_FLOW[mappedStatus as AppointmentStatus]?.next.length === 0;
};

// Helper function to get next possible statuses
export const getNextPossibleStatuses = (status: string): AppointmentStatus[] => {
  const mappedStatus = LEGACY_STATUS_MAPPING[status as keyof typeof LEGACY_STATUS_MAPPING] || status;
  return STATUS_FLOW[mappedStatus as AppointmentStatus]?.next || [];
};

// Status configuration for UI display
export const STATUS_CONFIG = {
  [APPOINTMENT_STATUSES.UNPAID]: {
    label: 'Unpaid',
    className: 'bg-red-100 text-red-800 border-red-200',
    bgColor: 'bg-red-50',
    color: 'text-red-600',
    icon: '💳'
  },
  [APPOINTMENT_STATUSES.PENDING]: {
    label: 'Processing Payment',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    bgColor: 'bg-orange-50',
    color: 'text-orange-600',
    icon: '⏳'
  },
  [APPOINTMENT_STATUSES.PENDING_MATCH]: {
    label: 'Finding Therapist',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    bgColor: 'bg-yellow-50',
    color: 'text-yellow-600',
    icon: '🔍'
  },
  [APPOINTMENT_STATUSES.MATCHED_PENDING_THERAPIST_ACCEPTANCE]: {
    label: 'Therapist Assigned',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    bgColor: 'bg-blue-50',
    color: 'text-blue-600',
    icon: '👨‍⚕️'
  },
  [APPOINTMENT_STATUSES.PENDING_SCHEDULING]: {
    label: 'Scheduling',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    bgColor: 'bg-purple-50',
    color: 'text-purple-600',
    icon: '📅'
  },
  [APPOINTMENT_STATUSES.CONFIRMED]: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-800 border-green-200',
    bgColor: 'bg-green-50',
    color: 'text-green-600',
    icon: '✅'
  },
  [APPOINTMENT_STATUSES.COMPLETED]: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bgColor: 'bg-emerald-50',
    color: 'text-emerald-600',
    icon: '🎉'
  },
  [APPOINTMENT_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    bgColor: 'bg-gray-50',
    color: 'text-gray-600',
    icon: '❌'
  },
  [APPOINTMENT_STATUSES.NO_SHOW]: {
    label: 'No Show',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
    bgColor: 'bg-orange-50',
    color: 'text-orange-600',
    icon: '👻'
  },
  [APPOINTMENT_STATUSES.RESCHEDULED]: {
    label: 'Rescheduled',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    bgColor: 'bg-indigo-50',
    color: 'text-indigo-600',
    icon: '🔄'
  }
};

// Map appointment object to status string
export const mapAppointmentStatus = (appointment: any): string => {
  if (!appointment) return APPOINTMENT_STATUSES.UNPAID;
  
  // Handle different appointment structures
  const status = appointment.status || appointment.appointmentStatus;
  
  // Map legacy statuses to new ones
  const mappedStatus = LEGACY_STATUS_MAPPING[status as keyof typeof LEGACY_STATUS_MAPPING] || status;
  
  // Handle special cases based on appointment properties
  if (appointment.isStripeVerified === false && (status === 'confirmed' || status === 'rescheduled')) {
    return APPOINTMENT_STATUSES.UNPAID;
  }
  
  if (status === 'confirmed' && appointment.isRescheduled) {
    return APPOINTMENT_STATUSES.RESCHEDULED;
  }
  
  if (status === 'confirmed' && !appointment.isRescheduled) {
    return APPOINTMENT_STATUSES.CONFIRMED;
  }
  
  return mappedStatus;
};

// Get status configuration for UI display
export const getStatusConfig = (status: string) => {
  const mappedStatus = LEGACY_STATUS_MAPPING[status as keyof typeof LEGACY_STATUS_MAPPING] || status;
  return STATUS_CONFIG[mappedStatus as AppointmentStatus] || {
    label: status,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
    bgColor: 'bg-gray-50',
    color: 'text-gray-600',
    icon: '❓'
  };
};

// Feature flag for new transition system
export const USE_NEW_TRANSITION_SYSTEM = process.env.USE_NEW_TRANSITION_SYSTEM === 'true';
