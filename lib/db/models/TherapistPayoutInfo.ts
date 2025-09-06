import { calculateNextPayoutDate } from '@/lib/payout';
import mongoose from 'mongoose';

const therapistPayoutInfoSchema = new mongoose.Schema({
  therapist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    routingNumber: String,
    swiftCode: String,
    bankName: String
  },
  cryptoWallet: {
    address: String,
    currency: {
      type: String,
      enum: ['USDT', 'USDC'],
      default: 'USDT'
    },
    network: {
      type: String,
      default: "BSC", // binance smart chain
      enum:['BSC',"BEP20","ERC20"]
    }
  },
  paymentLink: String,
  lastUpdated: Date,
  payoutSettings: {
    schedule: {
      type: String,
      enum: ['manual', 'weekly', 'biweekly', 'monthly'],
      default: 'manual'
    },
    minimumAmount: {
      type: Number,
      default: 0
    },
    nextPayoutDate: Date,
    payoutFrequency: {type: String, default : 'weekly'},
    expectedPayoutDate: {
      type: Date,
      default: function() {
        // Default to next Friday at 12 PM
        const date = new Date();
        date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7)); // Next Friday
        date.setHours(12, 0, 0, 0); // Set to 12 PM
        return date;
      }
    },
  }
});

therapistPayoutInfoSchema.pre('save', function(next) {
  if (this.isModified('payoutSettings.schedule') || !this.payoutSettings?.expectedPayoutDate) {
    this.payoutSettings = this.payoutSettings || {};
    this.payoutSettings.expectedPayoutDate = calculateNextPayoutDate(this.payoutSettings.schedule || 'weekly');
  }
  
  // Update lastUpdated whenever bank details change
  if (this.isModified('bankDetails') || this.isModified('cryptoWallet')) {
    this.lastUpdated = new Date();
  }
  
  next();
});

export default mongoose.models.TherapistPayoutInfo ||
  mongoose.model('TherapistPayoutInfo', therapistPayoutInfoSchema);