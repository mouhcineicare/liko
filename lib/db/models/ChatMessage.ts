import mongoose, { Document, Schema, Types } from 'mongoose';

interface IChatMessage extends Document {
  conversationId: string;
  participants: Types.ObjectId[];
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  content: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true // Add index for better query performance
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add compound indexes for better query performance
chatMessageSchema.index({ conversationId: 1, read: 1 });
chatMessageSchema.index({ receiver: 1, read: 1 });

const ChatMessage = mongoose.models.ChatMessage || 
  mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);

export default ChatMessage;