const mongoose = require('mongoose');
require('dotenv').config();

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  date: { type: Date, required: true },
  status: { type: String, enum: ['not_paid', 'pending', 'pending_approval', 'approved', 'rejected', 'cancelled', 'in_progress', 'completed', 'no-show', 'rescheduled', 'pending_scheduling', 'matched_pending_therapist_acceptance', 'pending_match'], default: 'not_paid' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentIntentId: String,
  price: { type: Number, required: true },
  plan: { type: String, required: true },
  planType: { type: String, required: true, default: 'single_session' },
  therapyType: { type: String, enum: ['individual', 'couples', 'kids', 'psychiatry'], required: true },
  meetingLink: String,
  calendarEventId: String,
  calendarId: String,
  therapistPaid: { type: Boolean, default: false },
  comment: { type: String, default: '' },
  declineComment: { type: String, default: '' },
  patientApproved: { type: Number, enum: [-1, 0, 1], default: -1 },
  isDateUpdated: { type: Boolean, default: false },
  isConfirmed: { type: Boolean, default: true },
  hasPreferedDate: { type: Boolean, default: false },
  recurring: [{ date: String, status: String, payment: String }],
  sessionsHistory: [String],
  checkoutSessionId: String,
  patientTimezone: String,
  isPaid: { type: Boolean, default: false },
  reason: String,
  payoutStatus: { type: String, enum: ['unpaid', 'pending_payout', 'paid'], default: 'unpaid' },
  payoutAttempts: { type: Number, default: 0 },
  lastPayoutAttempt: Date,
  isAccepted: { type: Boolean, default: null },
  isBalance: { type: Boolean, default: null },
  discountPercentage: Number,
  discount: Number,
  isRescheduled: { type: Boolean, default: false },
  lastReminderSent: Date,
  firstReminderSent: Date,
  secondReminderSent: Date,
  finalReminderSent: Date,
  isStripeVerified: { type: Boolean, default: false },
  paidAt: Date,
  paymentHistory: [{
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

async function fixAppointmentPayment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const appointmentId = '68bc7391927b41a154ff5fef';
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.log('Appointment not found');
      return;
    }

    console.log('Current appointment status:', {
      _id: appointment._id,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      isStripeVerified: appointment.isStripeVerified,
      checkoutSessionId: appointment.checkoutSessionId,
      paidAt: appointment.paidAt
    });

    // Update the appointment to mark it as paid
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        paymentStatus: 'completed',
        status: 'approved',
        isStripeVerified: true,
        paidAt: new Date(),
        paymentMethod: 'card',
        checkoutSessionId: 'cs_test_a1jzzNYYAgS2Ic1zlvINWZmgQDmD9ZY0z6TJyhRssGklavv4RqAFObGT2', // From your logs
        $push: {
          paymentHistory: {
            amount: 110, // Assuming 110 AED based on the logs
            currency: 'AED',
            status: 'completed',
            paymentMethod: 'card',
            stripeSessionId: 'cs_test_a1jzzNYYAgS2Ic1zlvINWZmgQDmD9ZY0z6TJyhRssGklavv4RqAFObGT2',
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );

    console.log('Updated appointment:', {
      _id: updatedAppointment._id,
      status: updatedAppointment.status,
      paymentStatus: updatedAppointment.paymentStatus,
      isStripeVerified: updatedAppointment.isStripeVerified,
      checkoutSessionId: updatedAppointment.checkoutSessionId,
      paidAt: updatedAppointment.paidAt
    });

    console.log('Appointment payment status fixed successfully!');

    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the fix
fixAppointmentPayment();
