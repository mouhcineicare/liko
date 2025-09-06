import mongoose,{ Schema, model, Document } from "mongoose";

// Define the TherapyProfile interface
export interface ITherapyProfile extends Document {
  therapyId: string;
  aboutMe: string;
  therapeuticApproach: string;
  communicationApproach: string;
  professionalExperience: number;
  mentalHealthExpertise: string[];
  communicationModes: string[];
  spokenLanguages: string[];
  licenseInformation: string;
  availability: any; // JSON data
  createdAt: Date;
  updatedAt: Date;
  timeZone: string;
}

// Define the TherapyProfile schema
const TherapyProfileSchema = new Schema<ITherapyProfile>(
  {
    therapyId: { type: String, unique: true, required: true, ref: "User" },
    aboutMe: { type: String, required: true },
    therapeuticApproach: { type: String, required: true },
    communicationApproach: { type: String, required: true },
    professionalExperience: { type: Number, default: 0 },
    mentalHealthExpertise: { type: [String], default: [] },
    communicationModes: { type: [String], default: [] },
    spokenLanguages: { type: [String], default: [] },
    licenseInformation: { type: String, required: true },
    availability: { type: Schema.Types.Mixed, default: [] }, // JSON data
    timeZone: {
      type: String,
      default:'Asia/Dubai'
    },
  },
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt`
);

// Singleton pattern for Mongoose models
// let TherapyProfile: any;

// if (model<ITherapyProfile>("TherapyProfile")) {
//   TherapyProfile = model<ITherapyProfile>("TherapyProfile");
// } else {
//   TherapyProfile = model<ITherapyProfile>("TherapyProfile", TherapyProfileSchema);
// }

if (mongoose.models.TherapyProfile) {
  delete mongoose.models.TherapyProfile;
}

const TherapyProfile = model<ITherapyProfile>("TherapyProfile", TherapyProfileSchema);

export default TherapyProfile;