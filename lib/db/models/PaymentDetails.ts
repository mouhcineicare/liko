import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'manual', 'usdt', 'btc'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  therapistLevel: {
    type: Number,
    default: 1
  },
  sessionPrice: {
    type: Number,
    required: true
  },
  appointments: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true
    },
    sessions: [{
      _id: String,
      date: Date,
      price: Number,
      isPaid: {
        type: Boolean,
        default: false
      }
    }]
  }],
  transactionId: String,
  cryptoAddress: String,
  manualNote: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Update appointment payment status when payment is created
paymentSchema.post('save', async function(doc) {
  const Appointment = mongoose.model('Appointment');
  
  try {
    // Update each appointment's therapistPaid status
    await Promise.all(doc.appointments.map(async (apt: any) => {
      await Appointment.findByIdAndUpdate(apt._id, {
        $set: { 
          therapistPaid: true,
          paymentStatus: 'completed' 
        }
      });
    }));
  } catch (error) {
    console.error('Error updating appointments:', error);
  }
});

if (mongoose.models.Payment) {
  delete mongoose.models.Payment;
}

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;