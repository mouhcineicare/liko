import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['patient', 'therapist', 'admin'],
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: function(this: any) {
      return this.role !== 'admin';
    },
  },
  telephone: {
    type: String,
    required: function(this: any) {
      return this.role !== 'admin';
    },
  },
  image: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'banned','in_review'],
    default: 'pending',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  summary: {
    type: String,
    required: function(this: any) {
      return this.role === 'therapist';
    },
    default: function(this: any) {
      return this.role === 'therapist' ? 'Licensed therapist providing professional mental health services.' : undefined;
    }
  },
  specialties: {
    type: [String],
    default: function(this: any) {
      return this.role === 'therapist' ? ['General Counseling'] : undefined;
    }
  },
  googleRefreshToken: {
    type: String,
    default: null,
  },
  isCalendarConnected: {
    type: Boolean,
    default: false,
  },
  calendarLastSynced: {
    type: Date,
    default: null,
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 2
  },
  completedSessions: {
    type: Number,
    default: 0
  },
  weeklyPatientsLimit: {
    type: Number,
    default: 3, // Default to 3 sessions per week
    min: 1,
    max: 1000000
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  profile: {
    type: String,
    default: null
  },
  therapy: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  resetToken: {
    type: String,
    default: null,
  },
  resetTokenExpiry: {
    type: Date,
    default: null,
  },
  emailVerificationCode: {
    type: String,
    default: null,
  },
  emailVerificationCodeExpires: {
    type: Date,
    default: null,
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0,
  },
  timeZone: {
    type: String,
    default: 'Asia/Dubai',
  },
  initialPlan: {
    type: {
      plan: String,
      therapyType: String,
    },
    default: null
  },
  stripeAccountId: {
    type: String,
    default: null
  },
  stripeAccountStatus: {
    type: String,
    enum: ['not_connected', 'pending', 'active'],
    default: 'not_connected'
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  subscriptions: [{
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true
    },
    stripeSubscriptionId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'past_due', 'unpaid', 'canceled', 'incomplete'],
      default: 'active'
    },
    currentPeriodEnd: {
      type: Date,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    stripeCustomerId: {
      type: String,
      default: null
    },
  }],
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update calendar connection status when refresh token changes
userSchema.pre('save', function(next) {
  if (this.isModified('googleRefreshToken')) {
    this.isCalendarConnected = !!this.googleRefreshToken;
    if (this.isCalendarConnected) {
      this.calendarLastSynced = new Date();
    }
  }
  next();
});

// Update level based on completed sessions
userSchema.pre('save', function(next) {
  if (this.isModified('completedSessions')) {
    this.level = this.completedSessions >= 12 ? 2 : 1;
  }
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual('payoutInfo', {
  ref: 'TherapistPayoutInfo',
  localField: '_id',
  foreignField: 'therapist',
  justOne: true
});


const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;