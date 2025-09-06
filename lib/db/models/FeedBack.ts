import mongoose, { Schema, Document } from 'mongoose';

interface IFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  rating: number;
  comment: string;
  createdAt?: Date;
}

const feedbackSchema = new Schema<IFeedback>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', feedbackSchema);
