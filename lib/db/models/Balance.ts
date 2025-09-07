import mongoose from 'mongoose';


export interface SessionHistoryItem {
  _id?: string;
  action: "added" | "removed" | "used";
  sessions: number;
  plan?: string; // Changed to string to match schema and existing data
  admin?: {
    _id: string;
    fullName: string;
  };
  reason?: string;
  createdAt: string;
  price?: number;
  type?: string;
  description?: string;
  date?: Date;
  appointmentId?: string;
  surcharge?: number;
}

export interface Balance {
  totalSessions: number;
  spentSessions: number;
  remainingSessions: number;
  history: SessionHistoryItem[];
  payments: {
    paymentId: string;
    amount: number;
    currency: string;
    date: Date;
    sessionsAdded: number;
    paymentType: string;
  }[];
}

export interface Patient {
  _id: string;
  fullName: string;
  email: string;
  telephone: string;
  createdAt: string;
  status: string;
  image?: string;
  therapy?: any;
  balance: Balance;
}

export interface Plan {
  _id: string;
  title: string;
  type: string;
  price: number;
}

const balanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalSessions: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  spentSessions: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
 history: [{
    action: {
      type: String,
      enum: ['added', 'removed', 'used'],
      required: true
    },
    sessions: {
      type: Number,
      required: true
    },
    plan: {
      type: String, // Changed from ObjectId to String to match existing data
      ref: 'Plan'
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    price: {
      type: Number,
      default: 0
    },
    type: String,
    description: String,
    date: {
      type: Date,
      default: Date.now
    },
    appointmentId: String,
    surcharge: {
      type: Number,
      default: 0
    }
  }],
  payments: [{
    paymentId: {
      type: String,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    sessionsAdded: {
      type: Number,
      required: true
    },
    receiptUrl: {
      type: String
    },
    paymentType: {
      type: String,
      enum: ['payment_intent', 'charge', 'checkout_session', 'subscription', 'renew_now', 'unknown'],
      required: true,
      default: 'unknown'
    },
    _id: false
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Add virtual for remaining sessions
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Virtual property for remaining sessions
balanceSchema.virtual('remainingSessions').get(function() {
  return this.totalSessions - this.spentSessions > 0 ? this.totalSessions - this.spentSessions : 0;
});

// Update timestamp before saving
balanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Clear any existing model to force recompilation with new schema
if (mongoose.models.Balance) {
  delete mongoose.models.Balance;
}

const Balance = mongoose.model('Balance', balanceSchema);

export default Balance;