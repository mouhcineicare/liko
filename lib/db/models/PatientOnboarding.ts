import mongoose from "mongoose";

const patientOnboardingSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  responses: [
    {
      questionId: {
        type: String,
        required: true,
      },
      question: {
        type: String,
        required: true,
      },
      answer: {
        type: mongoose.Schema.Types.Mixed, // Can be String, Boolean, or Array of strings
      },
      type: {
        type: String,
        enum: ["text", "radio", "checkbox", "boolean"],
        required: false,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
},{ timestamps: true });

if (mongoose.models.PatientOnboarding) {
  delete mongoose.models.PatientOnboarding;
}

const PatientOnboarding = mongoose.model(
  "PatientOnboarding",
  patientOnboardingSchema
);

export default PatientOnboarding;
