"use client"

import { useState, useEffect } from "react"
import { Spin } from "antd"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertCircle,
  User,
  GraduationCap,
  Award,
  Briefcase,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface TherapistApplicationDialogProps {
  applicationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: () => void
}

interface ApplicationData {
  _id: string
  personalInfo: {
    fullName: string
    gender: string
    phoneNumber: string
    dateOfBirth: string
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
    from: string
    to: string
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
    resume: string
    medicalLicense: string
    accreditationCertificateFile: string
    photograph: string
  }
  status: "pending" | "reviewing" | "approved" | "rejected"
  statusNotes?: string
  createdAt: string
  updatedAt?: string
}

export default function TherapistApplicationDialog({
  applicationId,
  open,
  onOpenChange,
  onStatusChange,
}: TherapistApplicationDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [application, setApplication] = useState<ApplicationData | null>(null)
  const [newStatus, setNewStatus] = useState<string>("")
  const [statusNotes, setStatusNotes] = useState<string>("")

  // Fetch application data
  const fetchApplicationData = async () => {
    if (!open || !applicationId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/therapist-applications/${applicationId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch application details")
      }

      const data = await response.json()
      setApplication(data)
      setNewStatus(data.status)
      setStatusNotes(data.statusNotes || "")
    } catch (error) {
      console.error("Error fetching application:", error)
      setError("Failed to load application details")
    } finally {
      setIsLoading(false)
    }
  }

  // Update application status
  const updateApplicationStatus = async () => {
    if (!application) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/therapist-applications/${applicationId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          statusNotes,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update application status")
      }

      toast.success("Application status updated successfully")
      onStatusChange()

      // Update local state
      setApplication((prev) => (prev ? { ...prev, status: newStatus as any, statusNotes } : null))
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Failed to update application status")
    } finally {
      setIsUpdating(false)
    }
  }

  // Call fetchApplicationData when the dialog opens
  useEffect(() => {
    if (open) {
      fetchApplicationData()
    }
  }, [open, applicationId])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case "reviewing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <FileText className="h-3 w-3 mr-1" />
            Reviewing
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen)
        if (newOpen) fetchApplicationData()
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Therapist Application</DialogTitle>
          <DialogDescription>Review the application details and update the status</DialogDescription>
        </DialogHeader>

        <Spin spinning={isLoading} tip="Loading application data..." size="large">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Application</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchApplicationData}>Retry</Button>
            </div>
          ) : !application ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Not Found</h3>
              <p className="text-gray-600">The requested application could not be found.</p>
            </div>
          ) : (
            <>
              {/* Application Status Section */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 overflow-y-auto max-h-40">
                <div>
                  <div className="flex items-center mb-2">
                    <h3 className="font-semibold text-gray-700 mr-3">Current Status:</h3>
                    {getStatusBadge(application.status)}
                  </div>
                  <p className="text-sm text-gray-600">Application submitted on {formatDate(application.createdAt)}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={updateApplicationStatus} disabled={isUpdating || newStatus === application.status}>
                    {isUpdating ? (
                      <Spin size="small" />
                    ) : (
                      "Update Status"
                    )}
                  </Button>
                </div>
              </div>

              {/* Application Content */}
              <div className="overflow-y-auto flex-1 pr-2">
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="education">Education & License</TabsTrigger>
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <User className="h-5 w-5 text-blue-600 mr-2" />
                          Personal Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-700">Full Name</h4>
                            <p className="text-gray-900">{application.personalInfo.fullName}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Gender</h4>
                            <p className="text-gray-900">{application.personalInfo.gender}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Email</h4>
                            <p className="text-gray-900">{application.personalInfo.email}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Phone Number</h4>
                            <p className="text-gray-900">{application.personalInfo.phoneNumber}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Date of Birth</h4>
                            <p className="text-gray-900">
                              {application.personalInfo.dateOfBirth
                                ? new Date(application.personalInfo.dateOfBirth).toLocaleDateString()
                                : "Not provided"}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Residential Address</h4>
                            <p className="text-gray-900">{application.personalInfo.residentialAddress}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 text-blue-600 mr-2" />
                          References
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!application.references ||
                        (!application.references.reference1 && !application.references.reference2) ? (
                          <p className="text-gray-500 italic">No references provided</p>
                        ) : (
                          <div className="space-y-6">
                            {application.references.reference1 && (
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">Reference 1</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-600">Name</h5>
                                    <p className="text-gray-900">
                                      {application.references.reference1.name || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-600">Phone</h5>
                                    <p className="text-gray-900">
                                      {application.references.reference1.phone || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-600">Email</h5>
                                    <p className="text-gray-900">
                                      {application.references.reference1.email || "Not provided"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {application.references.reference2 && (
                              <div>
                                <h4 className="font-medium text-gray-700 mb-2">Reference 2</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-600">Name</h5>
                                    <p className="text-gray-900">
                                      {application.references.reference2.name || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-600">Phone</h5>
                                    <p className="text-gray-900">
                                      {application.references.reference2.phone || "Not provided"}
                                    </p>
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-medium text-gray-600">Email</h5>
                                    <p className="text-gray-900">
                                      {application.references.reference2.email || "Not provided"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-600 mr-2" />
                          Skills & Personal Statement
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Special Skills</h4>
                          <p className="text-gray-900">{application.skills.specialSkills}</p>
                        </div>
                        <Separator />
                        <div>
                          <h4 className="font-medium text-gray-700 mb-1">Personal Statement</h4>
                          <p className="text-gray-900 whitespace-pre-line">{application.skills.personalStatement}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="education" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <GraduationCap className="h-5 w-5 text-blue-600 mr-2" />
                          Educational Background
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-700">Undergraduate Degree</h4>
                            <p className="text-gray-900">{application.education.undergraduateDegree}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Graduation Year</h4>
                            <p className="text-gray-900">{application.education.graduationYear}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Psychology School</h4>
                            <p className="text-gray-900">{application.education.psychologySchool}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Residency</h4>
                            <p className="text-gray-900">{application.education.residency}</p>
                          </div>
                          {application.education.fellowships && (
                            <div className="md:col-span-2">
                              <h4 className="font-medium text-gray-700">Fellowships</h4>
                              <p className="text-gray-900">{application.education.fellowships}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Award className="h-5 w-5 text-blue-600 mr-2" />
                          Licensure and Certifications
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-700">License Number</h4>
                            <p className="text-gray-900">{application.licensure.licenseNumber}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Accreditation Certificate</h4>
                            <p className="text-gray-900">{application.licensure.accreditationCertificate}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">State of Licensure</h4>
                            <p className="text-gray-900">{application.licensure.stateOfLicensure}</p>
                          </div>
                          {application.licensure.additionalCertifications && (
                            <div className="md:col-span-2">
                              <h4 className="font-medium text-gray-700">Additional Certifications</h4>
                              <p className="text-gray-900">{application.licensure.additionalCertifications}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="experience" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Briefcase className="h-5 w-5 text-blue-600 mr-2" />
                          Professional Experience
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-700">Recent Employer</h4>
                            <p className="text-gray-900">{application.experience.recentEmployer}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">Position</h4>
                            <p className="text-gray-900">{application.experience.position}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">From</h4>
                            <p className="text-gray-900">{new Date(application.experience.from).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700">To</h4>
                            <p className="text-gray-900">{new Date(application.experience.to).toLocaleDateString()}</p>
                          </div>
                          <div className="md:col-span-2">
                            <h4 className="font-medium text-gray-700">Duties/Responsibilities</h4>
                            <p className="text-gray-900 whitespace-pre-line">{application.experience.duties}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 text-blue-600 mr-2" />
                          Uploaded Documents
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                              <FileText className="h-4 w-4 text-blue-600 mr-2" />
                              Resume/CV
                            </h4>
                            <div className="flex justify-between items-center mt-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={application.documents.resume} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={application.documents.resume} download>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>

                          <div className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                              <FileText className="h-4 w-4 text-blue-600 mr-2" />
                              Medical License
                            </h4>
                            <div className="flex justify-between items-center mt-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={application.documents.medicalLicense} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={application.documents.medicalLicense} download>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>

                          <div className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                              <FileText className="h-4 w-4 text-blue-600 mr-2" />
                              Accreditation Certificate
                            </h4>
                            <div className="flex justify-between items-center mt-2">
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={application.documents.accreditationCertificateFile}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={application.documents.accreditationCertificateFile} download>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>

                          <div className="border rounded-lg p-4 bg-gray-50">
                            <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                              <User className="h-4 w-4 text-blue-600 mr-2" />
                              Photograph
                            </h4>
                            <div className="flex justify-center mb-3">
                              <img
                                src={application.documents.photograph || "/placeholder.svg"}
                                alt="Applicant"
                                className="h-32 w-32 object-cover rounded-lg border"
                              />
                            </div>
                            <div className="flex justify-center">
                              <Button variant="outline" size="sm" asChild>
                                <a href={application.documents.photograph} download>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <DialogFooter className="mt-4">
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </Spin>
      </DialogContent>
    </Dialog>
  )
}