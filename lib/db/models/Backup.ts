import mongoose from 'mongoose';

// Define schema
const backupSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  isStarted: {
    type: Boolean,
    default: false,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  isScheduled: {
    type: Boolean,
    default: false,
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed', 'completed-with-errors'],
    default: 'pending',
  },
  error: {
    type: String,
  },
  logs: {
    type: [String],
    default: [],
  },
  itemsProcessed: {
    type: Number,
    default: 0,
  },
  itemsSkipped: {
    type: Number,
    default: 0,
  },
  verification: {
    type: mongoose.Schema.Types.Mixed
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString()
      delete ret._id
      delete ret.__v
      return ret
    }
  },
  toObject: {
    virtuals: true
  }
});

// Add virtual for duration
backupSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    return this.endDate.getTime() - this.startDate.getTime();
  }
  return null;
});

// Prevent model overwrite
if (mongoose.models.Backup) {
  delete mongoose.models.Backup;
}

// Create and export model
const Backup = mongoose.model('Backup', backupSchema);
export default Backup;