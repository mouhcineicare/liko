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

export interface IEmailTemplate extends Document {
  name: string;
  type: EmailTemplateType;
  subject: string;
  content: string;
  buttonLink?: string;
  buttonText?: string;
  isActive: boolean;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>({
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
}, { timestamps: true });

export default mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);