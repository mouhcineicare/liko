import mongoose, { Document, Schema } from 'mongoose';

export type EmailStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
export type EmailTemplateType = 
  | 'PaymentConfirmation'
  | 'TherapistAssignment'
  | 'NewRegistration'
  | 'AppointmentApproval'
  | 'AppointmentStatus'
  | 'AccountConfirmation'
  | 'NewAppointment'
  | 'PaymentNotification'
  | 'PaymentDetailsUpdate'
  | 'TherapyChangeRequest'
  | 'PasswordReset'
  | 'PasswordResetSuccess'
  | 'PatientAssignment'
  | 'PaymentReminder';

export interface IEmailLog extends Document {
  templateType: EmailTemplateType;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  sentAt: Date;
  status: EmailStatus;
  errorMessage?: string;
  appointmentId?: mongoose.Types.ObjectId;
  reminderType?: 'first_reminder' | 'second_reminder' | 'final_reminder';
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    clickCount?: number;
    openCount?: number;
    lastOpenedAt?: Date;
    lastClickedAt?: Date;
    deliveryAttempts?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>({
  templateType: { 
    type: String, 
    required: true, 
    enum: [
      'PaymentConfirmation',
      'TherapistAssignment',
      'NewRegistration',
      'AppointmentApproval',
      'AppointmentStatus',
      'AccountConfirmation',
      'NewAppointment',
      'PaymentNotification',
      'PaymentDetailsUpdate',
      'TherapyChangeRequest',
      'PasswordReset',
      'PasswordResetSuccess',
      'PatientAssignment',
      'PaymentReminder'
    ]
  },
  recipientEmail: { type: String, required: true },
  recipientName: { type: String, required: true },
  subject: { type: String, required: true },
  sentAt: { type: Date, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['sent', 'delivered', 'opened', 'clicked', 'failed'],
    default: 'sent'
  },
  errorMessage: { type: String },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  reminderType: { 
    type: String, 
    enum: ['first_reminder', 'second_reminder', 'final_reminder']
  },
  metadata: {
    userAgent: { type: String },
    ipAddress: { type: String },
    clickCount: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
    lastOpenedAt: { type: Date },
    lastClickedAt: { type: Date },
    deliveryAttempts: { type: Number, default: 1 }
  }
}, { timestamps: true });

// Indexes for better performance
EmailLogSchema.index({ recipientEmail: 1, sentAt: -1 });
EmailLogSchema.index({ templateType: 1, status: 1 });
EmailLogSchema.index({ appointmentId: 1 });
EmailLogSchema.index({ sentAt: -1 });

export default mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);
