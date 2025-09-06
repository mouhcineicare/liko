import mongoose from 'mongoose';

const impersonationLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['patient', 'therapist'],
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  failureReason: String
}, { timestamps: true });

const ImpersonationLog = mongoose.models.ImpersonationLog || 
  mongoose.model('ImpersonationLog', impersonationLogSchema);

export default ImpersonationLog;