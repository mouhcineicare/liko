import mongoose, { Document, Schema, Types } from 'mongoose';

// Define the IAppointment interface
export interface IAppointment extends Document {
  patient: Types.ObjectId;
  therapist: Types.ObjectId | null;
  date: Date;
  status:
    | "unpaid" // Initial status for appointments booked without payment
    | "pending" // Payment in progress (checkout initiated)
    | "pending_match" // Looking for available therapist
    | "matched_pending_therapist_acceptance" // Assigned to therapist, waiting for acceptance
    | "pending_scheduling" // Therapist accepted, coordinating appointment time
    | "confirmed" // Appointment scheduled and confirmed
    | "cancelled" // Cancelled by therapist or patient
    | "completed" // All sessions completed
    | "no-show" // Patient didn't show up
    | "rescheduled" // Appointment was rescheduled;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentIntentId?: string;
  price: number;
  plan: string;
  planType: string;
  therapyType: 'individual' | 'couples' | 'kids' | 'psychiatry';
  meetingLink?: string;
  calendarEventId?: string;
  calendarId?: string;
  therapistPaid: boolean;
  comment: string;
  declineComment: string;
  patientApproved: -1 | 0 | 1;
  isDateUpdated: boolean;
  oldTherapies?: string[];
  completedSessions: number;
  totalSessions: number;
  sessionCount: number; // Actual number of sessions (main + recurring)
  sessionUnitsTotal: number; // Total session units for balance calculations (price / unitPrice)
  payment: {
    method: 'balance' | 'stripe' | 'mixed';
    sessionsPaidWithBalance: number;
    sessionsPaidWithStripe: number;
    unitPrice: number;
    currency: string;
    stripeChargeId?: string;
    useBalance: boolean;
    refundedUnitsFromBalance: number;
    refundedUnitsFromStripe: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
  isConfirmed: boolean;
  hasPreferedDate: boolean;
  recurring: { index: number; date: string; status: 'confirmed' | 'completed' | string; payment: 'unpaid' | 'paid' | string }[] | string[];
  sessionsHistory: string[];
  checkoutSessionId?: string;
  patientTimezone: string;
  isPaid: boolean;
  reason?: string;
  payoutStatus: 'unpaid' | 'pending_payout' | 'paid';
  payoutAttempts: number;
  isPayoutRejected?: boolean;
  rejectedPayoutNote?: string;
  isAccepted: boolean | null;
  isBalance: boolean | null;
  discountPercentage?: number;
  discount?: number;
  isRescheduled?: boolean;
  lastReminderSent?: Date;
  firstReminderSent?: Date;
  secondReminderSent?: Date;
  finalReminderSent?: Date;
  therapistValidated?: boolean;
  therapistValidatedAt?: Date;
  // Bank-like audit trail fields
  validationReason?: string;
  paymentStatusReason?: string;
  statusTransitionHistory?: Array<{
    fromStatus: string;
    toStatus: string;
    reason: string;
    timestamp: Date;
    performedBy: string;
    performedByRole: 'therapist' | 'admin' | 'system';
  }>;
  lastStatusChangeReason?: string;
  lastStatusChangedBy?: string;
  lastStatusChangedAt?: Date;
  // Same-day booking fields
  isSameDayBooking?: boolean;
  sameDaySurcharge?: number;
  isStripeVerified?: boolean;
  payment?: 'paid' | 'unpaid' | 'pending';
  paidAt?: Date;
  paymentHistory?: Array<{
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    createdAt: Date;
  }>;
}

// Define the schema
const appointmentSchema: Schema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    date: {
      type: Date,
      required: true,
      index: true, // Add an index on the `date` field
    },
    status: {
      type: String,
      enum: [
        'unpaid',
        'pending',
        'pending_match',
        'matched_pending_therapist_acceptance',
        'pending_scheduling',
        'confirmed',
        'cancelled',
        'completed',
        'no-show',
        'rescheduled'
      ],
      default: 'unpaid',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentIntentId: String,
    payoutStatus: {
    type: String,
    enum: ['unpaid', 'pending_payout', 'paid'],
    default: 'unpaid'
   },
   payoutAttempts: {
    type: Number,
    default: 0
   },
  lastPayoutAttempt: Date,
    price: {
      type: Number,
      required: true,
    },
    plan: {
      type: String,
      required: true,
    },
    planType: {
      type: String,
      required: true,
      default: 'single_session',
    },
    therapyType: {
      type: String,
      enum: ['individual', 'couples', 'kids', 'psychiatry'],
      required: true,
    },
    meetingLink: String,
    calendarEventId: String,
    calendarId: String,
    therapistPaid: {
      type: Boolean,
      default: false,
    },
    comment: {
      type: String,
      default: '',
    },
    declineComment: {
      type: String,
      default: '',
    },
    patientApproved: {
      type: Number,
      enum: [-1, 0, 1],
      default: -1,
    },
    isDateUpdated: {
      type: Boolean,
      default: false,
    },
    isConfirmed: {
      type: Boolean,
      default: true,
    },
    oldTherapies: {
      type: [String],
      default: [],
    },
    hasPreferedDate: {
     type: Boolean,
     default: true,
    },
    completedSessions: {
      type: Number,
      default: 0,
    },
    totalSessions: {
      type: Number,
      default: 1,
    },
    sessionCount: {
      type: Number,
      default: 1,
    },
    sessionUnitsTotal: {
      type: Number,
      default: 0,
    },
    payment: {
      method: {
        type: String,
        enum: ['balance', 'stripe', 'mixed'],
        default: 'stripe'
      },
      sessionsPaidWithBalance: {
        type: Number,
        default: 0
      },
      sessionsPaidWithStripe: {
        type: Number,
        default: 0
      },
      unitPrice: {
        type: Number,
        default: 90
      },
      currency: {
        type: String,
        default: 'AED'
      },
      stripeChargeId: {
        type: String,
        default: null
      },
      useBalance: {
        type: Boolean,
        default: false
      },
      refundedUnitsFromBalance: {
        type: Number,
        default: 0
      },
      refundedUnitsFromStripe: {
        type: Number,
        default: 0
      }
    },
    recurring: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    sessionsHistory:{
      type: [String],
      default: [],
    },
    checkoutSessionId: {
      type: String,
      default: null
    },
    patientTimezone: {
      type: String,
      default: 'Asia/Dubai',
    },
    reason: {
      type: String,
      default: null
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    isPayoutRejected: {
      type: Boolean,
      default: false,
    },
    rejectedPayoutNote: {
      type: String,
      default: '',
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    justifyPayout: {
      type: Boolean,
      default: false
   },
   justifyNote: {
      type: String,
      default: ''
   },
   justifyDate: {
      type: Date,
      default: null
   },
   isBalance: {
      type: Boolean,
      default: false
   },
   discountPercentage:{
    type: Number,
    default: 0,
   },
     discount:{
    type: Number,
    default: 0,
  },
  isRescheduled: {
    type: Boolean,
    default: false,
  },
  lastReminderSent: {
    type: Date,
    default: null,
  },
  firstReminderSent: {
    type: Date,
    default: null,
  },
  secondReminderSent: {
    type: Date,
    default: null,
  },
  finalReminderSent: {
    type: Date,
    default: null,
  },
  therapistValidated: {
    type: Boolean,
    default: false,
  },
  therapistValidatedAt: {
    type: Date,
    default: null,
  },
  // Bank-like audit trail fields
  validationReason: {
    type: String,
    default: null,
  },
  paymentStatusReason: {
    type: String,
    default: null,
  },
  statusTransitionHistory: [{
    fromStatus: String,
    toStatus: String,
    reason: String,
    timestamp: { type: Date, default: Date.now },
    performedBy: String,
    performedByRole: { type: String, enum: ['therapist', 'admin', 'system'] }
  }],
  lastStatusChangeReason: {
    type: String,
    default: null,
  },
  lastStatusChangedBy: {
    type: String,
    default: null,
  },
  lastStatusChangedAt: {
    type: Date,
    default: null,
  },
  // Same-day booking fields
  isSameDayBooking: {
    type: Boolean,
    default: false,
  },
  sameDaySurcharge: {
    type: Number,
    default: 0,
  },
  isStripeVerified: {
    type: Boolean,
    default: false,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  paymentHistory: [{
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    createdAt: { type: Date, default: Date.now }
  }],
  },
  {
    timestamps: true,
  },
);

// Middleware to update totalSessions when recurring sessions change
appointmentSchema.pre<IAppointment>('save', function(next) {
  if (this.isModified('recurring')) {
    // Calculate total sessions (main session + recurring sessions)
    const recurringCount = Array.isArray(this.recurring) ? this.recurring.length : 0;
    this.totalSessions = 1 + recurringCount; // 1 for main session
    
    // Calculate completed sessions
    const completedRecurring = Array.isArray(this.recurring) 
      ? this.recurring.filter(s => 
          typeof s === 'object' && s.status === 'completed'
        ).length
      : 0;
      
    const mainSessionCompleted = this.status === 'completed' ? 1 : 0;
    this.completedSessions = completedRecurring + mainSessionCompleted;
  }
  next();
});

// Ensure totalSessions stays in sync when using findOneAndUpdate (admin/therapist edits)
appointmentSchema.pre('findOneAndUpdate', function(next) {
  // Always return the updated doc in post hook
  this.setOptions({ new: true, runValidators: true });

  const update: any = this.getUpdate() || {};
  const set = update.$set || update;

  // If recurring is being fully replaced in this update, set totalSessions accordingly
  if (Array.isArray(set?.recurring)) {
    const newRecurringCount = set.recurring.length;
    if (!update.$set) update.$set = {};
    update.$set.totalSessions = 1 + newRecurringCount;
  }

  next();
});

appointmentSchema.post('findOneAndUpdate', async function(doc: any) {
  try {
    if (!doc) return;
    const recurringArray = Array.isArray(doc.recurring) ? doc.recurring : [];
    const totalSessions = 1 + recurringArray.length;

    // Calculate completed sessions similarly to save hook
    const completedRecurring = Array.isArray(recurringArray)
      ? recurringArray.filter((s: any) => typeof s === 'object' && s.status === 'completed').length
      : 0;
    const mainSessionCompleted = doc.status === 'completed' ? 1 : 0;
    const completedSessions = completedRecurring + mainSessionCompleted;

    // Only update if values are out of sync
    if (doc.totalSessions !== totalSessions || doc.completedSessions !== completedSessions) {
      await doc.updateOne({ totalSessions, completedSessions });
    }
  } catch (err) {
    // Swallow errors to not break the original operation
    console.error('Error syncing total/completed sessions after update:', err);
  }
});

// Middleware to update completedSessions when recurring session status changes
appointmentSchema.pre<IAppointment>('save', function(next) {
  if (this.isModified('recurring')) {
    const oldRecurring = this.get('recurring');
    const newRecurring = this.recurring;
    
    if (Array.isArray(oldRecurring) && Array.isArray(newRecurring)) {
      // Check for status changes in recurring sessions
      for (let i = 0; i < newRecurring.length; i++) {
        const newSession = newRecurring[i];
        const oldSession = oldRecurring[i];
        
        if (typeof newSession === 'object' && typeof oldSession === 'object') {
          if (newSession.status !== oldSession.status) {
            if (newSession.status === 'completed') {
              this.completedSessions += 1;
            } else if (oldSession.status === 'completed') {
              this.completedSessions = Math.max(0, this.completedSessions - 1);
            }
          }
        }
      }
    }
  }
  next();
});

// Middleware to handle status changes
appointmentSchema.pre<IAppointment>('save', async function (next) {

  // if(this.therapist){
  //    this.isAccepted = true;
  //    this.isConfirmed = true;
  //    this.status = 'approved';
  // } else {
  //    this.isAccepted = false;
  //    this.isConfirmed = false;
  //    this.status = 'matched_pending_therapist_acceptance';
  // }

  // if (this.isModified('therapist')) {
  //   this.isAccepted = false; // Needs therapist approval
  // }

  
  // if (this.isModified('paymentStatus') && this.paymentStatus === 'completed') {
  //   if (this.therapist) {
  //     this.status = 'approved';
  //     this.hasPreferedDate = false;
  //     this.isConfirmed = true;
  //     // this.recurring = this.recurring.map(s=> (typeof s=== 'object') ? {...s, status: 'completed'} : s) as any[]
  //   } else {
  //     this.status = 'pending_approval';
  //     this.hasPreferedDate = true;
  //     this.isConfirmed = false;
  //   }
  // }

  next();
});

appointmentSchema.pre<IAppointment>('save', async function (next) {
  if (this.isModified('completedSessions')) {
    if (this.completedSessions === this.totalSessions) {
      this.status = 'completed';
    } else if (this.status === 'completed' && this.completedSessions < this.totalSessions) {
      this.status = 'confirmed';
    }
  }

  next();
});

// Delete the existing model if it exists to avoid OverwriteModelError
if (mongoose.models.Appointment) {
  delete mongoose.models.Appointment;
}

// Also clear from mongoose.modelSchemas
if (mongoose.modelSchemas && mongoose.modelSchemas.Appointment) {
  delete mongoose.modelSchemas.Appointment;
}

const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema);

export default Appointment;