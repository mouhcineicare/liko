export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    status: string;
    paymentStatus: string;
    meetingLink?: string;
    patient: {
      _id: string;
      fullName: string;
      email?: string;
      telephone?: string;
      image?: string;
    };
    price: number;
    therapyType: string;
    plan: string;
    planType: string;
    therapistPaid: boolean;
    recurring?: Array<{
      date: string;
      status: string;
      payment: string;
      index?: number;
      price?: number;
    }>;
    sessionsHistory?: string[];
    patientTimezone: string;
  };
}

// Additional types for the calendar props
export interface CalendarEventProps extends EventProps<Event> {
  event: Event;
}

// Type for the API response
export interface AppointmentApiResponse {
  appointments: Array<{
    _id: string;
    patient: {
      _id: string;
      fullName: string;
      email?: string;
      telephone?: string;
      image?: string;
    };
    therapist: {
      _id: string;
      fullName: string;
      image?: string;
    };
    date: string;
    status: string;
    paymentStatus: string;
    price: number;
    plan: string;
    planType: string;
    therapyType: string;
    meetingLink?: string;
    therapistPaid: boolean;
    recurring?: Array<{
      date: string;
      status: string;
      payment: string;
      index?: number;
      price?: number;
    }>;
    sessionsHistory?: string[];
    patientTimezone: string;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}


declare module 'antd' {
  interface ModalProps {
    title?: React.ReactNode;
  }
}
