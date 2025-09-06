import mongoose from 'mongoose';

const therapyChangeRequestSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  currentTherapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  newTherapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

if (mongoose.models.TherapyChangeRequest) {
  delete mongoose.models.TherapyChangeRequest;
}

const TherapyChangeRequest = mongoose.model('TherapyChangeRequest', therapyChangeRequestSchema);

export default TherapyChangeRequest;