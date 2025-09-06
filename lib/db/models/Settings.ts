import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['about', 'faq', 'refund'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// For FAQ type, content will be stored as JSON string of array of objects
// For about and refund, content will be HTML string

if (mongoose.models.Settings) {
  delete mongoose.models.Settings;
}

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;