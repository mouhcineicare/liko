import mongoose from 'mongoose';


export interface BalanceHistoryItem {
  _id?: string;
  action: "added" | "removed" | "used";
  amount: number; // AED amount
  plan?: string;
  admin?: {
    _id: string;
    fullName: string;
  };
  reason?: string;
  createdAt: string;
  type?: string;
  description?: string;
  date?: Date;
  appointmentId?: string;
  surcharge?: number;
}

export interface Balance {
  balanceAmount: number; // Total AED balance
  history: BalanceHistoryItem[];
  payments: {
    paymentId: string;
    amount: number;
    currency: string;
    date: Date;
    amountAdded: number; // AED amount added
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
  balanceAmount: {
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
    amount: {
      type: Number,
      required: true
    },
    plan: {
      type: String,
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
    amountAdded: {
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
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
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