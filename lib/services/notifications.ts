import { Notification } from "@/lib/db/models";

type NotificationTemplate = {
  content: string | ((data: any) => string);
  roles: string[];
  category?: string;
};

export enum NotificationType {
    NEW_PATIENT_ASSIGNED = "NEW_PATIENT_ASSIGNED",
    NEW_THERAPIST_ASSIGNED = "NEW_THERAPIST_ASSIGNED",
    MATCHED = "MATCHED",
    APPOINTMENT_CREATED = "APPOINTMENT_CREATED",
    PAYMENT_REMAINING = "PAYMENT_REMAINING",
    NEW_PATIENT_SIGNED_IN = "NEW_PATIENT_SIGNED_IN",
    APPOINTMENT_STATUS_CHANGED_THEAPIST = "APPOINTMENT_STATUS_CHANGED_THEAPIST",
    APPOINTMENT_STATUS_CHANGED_PATIENT = "APPOINTMENT_STATUS_CHANGED_PATIENT",
    THERAPY_REQUEST_CHANGE_CREATED = "THERAPY_REQUEST_CHANGE_CREATED",
    APPOINTMENT_REQUEST_APPROVED= "APPOINTMENT_REQUEST_APPROVED",
    APPOINTMENT_REQUEST_REJECTED= "APPOINTMENT_REQUEST_REJECTED",
    APPOINTMENT_RESCHEDULED = "APPOINTMENT_RESCHEDULED"
}

const notificationTemplates: Record<string, NotificationTemplate> = {
  NEW_PATIENT_ASSIGNED: {
    content: "A new patient has been assigned to you",
    roles: ["therapist"]
  },
  NEW_THERAPIST_ASSIGNED: {
    content: "A new therapist has been assigned to you",
    roles: ["patient"]
  },
  MATCHED: {
    content: "You have been matched with a therapist",
    roles: ["patient"]
  },
  APPOINTMENT_CREATED: {
    content: "A new appointment has been created",
    roles: ["patient", "therapist","admin"]
  },
  PAYMENT_REMAINING: {
    content: "You have a payment remaining",
    roles: ["patient"]
  },
  NEW_PATIENT_SIGNED_IN: {
    content: "A new patient has signed up",
    roles: ["admin"]
  },
  APPOINTMENT_STATUS_CHANGED_THEAPIST: {
    content: (data: { planName: string; patientName: string; status: string }) => 
      `Your appointment (${data.planName}) with Patient ${data.patientName} has been changed to ${data.status}`,
    roles: ["patient"]
  },
  APPOINTMENT_STATUS_CHANGED_PATIENT: {
    content: (data: { planName: string; therapistName: string; status: string }) => 
      `Your appointment (${data.planName}) with therapist ${data.therapistName} has been changed to ${data.status}`,
    roles: ["patient"]
  },
  THERAPY_REQUEST_CHANGE_CREATED: {
    content: (data: { patientName: string; therapistName: string; role: string }) => {
        let PatientName = data.patientName;
        // Assuming session is passed as part of the data object
        if(data.role === "patient") {
            PatientName = 'You';
        }
        return `A new therapy change request has been created by ${PatientName} with therapist ${data.therapistName}`;
    },
    roles: ["admin","patient"]
  },
  APPOINTMENT_REQUEST_APPROVED: {
    content: (data: { planName: string; therapistName: string }) => 
      `Your appointment (${data.planName}) with therapist ${data.therapistName} has been Approved`,
    roles: ["patient"]
  },
  APPOINTMENT_REQUEST_REJECTED: {
    content: (data: { therapistName: string }) => 
      `You have a reschedule request from therapist DR.${data.therapistName}`,
    roles: ["patient"]
  },
  APPOINTMENT_RESCHEDULED: {
    content: (data: { therapistName: string }) => 
      `Your therapist DR.${data.therapistName}`,
    roles: ["patient"]
  },
};

export async function triggerNotification(
    type: keyof typeof notificationTemplates,
    userId: string | string[],
    data?: any
  ) {
    const template = notificationTemplates[type];
    
    if (!template) {
      throw new Error("Notification template not found");
    }
  
    // Generate the content (handling both string and function templates)
    let content = typeof template.content === 'function' 
      ? template.content(data) 
      : template.content;
  
    // Prepare the base notification object
    const baseNotification = {
      content,
      type,
      isRead: false,
      createdAt: new Date()
    };
  
    // Handle single user or array of users
    if (Array.isArray(userId)) {
      // Filter out any non-string values and duplicates
      const validUserIds = Array.from(new Set(
        userId.filter(id => typeof id === 'string' && id.length > 0)
      ));
  
      if (validUserIds.length === 0) {
        console.warn('No valid user IDs provided for notification');
        return;
      }
  
      // Create notifications for all users
      await Notification.insertMany(
        validUserIds.map(user => ({
          ...baseNotification,
          userId: user
        }))
      );
    } else {
      // Single user case
      if (typeof userId !== 'string' || userId.length === 0) {
        console.warn('Invalid user ID provided for notification');
        return;
      }
  
      await Notification.create({
        ...baseNotification,
        userId
      });
    }
  }