import mongoose, { Schema, type Document } from "mongoose"

interface ITherapistApplication extends Document {
  personalInfo: {
    fullName: string
    gender: string
    phoneNumber: string
    dateOfBirth: Date | null
    email: string
    residentialAddress: string
  }
  education: {
    undergraduateDegree: string
    graduationYear: number
    psychologySchool: string
    residency: string
    fellowships?: string
  }
  licensure: {
    licenseNumber: string
    accreditationCertificate: string
    stateOfLicensure: string
    additionalCertifications?: string
  }
  experience: {
    recentEmployer: string
    from: Date | null
    to: Date | null
    position: string
    duties: string
  }
  references?: {
    reference1?: {
      name?: string
      phone?: string
      email?: string
    }
    reference2?: {
      name?: string
      phone?: string
      email?: string
    }
  }
  skills: {
    specialSkills: string
    personalStatement: string
  }
  documents: {
    resume: string | null
    medicalLicense: string | null
    accreditationCertificateFile: string | null
    photograph: string | null
  }
  status: "pending" | "reviewing" | "approved" | "rejected"
  createdAt: Date
  updatedAt?: Date
}

const TherapistApplicationSchema = new Schema<ITherapistApplication>({
  personalInfo: {
    fullName: { type: String, required: true },
    gender: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    dateOfBirth: { type: Date },
    email: { type: String, required: true },
    residentialAddress: { type: String, required: true },
  },
  education: {
    undergraduateDegree: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    psychologySchool: { type: String, required: true },
    residency: { type: String, required: true },
    fellowships: { type: String },
  },
  licensure: {
    licenseNumber: { type: String, required: true },
    accreditationCertificate: { type: String, required: true },
    stateOfLicensure: { type: String, required: true },
    additionalCertifications: { type: String },
  },
  experience: {
    recentEmployer: { type: String, required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    position: { type: String, required: true },
    duties: { type: String, required: true },
  },
  references: {
    type: {
      reference1: {
        name: { type: String, required: false },
        phone: { type: String, required: false },
        email: { type: String, required: false },
      },
      reference2: {
        name: { type: String, required: false },
        phone: { type: String, required: false },
        email: { type: String, required: false },
      },
    },
    required: false,
  },
  skills: {
    specialSkills: { type: String, required: true },
    personalStatement: { type: String, required: true },
  },
  documents: {
    resume: { type: String, required: true },
    medicalLicense: { type: String, required: true },
    accreditationCertificateFile: { type: String, required: true },
    photograph: { type: String, required: true },
  },
  status: {
    type: String,
    enum: ["pending", "reviewing", "approved", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
},{ timestamps: true })

// Update the updatedAt field on save
TherapistApplicationSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

const TherapistApplication =
  mongoose.models.TherapistApplication ||
  mongoose.model<ITherapistApplication>("TherapistApplication", TherapistApplicationSchema)

export default TherapistApplication

