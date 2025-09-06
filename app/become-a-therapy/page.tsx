"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { ArrowRight, Upload, Check, X, FileText } from "lucide-react"
import ReCAPTCHA from "react-google-recaptcha";


export default function BecomeTherapistPage() {
  const [formData, setFormData] = useState({
    personalInfo: {
      fullName: "",
      gender: "",
      phoneNumber: "",
      dateOfBirth: "",
      email: "",
      residentialAddress: "",
    },
    education: {
      undergraduateDegree: "",
      graduationYear: "",
      psychologySchool: "",
      residency: "",
      fellowships: "",
    },
    licensure: {
      licenseNumber: "",
      accreditationCertificate: "",
      stateOfLicensure: "",
      additionalCertifications: "",
    },
    experience: {
      recentEmployer: "",
      from: "",
      to: "",
      position: "",
      duties: "",
    },
    references: {
      reference1: {
        name: "",
        phone: "",
        email: "",
      },
      reference2: {
        name: "",
        phone: "",
        email: "",
      },
    },
    skills: {
      specialSkills: "",
      personalStatement: "",
    },
    documents: {
      resume: null,
      medicalLicense: null,
      accreditationCertificateFile: null,
      photograph: null,
    },
  })

  // Track file names for display
  const [fileNames, setFileNames] = useState({
    resume: "",
    medicalLicense: "",
    accreditationCertificateFile: "",
    photograph: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const router = useRouter()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const keys = name.split(".")

    setFormData((prev) => {
      const newData = { ...prev }
      let current = newData

      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }

      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          [name]: files[0],
        },
      }))

      // Update file name for display
      setFileNames((prev) => ({
        ...prev,
        [name]: files[0].name,
      }))
    }
  }

  const removeFile = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [name]: null,
      },
    }))

    setFileNames((prev) => ({
      ...prev,
      [name]: "",
    }))

    // Reset the file input
    const fileInput = document.getElementById(`documents.${name}`) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)


    if (!captchaToken) {
      setError("Please complete the captcha verification");
      setIsSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData()

      // Append all form data to FormData object
      Object.entries(formData).forEach(([section, values]) => {
        if (section === "documents") {
          Object.entries(values).forEach(([docName, file]) => {
            if (file) {
              formDataToSend.append(`${section}.${docName}`, file)
            }
          })
        } else {
          if (typeof values === "object") {
            Object.entries(values).forEach(([field, value]) => {
              if (typeof value === "object") {
                Object.entries(value).forEach(([subField, subValue]) => {
                  formDataToSend.append(`${section}.${field}.${subField}`, subValue)
                })
              } else {
                formDataToSend.append(`${section}.${field}`, value)
              }
            })
          }
        }
      })

      const response = await fetch("/api/become-a-therapist", {
        method: "POST",
        body: formDataToSend,
      })

      if (response.ok) {
        setSubmitSuccess(true)
      } else {
        throw new Error("Submission failed")
      }
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("There was an error submitting your application. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-100 py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="bg-green-600 text-white p-6">
              <CardTitle className="text-2xl font-bold text-center">Application Submitted Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-green-100 p-3">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-800 mb-4">Your request has been created</h2>
              <p className="text-center text-gray-700 mb-4">
                Thank you for your interest in joining iCareWellbeing. We've received your application and it's now
                being reviewed by our team.
              </p>
              <p className="text-center text-gray-700 mb-6">
                Please be patient. We will get in touch with you within 5-7 business days to discuss the next steps.
              </p>
              <div className="mt-6 flex justify-center">
                <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Interested in Joining Our Psychologist Team in Dubai?
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            At iCareWellbeing, we believe that therapy can transform lives for the better.
          </p>
        </div>

        <Card className="shadow-lg mb-8">
          <CardHeader className="bg-blue-600 text-white p-6">
            <CardTitle className="text-lg font-medium">About the Position</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <p className="text-gray-700 mb-4">
              As a DHA-licensed, CDA or licensed therapist, you&apos;ll have the opportunity to work with us on a
              contractual basis, choosing hours that work best for you. You&apos;ll have post-qualification experience
              working with adults in a mental or physical health setting, and you&apos;ll be experienced in
              evidence-based therapies such as Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy
              (ACT), Schema Therapy, Systemic Therapy, Narrative Therapy, Dialectical Behaviour Therapy (DBT),
              Interpersonal Therapy (IPT), Cognitive Analytic Therapy (CAT), Eye Movement Desensitization and
              Reprocessing (EMDR), Couples Therapy, and other therapies that are currently practiced and recognized form
              part of DHA Guidelines recommendations.
            </p>
            <p className="text-gray-700">
              We are looking for innovative therapists who are willing to provide therapy in new and creative ways, such
              as via live chat. If you&apos;re passionate about helping others and making a difference in the world, we
              want you to join our team.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
            <CardDescription>Please fill out the form below to apply.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="personalInfo.fullName">Full Name *</Label>
                    <Input
                      type="text"
                      name="personalInfo.fullName"
                      id="personalInfo.fullName"
                      value={formData.personalInfo.fullName}
                      onChange={handleChange}
                      placeholder="Dr. Jane Smith"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="personalInfo.gender">Gender *</Label>
                    <Select
                      id="personalInfo.gender"
                      name="personalInfo.gender"
                      value={formData.personalInfo.gender}
                      onValueChange={(value) => handleChange({ target: { name: "personalInfo.gender", value } } as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="personalInfo.phoneNumber">Phone Number *</Label>
                    <Input
                      type="tel"
                      name="personalInfo.phoneNumber"
                      id="personalInfo.phoneNumber"
                      value={formData.personalInfo.phoneNumber}
                      onChange={handleChange}
                      placeholder="+971 50 123 4567"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="personalInfo.dateOfBirth">Date of Birth *</Label>
                    <Input
                      type="date"
                      name="personalInfo.dateOfBirth"
                      id="personalInfo.dateOfBirth"
                      value={formData.personalInfo.dateOfBirth}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="personalInfo.email">Email Address *</Label>
                    <Input
                      type="email"
                      name="personalInfo.email"
                      id="personalInfo.email"
                      value={formData.personalInfo.email}
                      onChange={handleChange}
                      placeholder="jane.smith@medemail.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="personalInfo.residentialAddress">Residential Address *</Label>
                    <Input
                      type="text"
                      name="personalInfo.residentialAddress"
                      id="personalInfo.residentialAddress"
                      value={formData.personalInfo.residentialAddress}
                      onChange={handleChange}
                      placeholder="al mamsha street, dubai, app no …"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Educational Background Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Educational Background</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="education.undergraduateDegree">Undergraduate Degree *</Label>
                    <Input
                      type="text"
                      name="education.undergraduateDegree"
                      id="education.undergraduateDegree"
                      value={formData.education.undergraduateDegree}
                      onChange={handleChange}
                      placeholder="B.Sc. in Psychology, University of Health Sciences"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="education.graduationYear">Graduation Year *</Label>
                    <Input
                      type="number"
                      name="education.graduationYear"
                      id="education.graduationYear"
                      value={formData.education.graduationYear}
                      onChange={handleChange}
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder="2006"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="education.psychologySchool">Psychology School *</Label>
                    <Input
                      type="text"
                      name="education.psychologySchool"
                      id="education.psychologySchool"
                      value={formData.education.psychologySchool}
                      onChange={handleChange}
                      placeholder="ABC Medical College"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="education.residency">Residency *</Label>
                    <Input
                      type="text"
                      name="education.residency"
                      id="education.residency"
                      value={formData.education.residency}
                      onChange={handleChange}
                      placeholder="General Psychologist, City Hospital, 2007-2010"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="education.fellowships">Fellowships (if any)</Label>
                    <Input
                      type="text"
                      name="education.fellowships"
                      id="education.fellowships"
                      value={formData.education.fellowships}
                      onChange={handleChange}
                      placeholder="Autism, Children's Hospital, 2011-2012"
                    />
                  </div>
                </div>
              </div>

              {/* Licensure and Certifications Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Licensure and Certifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="licensure.licenseNumber">Professional or Medical License Number *</Label>
                    <Input
                      type="text"
                      name="licensure.licenseNumber"
                      id="licensure.licenseNumber"
                      value={formData.licensure.licenseNumber}
                      onChange={handleChange}
                      placeholder="123456"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licensure.accreditationCertificate">
                      Psychological Accreditation Certificate *
                    </Label>
                    <Input
                      type="text"
                      name="licensure.accreditationCertificate"
                      id="licensure.accreditationCertificate"
                      value={formData.licensure.accreditationCertificate}
                      onChange={handleChange}
                      placeholder="Dubai Health Authority"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licensure.stateOfLicensure">State of Licensure *</Label>
                    <Input
                      type="text"
                      name="licensure.stateOfLicensure"
                      id="licensure.stateOfLicensure"
                      value={formData.licensure.stateOfLicensure}
                      onChange={handleChange}
                      placeholder="Dubai"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="licensure.additionalCertifications">Additional Certifications</Label>
                    <Input
                      type="text"
                      name="licensure.additionalCertifications"
                      id="licensure.additionalCertifications"
                      value={formData.licensure.additionalCertifications}
                      onChange={handleChange}
                      placeholder="CBT Certification, EMDR Training"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Experience Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Professional Experience</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experience.recentEmployer">Recent Employer *</Label>
                    <Input
                      type="text"
                      name="experience.recentEmployer"
                      id="experience.recentEmployer"
                      value={formData.experience.recentEmployer}
                      onChange={handleChange}
                      placeholder="City General Psychologist"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience.position">Position *</Label>
                    <Input
                      type="text"
                      name="experience.position"
                      id="experience.position"
                      value={formData.experience.position}
                      onChange={handleChange}
                      placeholder="Clinical psychologist"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience.from">From *</Label>
                    <Input
                      type="date"
                      name="experience.from"
                      id="experience.from"
                      value={formData.experience.from}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience.to">To *</Label>
                    <Input
                      type="date"
                      name="experience.to"
                      id="experience.to"
                      value={formData.experience.to}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="experience.duties">Duties/Responsibilities *</Label>
                    <Textarea
                      name="experience.duties"
                      id="experience.duties"
                      rows={3}
                      value={formData.experience.duties}
                      onChange={handleChange}
                      placeholder="Conducting emergency involvement, CBT Online therapy, any mental health patient consultations."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* References Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">References (Optional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <h4 className="text-lg font-medium text-gray-700">Reference 1</h4>
                  </div>
                  <div>
                    <Label htmlFor="references.reference1.name">Name</Label>
                    <Input
                      type="text"
                      name="references.reference1.name"
                      id="references.reference1.name"
                      value={formData.references.reference1.name}
                      onChange={handleChange}
                      placeholder="Dr. John Doe, Psychiatrist, City General Hospital"
                    />
                  </div>
                  <div>
                    <Label htmlFor="references.reference1.phone">Phone</Label>
                    <Input
                      type="tel"
                      name="references.reference1.phone"
                      id="references.reference1.phone"
                      value={formData.references.reference1.phone}
                      onChange={handleChange}
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="references.reference1.email">Email</Label>
                    <Input
                      type="email"
                      name="references.reference1.email"
                      id="references.reference1.email"
                      value={formData.references.reference1.email}
                      onChange={handleChange}
                      placeholder="johndoe@cityhospital.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <h4 className="text-lg font-medium text-gray-700 mt-4">Reference 2</h4>
                  </div>
                  <div>
                    <Label htmlFor="references.reference2.name">Name</Label>
                    <Input
                      type="text"
                      name="references.reference2.name"
                      id="references.reference2.name"
                      value={formData.references.reference2.name}
                      onChange={handleChange}
                      placeholder="Dr. Emily White, Department Chair, ABC Medical College"
                    />
                  </div>
                  <div>
                    <Label htmlFor="references.reference2.phone">Phone</Label>
                    <Input
                      type="tel"
                      name="references.reference2.phone"
                      id="references.reference2.phone"
                      value={formData.references.reference2.phone}
                      onChange={handleChange}
                      placeholder="+971 50 123 4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="references.reference2.email">Email</Label>
                    <Input
                      type="email"
                      name="references.reference2.email"
                      id="references.reference2.email"
                      value={formData.references.reference2.email}
                      onChange={handleChange}
                      placeholder="emily.white@abccollege.edu"
                    />
                  </div>
                </div>
              </div>

              {/* Special Skills and Interests Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Special Skills and Interests</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="skills.specialSkills">Special Skills and Interests</Label>
                    <Input
                      type="text"
                      name="skills.specialSkills"
                      id="skills.specialSkills"
                      value={formData.skills.specialSkills}
                      onChange={handleChange}
                      placeholder="Fluent in Spanish, Proficient in CBT, Psychoanalytic therapy, Volunteer Work at Local Clinics"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="skills.personalStatement">Personal Statement *</Label>
                    <Textarea
                      name="skills.personalStatement"
                      id="skills.personalStatement"
                      rows={5}
                      value={formData.skills.personalStatement}
                      onChange={handleChange}
                      placeholder="I am passionate about providing high-quality, patient-centered online therapy sessions and am particularly interested in developing innovative therapeutic approaches to improve patient outcomes."
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Upload Documents Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900">Upload Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="documents.resume">Resume/CV *</Label>
                    {fileNames.resume ? (
                      <div className="mt-2 flex items-center p-2 border rounded-md bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-blue-700 flex-1 truncate">{fileNames.resume}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile("resume")}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="documents.resume"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX (MAX. 10MB)</p>
                          </div>
                          <input
                            type="file"
                            name="resume"
                            id="documents.resume"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="documents.medicalLicense">Medical License *</Label>
                    {fileNames.medicalLicense ? (
                      <div className="mt-2 flex items-center p-2 border rounded-md bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-blue-700 flex-1 truncate">{fileNames.medicalLicense}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile("medicalLicense")}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="documents.medicalLicense"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, JPG, JPEG, PNG (MAX. 10MB)</p>
                          </div>
                          <input
                            type="file"
                            name="medicalLicense"
                            id="documents.medicalLicense"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="documents.accreditationCertificateFile">
                      Psychological Accreditation Certificate *
                    </Label>
                    {fileNames.accreditationCertificateFile ? (
                      <div className="mt-2 flex items-center p-2 border rounded-md bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-blue-700 flex-1 truncate">
                          {fileNames.accreditationCertificateFile}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile("accreditationCertificateFile")}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="documents.accreditationCertificateFile"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, JPG, JPEG, PNG (MAX. 10MB)</p>
                          </div>
                          <input
                            type="file"
                            name="accreditationCertificateFile"
                            id="documents.accreditationCertificateFile"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="documents.photograph">Recent Photograph *</Label>
                    {fileNames.photograph ? (
                      <div className="mt-2 flex items-center p-2 border rounded-md bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-blue-700 flex-1 truncate">{fileNames.photograph}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile("photograph")}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="documents.photograph"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">JPG, JPEG, PNG (MAX. 10MB)</p>
                          </div>
                          <input
                            type="file"
                            name="photograph"
                            id="documents.photograph"
                            onChange={handleFileChange}
                            accept=".jpg,.jpeg,.png"
                            className="hidden"
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                    <ReCAPTCHA
                        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                        onChange={(token) => setCaptchaToken(token)}
                      />
                </div>

                <span className="text-sm text-red-500">{error}</span>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting || !captchaToken} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 p-6 rounded-lg shadow-lg mt-8">
          <CardContent>
            <h3 className="text-lg font-medium text-blue-800 mb-4">
              At iCareWellbeing We Believe In Continuous Learning
            </h3>
            <p className="text-blue-700">
              That&apos;s Why We Offer You daily mental health content and access to a vibrant psychologist and
              psychiatrist community.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

