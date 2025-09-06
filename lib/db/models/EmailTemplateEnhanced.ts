import mongoose, { Document, Schema } from 'mongoose';

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

export interface IEmailTemplateEnhanced extends Document {
  name: string;
  type: EmailTemplateType;
  subject: string;
  content: string;
  buttonLink?: string;
  buttonText?: string;
  isActive: boolean;
  variables: string[];
  recipients: {
    patient: boolean;
    therapist: boolean;
    admin: boolean;
    custom?: string[]; // Custom email addresses
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateEnhancedSchema = new Schema<IEmailTemplateEnhanced>({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: [
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
  ]},
  subject: { type: String, required: true },
  content: { type: String, required: true },
  buttonLink: { type: String },
  buttonText: { type: String },
  isActive: { type: Boolean, default: false },
  variables: { type: [String], default: [] },
  recipients: {
    patient: { type: Boolean, default: true },
    therapist: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
    custom: { type: [String], default: [] }
  }
}, { timestamps: true });

export default mongoose.models.EmailTemplateEnhanced || mongoose.model<IEmailTemplateEnhanced>('EmailTemplateEnhanced', EmailTemplateEnhancedSchema);
