import mongoose from "mongoose";

const therapistPaymentSchema = new mongoose.Schema({
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ["stripe", "manual", "usdt", "usdc", "USDT", "USDC"],
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending"
  },
  sessions: {
    type: [{
      id: String,
      price: Number
    }],
    required: true
  },
  appointments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true
  }],
  therapistLevel: {
    type: Number,
    default: 1
  },
  sessionPrice: {
    type: Number,
    required: true
  },
  cryptoAddress: String,
  transactionId: String,
  manualNote: String,
  stripeTransferId: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  paidAt: Date,
  isTest: {
    type: Boolean,
    default: false
  },
}, { timestamps: true });

// Update appointment paid status when payment is created
therapistPaymentSchema.post("save", async function(doc) {
  const Appointment = mongoose.model("Appointment");
  
  try {
    // Update each appointment's paid sessions count
    for (const appointmentId of doc.appointments) {
      const paidSessions = await mongoose.model("TherapistPayment").countDocuments({
        appointments: appointmentId
      });
      
      const appointment = await Appointment.findById(appointmentId);
      if (appointment && paidSessions >= appointment.totalSessions) {
        await Appointment.findByIdAndUpdate(appointmentId, {
          therapistPaid: true
        });
      }
    }
  } catch (error) {
    console.error("Error updating appointments:", error);
  }
});

export default mongoose.models.TherapistPayment || 
  mongoose.model("TherapistPayment", therapistPaymentSchema);