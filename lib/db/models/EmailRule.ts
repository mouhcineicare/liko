import mongoose, { Document, Schema } from 'mongoose';

export interface ICondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
}

export interface IAction {
  type: 'send_email' | 'send_notification' | 'update_status' | 'wait';
  templateId?: string;
  notificationType?: string;
  status?: string;
  waitTime?: number; // in minutes
  waitUnit?: 'minutes' | 'hours' | 'days';
}

export interface IEmailRule extends Document {
  name: string;
  description?: string;
  conditions: ICondition[];
  actions: IAction[];
  templateId?: string;
  isActive: boolean;
  priority: number;
  triggerEvent: 'appointment_created' | 'appointment_updated' | 'payment_status_changed' | 'time_based';
  createdAt: Date;
  updatedAt: Date;
}

const conditionSchema = new Schema({
  field: { type: String, required: true },
  operator: { 
    type: String, 
    required: true, 
    enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'exists'] 
  },
  value: { type: Schema.Types.Mixed }
}, { _id: false });

const actionSchema = new Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['send_email', 'send_notification', 'update_status', 'wait'] 
  },
  templateId: { type: String },
  notificationType: { type: String },
  status: { type: String },
  waitTime: { type: Number },
  waitUnit: { type: String, enum: ['minutes', 'hours', 'days'] }
}, { _id: false });

const EmailRuleSchema = new Schema<IEmailRule>({
  name: { type: String, required: true },
  description: { type: String },
  conditions: [conditionSchema],
  actions: [actionSchema],
  templateId: { type: String },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  triggerEvent: { 
    type: String, 
    required: true, 
    enum: ['appointment_created', 'appointment_updated', 'payment_status_changed', 'time_based'] 
  }
}, { timestamps: true });

export default mongoose.models.EmailRule || mongoose.model<IEmailRule>('EmailRule', EmailRuleSchema);
