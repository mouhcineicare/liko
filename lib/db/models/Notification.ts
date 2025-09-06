import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: string;
  content: string;
  type?: string;
  isRead?: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  type: { 
    type: String, 
    required: false,
    default: 'general'
  },
  isRead: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  createdAt: { type: Date, default: Date.now }
},{ timestamps: true });

const Notification = mongoose.models.Notification || 
  mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;