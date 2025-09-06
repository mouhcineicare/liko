import mongoose from 'mongoose';

const PromptSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { 
      type: String, 
      required: true,
      enum: ['general', 'patient', 'therapy'],
      default: 'general'
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.models.Prompt || mongoose.model('Prompt', PromptSchema);