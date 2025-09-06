import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import connectDB from "@/lib/db/connect"
import TherapistApplication from "@/lib/db/models/TherapistApplication"

// Helper function to save a file
async function saveFile(file: File): Promise<string | null> {
  if (!file) return null

  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), "public/uploads")
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    const uniqueId = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    const filename = `${Date.now()}-${uniqueId}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
    const filepath = join(uploadDir, filename)

    // Save the file
    const buffer = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(buffer))

    // Return the public path
    return `/uploads/${filename}`
  } catch (error) {
    console.error("Error saving file:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Parse the FormData
    const formData = await request.formData()

    // Process file uploads
    const resumeFile = formData.get("documents.resume") as File
    const medicalLicenseFile = formData.get("documents.medicalLicense") as File
    const accreditationFile = formData.get("documents.accreditationCertificateFile") as File
    const photographFile = formData.get("documents.photograph") as File

    const resumePath = await saveFile(resumeFile)
    const medicalLicensePath = await saveFile(medicalLicenseFile)
    const accreditationPath = await saveFile(accreditationFile)
    const photographPath = await saveFile(photographFile)

    // Extract form fields
    const getField = (name: string) => formData.get(name)?.toString() || ""

    // Check if reference fields have values
    const ref1Name = getField("references.reference1.name")
    const ref1Phone = getField("references.reference1.phone")
    const ref1Email = getField("references.reference1.email")
    const ref2Name = getField("references.reference2.name")
    const ref2Phone = getField("references.reference2.phone")
    const ref2Email = getField("references.reference2.email")

    // Only include references if they have values
    const references: any = {}

    if (ref1Name || ref1Phone || ref1Email) {
      references.reference1 = {
        name: ref1Name,
        phone: ref1Phone,
        email: ref1Email,
      }
    }

    if (ref2Name || ref2Phone || ref2Email) {
      references.reference2 = {
        name: ref2Name,
        phone: ref2Phone,
        email: ref2Email,
      }
    }

    // Prepare application data
    const applicationData = {
      personalInfo: {
        fullName: getField("personalInfo.fullName"),
        gender: getField("personalInfo.gender"),
        phoneNumber: getField("personalInfo.phoneNumber"),
        dateOfBirth: getField("personalInfo.dateOfBirth") ? new Date(getField("personalInfo.dateOfBirth")) : null,
        email: getField("personalInfo.email"),
        residentialAddress: getField("personalInfo.residentialAddress"),
      },
      education: {
        undergraduateDegree: getField("education.undergraduateDegree"),
        graduationYear: Number.parseInt(getField("education.graduationYear") || "0"),
        psychologySchool: getField("education.psychologySchool"),
        residency: getField("education.residency"),
        fellowships: getField("education.fellowships"),
      },
      licensure: {
        licenseNumber: getField("licensure.licenseNumber"),
        accreditationCertificate: getField("licensure.accreditationCertificate"),
        stateOfLicensure: getField("licensure.stateOfLicensure"),
        additionalCertifications: getField("licensure.additionalCertifications"),
      },
      experience: {
        recentEmployer: getField("experience.recentEmployer"),
        from: getField("experience.from") ? new Date(getField("experience.from")) : null,
        to: getField("experience.to") ? new Date(getField("experience.to")) : null,
        position: getField("experience.position"),
        duties: getField("experience.duties"),
      },
      // Only include references if they exist
      ...(Object.keys(references).length > 0 && { references }),
      skills: {
        specialSkills: getField("skills.specialSkills"),
        personalStatement: getField("skills.personalStatement"),
      },
      documents: {
        resume: resumePath,
        medicalLicense: medicalLicensePath,
        accreditationCertificateFile: accreditationPath,
        photograph: photographPath,
      },
      status: "pending",
      createdAt: new Date(),
    }

    // Validate required fields
    const requiredFields = [
      applicationData.personalInfo.fullName,
      applicationData.personalInfo.email,
      applicationData.personalInfo.phoneNumber,
      applicationData.personalInfo.gender,
      applicationData.personalInfo.residentialAddress,
      applicationData.education.undergraduateDegree,
      applicationData.education.psychologySchool,
      applicationData.education.residency,
      applicationData.licensure.licenseNumber,
      applicationData.licensure.accreditationCertificate,
      applicationData.licensure.stateOfLicensure,
      applicationData.experience.recentEmployer,
      applicationData.experience.position,
      applicationData.experience.duties,
      applicationData.skills.specialSkills,
      applicationData.skills.personalStatement,
      resumePath,
      medicalLicensePath,
      accreditationPath,
      photographPath,
    ]

    if (requiredFields.some((field) => !field)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Save to database
    const application = new TherapistApplication(applicationData)
    await application.save()

    return NextResponse.json({ success: true, data: { id: application._id } }, { status: 201 })
  } catch (error) {
    console.error("Error processing application:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

