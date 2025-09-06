import mongoose from "mongoose";


const PlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  order: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: [
      'single_session',
      'x2_sessions',
      'x3_sessions',
      'x4_sessions',
      'x5_sessions',
      'x6_sessions',
      'x7_sessions',
      'x8_sessions',
      'x9_sessions',
      'x10_sessions',
      'x11_sessions',
      'x12_sessions',
      'x13_sessions',
      'x14_sessions',
      'x15_sessions',
      'x16_sessions',
      'x17_sessions',
      'x18_sessions',
      'x19_sessions',
      'x20_sessions',
    ],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  features: [{
    type: String,
  }],
  active: {
    type: Boolean,
    default: true,
  },
  isSameDay: {
    type: Boolean,
    default: false,
  },
  isFiveMin: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  subscribtion: {
    type: String,
    enum: ['monthly', 'single'],
    required: true,
  },
  therapyType: {
    type: String,
    enum: ['individual', 'couples', 'kids', 'psychiatry'],
    required: true,
  }
}, { timestamps: true });

// Update timestamps on save
interface IPlan extends mongoose.Document {
  title: string;
  price: number;
  order: number;
  type: string;
  description: string;
  features: string[];
  active: boolean;
  isSameDay: boolean;
  createdAt: Date;
  updatedAt: Date;
  subscribtion: string;
  therapyType: string;
}

PlanSchema.pre('save', function(this: IPlan, next: (err?: Error) => void): void {
  this.updatedAt = new Date();
  next();
});

const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

export default Plan;
