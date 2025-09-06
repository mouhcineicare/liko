"use client"

import type React from "react"
import { Spin } from "antd"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  Clock,
  Globe,
  MessageSquare,
  User,
  Award,
  FileText,
  Brain,
  AlertCircle,
  Edit,
  Save,
  X,
  Plus,
  Trash,
} from "lucide-react"
import { toast } from "sonner"

interface TherapistProfileDialogProps {
  therapistId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TherapistData {
  _id: string
  fullName: string
  email: string
  telephone: string
  specialties?: string[]
  image?: string
  status: string
  createdAt: string
}

interface ProfileData {
  _id: string
  therapyId: string
  aboutMe: string
  therapeuticApproach: string
  communicationApproach: string
  professionalExperience: number
  mentalHealthExpertise: string[]
  communicationModes: string[]
  spokenLanguages: string[]
  licenseInformation: string
  availability: { day: string; startTime: string; endTime: string }[]
  createdAt: string
  updatedAt: string
}

// Communication modes options
const communicationModes = [
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "message", label: "Message" },
]

// Days of the week
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// Time slots (hourly from 8 AM to 10 PM)
const timeSlots = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8
  return {
    value: `${hour.toString().padStart(2, "0")}:00`,
    label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`,
  }
})

export default function TherapistProfileDialog({ therapistId, open, onOpenChange }: TherapistProfileDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [therapist, setTherapist] = useState<TherapistData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")

  // Form state
  const [formData, setFormData] = useState<Partial<ProfileData>>({
    aboutMe: "",
    therapeuticApproach: "",
    communicationApproach: "",
    professionalExperience: 0,
    mentalHealthExpertise: [],
    communicationModes: [],
    spokenLanguages: [],
    licenseInformation: "",
    availability: [{ day: "Monday", startTime: "09:00", endTime: "17:00" }],
  })

  // Input states for tags
  const [expertiseInput, setExpertiseInput] = useState("")
  const [languageInput, setLanguageInput] = useState("")

  // Fetch therapist profile data when dialog opens
  const fetchProfileData = async () => {
    if (!open || !therapistId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users/therapists/${therapistId}/profile`)

      if (!response.ok) {
        throw new Error("Failed to fetch therapist profile")
      }

      const data = await response.json()
      setTherapist(data.therapist)
      setProfile(data.profile)

      // Initialize form data with profile data or defaults
      if (data.profile) {
        setFormData({
          aboutMe: data.profile.aboutMe || "",
          therapeuticApproach: data.profile.therapeuticApproach || "",
          communicationApproach: data.profile.communicationApproach || "",
          professionalExperience: data.profile.professionalExperience || 0,
          mentalHealthExpertise: data.profile.mentalHealthExpertise || [],
          communicationModes: data.profile.communicationModes || [],
          spokenLanguages: data.profile.spokenLanguages || [],
          licenseInformation: data.profile.licenseInformation || "",
          availability:
            data.profile.availability && data.profile.availability.length > 0
              ? data.profile.availability
              : [{ day: "Monday", startTime: "09:00", endTime: "17:00" }],
        })
      } else {
        // Reset to defaults if no profile
        setFormData({
          aboutMe: "",
          therapeuticApproach: "",
          communicationApproach: "",
          professionalExperience: 0,
          mentalHealthExpertise: [],
          communicationModes: [],
          spokenLanguages: [],
          licenseInformation: "",
          availability: [{ day: "Monday", startTime: "09:00", endTime: "17:00" }],
        })
      }
    } catch (error) {
      console.error("Error fetching therapist profile:", error)
      setError("Failed to load therapist profile")
    } finally {
      setIsLoading(false)
    }
  }

  // Call fetchProfileData when the dialog opens
  useEffect(() => {
    if (open) {
      fetchProfileData()
      setIsEditMode(false)
    }
  }, [open, therapistId])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: Number.parseInt(value) || 0 }))
  }

  // Handle checkbox changes for communication modes
  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        communicationModes: [...(prev.communicationModes || []), id],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        communicationModes: (prev.communicationModes || []).filter((mode) => mode !== id),
      }))
    }
  }

  // Add expertise tag
  const addExpertise = () => {
    if (expertiseInput.trim() !== "") {
      if (!(formData.mentalHealthExpertise || []).includes(expertiseInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          mentalHealthExpertise: [...(prev.mentalHealthExpertise || []), expertiseInput.trim()],
        }))
      }
      setExpertiseInput("")
    }
  }

  // Remove expertise tag
  const removeExpertise = (expertise: string) => {
    setFormData((prev) => ({
      ...prev,
      mentalHealthExpertise: (prev.mentalHealthExpertise || []).filter((item) => item !== expertise),
    }))
  }

  // Add language tag
  const addLanguage = () => {
    if (languageInput.trim() !== "") {
      if (!(formData.spokenLanguages || []).includes(languageInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          spokenLanguages: [...(prev.spokenLanguages || []), languageInput.trim()],
        }))
      }
      setLanguageInput("")
    }
  }

  // Remove language tag
  const removeLanguage = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      spokenLanguages: (prev.spokenLanguages || []).filter((item) => item !== language),
    }))
  }

  // Add availability slot
  const addAvailabilitySlot = () => {
    setFormData((prev) => ({
      ...prev,
      availability: [...(prev.availability || []), { day: "Monday", startTime: "09:00", endTime: "17:00" }],
    }))
  }

  // Remove availability slot
  const removeAvailabilitySlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      availability: (prev.availability || []).filter((_, i) => i !== index),
    }))
  }

  // Update availability
  const updateAvailability = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const newAvailability = [...(prev.availability || [])]
      newAvailability[index] = { ...newAvailability[index], [field]: value }
      return { ...prev, availability: newAvailability }
    })
  }

  // Save profile changes
  const saveProfileChanges = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/users/therapists/${therapistId}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const data = await response.json()
      setProfile(data.profile)
      toast.success("Therapist profile updated successfully")
      setIsEditMode(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // If canceling edit, reset form data to current profile
      if (profile) {
        setFormData({
          aboutMe: profile.aboutMe,
          therapeuticApproach: profile.therapeuticApproach,
          communicationApproach: profile.communicationApproach,
          professionalExperience: profile.professionalExperience,
          mentalHealthExpertise: profile.mentalHealthExpertise,
          communicationModes: profile.communicationModes,
          spokenLanguages: profile.spokenLanguages,
          licenseInformation: profile.licenseInformation,
          availability: profile.availability,
        })
      }
    }
    setIsEditMode(!isEditMode)
  }

  // Get initials for avatar fallback
  const getInitials = (name = "") => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        onOpenChange(newOpen)
        if (newOpen) fetchProfileData()
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl">Therapist Profile</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit profile information" : "View detailed information about this therapist"}
            </DialogDescription>
          </div>
          {!isLoading && therapist && profile && (
            <Button onClick={toggleEditMode} variant={isEditMode ? "destructive" : "outline"} size="sm">
              {isEditMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          )}
        </DialogHeader>

        <Spin spinning={isLoading} tip="Loading profile data..." size="large">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Profile</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={fetchProfileData}>Retry</Button>
            </div>
          ) : !therapist ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Therapist Not Found</h3>
              <p className="text-gray-600">The requested therapist could not be found.</p>
            </div>
          ) : (
            <>
              {/* Therapist Basic Info */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg mb-4">
                <Avatar className="h-16 w-16 border-2 border-blue-100">
                  <AvatarImage src={therapist.image} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                    {getInitials(therapist.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">Dr. {therapist.fullName}</h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <p className="text-gray-600 text-sm">{therapist.email}</p>
                    <span className="text-gray-400">•</span>
                    <p className="text-gray-600 text-sm">{therapist.telephone}</p>
                  </div>
                  <div className="flex items-center mt-2">
                    <Badge
                      className={`${
                        therapist.status === "active"
                          ? "bg-green-100 text-green-800"
                          : therapist.status === "banned"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {therapist.status}
                    </Badge>
                    <span className="text-sm text-gray-500 ml-4">Joined: {formatDate(therapist.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Profile Content */}
              <div className="overflow-y-auto flex-1 pr-2">
                {!profile && !isEditMode ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Created</h3>
                    <p className="text-gray-600 max-w-md mb-4">
                      This therapist hasn't created their profile yet. You can create one for them.
                    </p>
                    <Button onClick={() => setIsEditMode(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Create Profile
                    </Button>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="basic">Basic Information</TabsTrigger>
                      <TabsTrigger value="expertise">Expertise & Languages</TabsTrigger>
                      <TabsTrigger value="availability">Availability</TabsTrigger>
                    </TabsList>

                    {isEditMode ? (
                      // EDIT MODE CONTENT
                      <>
                        <TabsContent value="basic" className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <User className="h-5 w-5 text-blue-600 mr-2" />
                                About Me
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <Textarea
                                  id="aboutMe"
                                  name="aboutMe"
                                  placeholder="Share a brief introduction about the therapist..."
                                  className="min-h-[120px]"
                                  value={formData.aboutMe}
                                  onChange={handleInputChange}
                                />
                                <p className="text-sm text-muted-foreground">
                                  This will be displayed on the therapist's public profile.
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Brain className="h-5 w-5 text-blue-600 mr-2" />
                                Therapeutic Approach
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <Textarea
                                  id="therapeuticApproach"
                                  name="therapeuticApproach"
                                  placeholder="Describe the therapeutic approach and methodologies..."
                                  className="min-h-[120px]"
                                  value={formData.therapeuticApproach}
                                  onChange={handleInputChange}
                                />
                                <p className="text-sm text-muted-foreground">
                                  Explain the therapeutic philosophy and methods.
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                                Communication Approach
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <Textarea
                                  id="communicationApproach"
                                  name="communicationApproach"
                                  placeholder="Describe how the therapist communicates with clients..."
                                  className="min-h-[120px]"
                                  value={formData.communicationApproach}
                                  onChange={handleInputChange}
                                />
                                <p className="text-sm text-muted-foreground">
                                  Explain the communication style and what clients can expect.
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Award className="h-5 w-5 text-blue-600 mr-2" />
                                Professional Experience & License
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="professionalExperience">Years of Experience</Label>
                                <Input
                                  id="professionalExperience"
                                  name="professionalExperience"
                                  type="number"
                                  min="0"
                                  value={formData.professionalExperience}
                                  onChange={handleNumberChange}
                                />
                              </div>
                              <Separator />
                              <div className="space-y-2">
                                <Label htmlFor="licenseInformation">License Information</Label>
                                <Textarea
                                  id="licenseInformation"
                                  name="licenseInformation"
                                  placeholder="Enter license details, certifications, and qualifications..."
                                  className="min-h-[100px]"
                                  value={formData.licenseInformation}
                                  onChange={handleInputChange}
                                />
                                <p className="text-sm text-muted-foreground">
                                  Include license number, issuing authority, and relevant certifications.
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="expertise" className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                                Mental Health Expertise
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Input
                                    placeholder="Add expertise (e.g., Anxiety, Depression)..."
                                    value={expertiseInput}
                                    onChange={(e) => setExpertiseInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        addExpertise()
                                      }
                                    }}
                                    className="flex-1"
                                  />
                                  <Button type="button" variant="outline" onClick={addExpertise}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Press Enter or click Add after typing each expertise area.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {(formData.mentalHealthExpertise || []).map((expertise, index) => (
                                    <Badge key={index} variant="secondary" className="px-3 py-1">
                                      {expertise}
                                      <button
                                        type="button"
                                        onClick={() => removeExpertise(expertise)}
                                        className="ml-2 text-xs hover:text-destructive"
                                      >
                                        ×
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                                Communication Modes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {communicationModes.map((mode) => (
                                  <div
                                    key={mode.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                  >
                                    <input
                                      type="checkbox"
                                      id={`mode-${mode.id}`}
                                      checked={(formData.communicationModes || []).includes(mode.id)}
                                      onChange={(e) => handleCheckboxChange(mode.id, e.target.checked)}
                                      className="h-4 w-4 mt-1"
                                    />
                                    <Label htmlFor={`mode-${mode.id}`} className="cursor-pointer">
                                      {mode.label}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Globe className="h-5 w-5 text-blue-600 mr-2" />
                                Spoken Languages
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Input
                                    placeholder="Add language (e.g., English, Arabic)..."
                                    value={languageInput}
                                    onChange={(e) => setLanguageInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault()
                                        addLanguage()
                                      }
                                    }}
                                    className="flex-1"
                                  />
                                  <Button type="button" variant="outline" onClick={addLanguage}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                  </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Press Enter or click Add after typing each language.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {(formData.spokenLanguages || []).map((language, index) => (
                                    <Badge key={index} variant="secondary" className="px-3 py-1">
                                      {language}
                                      <button
                                        type="button"
                                        onClick={() => removeLanguage(language)}
                                        className="ml-2 text-xs hover:text-destructive"
                                      >
                                        ×
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="availability" className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                                Weekly Availability (UAE Time Zone)
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {(formData.availability || []).map((slot, index) => (
                                  <div key={index} className="flex flex-col space-y-4 p-4 border rounded-md">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium">Availability Slot {index + 1}</h4>
                                      {index > 0 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeAvailabilitySlot(index)}
                                          className="text-destructive"
                                        >
                                          <Trash className="h-4 w-4 mr-2" />
                                          Remove
                                        </Button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                        <Label>Day</Label>
                                        <Select
                                          value={slot.day}
                                          onValueChange={(value) => updateAvailability(index, "day", value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select day" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {daysOfWeek.map((day) => (
                                              <SelectItem key={day} value={day}>
                                                {day}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Select
                                          value={slot.startTime}
                                          onValueChange={(value) => updateAvailability(index, "startTime", value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select time" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {timeSlots.map((time) => (
                                              <SelectItem key={time.value} value={time.value}>
                                                {time.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>End Time</Label>
                                        <Select
                                          value={slot.endTime}
                                          onValueChange={(value) => updateAvailability(index, "endTime", value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select time" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {timeSlots.map((time) => (
                                              <SelectItem key={time.value} value={time.value}>
                                                {time.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                <Button type="button" variant="outline" className="w-full" onClick={addAvailabilitySlot}>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Add Availability Slot
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </>
                    ) : (
                      // VIEW MODE CONTENT
                      <>
                        <TabsContent value="basic" className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <User className="h-5 w-5 text-blue-600 mr-2" />
                                About Me
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-700 whitespace-pre-line">{profile?.aboutMe}</p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Brain className="h-5 w-5 text-blue-600 mr-2" />
                                Therapeutic Approach
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-700 whitespace-pre-line">{profile?.therapeuticApproach}</p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                                Communication Approach
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-700 whitespace-pre-line">{profile?.communicationApproach}</p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Award className="h-5 w-5 text-blue-600 mr-2" />
                                Professional Experience & License
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Years of Experience</h4>
                                <p className="text-gray-700">{profile?.professionalExperience} years</p>
                              </div>
                              <Separator />
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">License Information</h4>
                                <p className="text-gray-700 whitespace-pre-line">{profile?.licenseInformation}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="expertise" className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                                Mental Health Expertise
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {!profile?.mentalHealthExpertise || profile.mentalHealthExpertise.length === 0 ? (
                                <p className="text-gray-500 italic">No expertise areas specified</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {profile.mentalHealthExpertise.map((expertise, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="bg-blue-50 text-blue-700 border-blue-200"
                                    >
                                      {expertise}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                                Communication Modes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {!profile?.communicationModes || profile.communicationModes.length === 0 ? (
                                <p className="text-gray-500 italic">No communication modes specified</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {profile.communicationModes.map((mode, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="bg-gray-50 text-gray-700 border-gray-200"
                                    >
                                      {mode}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Globe className="h-5 w-5 text-blue-600 mr-2" />
                                Spoken Languages
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {!profile?.spokenLanguages || profile.spokenLanguages.length === 0 ? (
                                <p className="text-gray-500 italic">No languages specified</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {profile.spokenLanguages.map((language, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="bg-gray-50 text-gray-700 border-gray-200"
                                    >
                                      {language}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="availability" className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                                Weekly Availability (UAE Time Zone)
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {!profile?.availability || profile.availability.length === 0 ? (
                                <p className="text-gray-500 italic">No availability schedule specified</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {profile.availability.map((slot, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                      <div className="font-medium text-gray-900">{slot.day}</div>
                                      <div className="flex items-center gap-1 text-gray-700 mt-1">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                        <span>
                                          {slot.startTime} - {slot.endTime}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center">
                                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                                Profile Timestamps
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-1">Profile Created</h4>
                                  <p className="text-gray-700">{formatDate(profile?.createdAt || "")}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-1">Last Updated</h4>
                                  <p className="text-gray-700">{formatDate(profile?.updatedAt || "")}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </>
                    )}
                  </Tabs>
                )}
              </div>

              <DialogFooter className="mt-4 flex justify-between">
                {isEditMode ? (
                  <>
                    <Button variant="outline" onClick={toggleEditMode} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={saveProfileChanges} disabled={isSaving}>
                      {isSaving ? (
                        <Spin size="small" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => onOpenChange(false)}>Close</Button>
                )}
              </DialogFooter>
            </>
          )}
        </Spin>
      </DialogContent>
    </Dialog>
  )
}