import mongoose from 'mongoose';

const PaymentLogSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'AED'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'binance', 'manual'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  transactionId: String,
  errorMessage: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.models.PaymentLog || 
  mongoose.model('PaymentLog', PaymentLogSchema);