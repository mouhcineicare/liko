"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

// Communication modes options
const communicationModes = [
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "message", label: "Message" },
]

// Days of the week
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// Time slots (hourly from 8 AM to 10 PM)
const timeSlots = Array.from({ length: 47 }, (_, i) => {
  const hour = Math.floor(i / 2) + 0
  const minutes = i % 2 === 0 ? '00' : '30'
  return {
    value: `${hour.toString().padStart(2, "0")}:${minutes}`,
    label: `${hour.toString().padStart(2, "0")}:${minutes}`,
  }
})

// Time zones
const timeZones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Etc/GMT', label: 'Greenwich Mean Time (GMT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST - no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HAST)' },
  { value: 'Europe/London', label: 'UK Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/Berlin', label: 'Germany Time (CET)' },
  { value: 'Europe/Madrid', label: 'Spain Time (CET)' },
  { value: 'Europe/Rome', label: 'Italy Time (CET)' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Karachi', label: 'Pakistan Standard Time (PKT)' },
  { value: 'Asia/Jakarta', label: 'Indonesia Time (WIB)' },
  { value: 'Asia/Bangkok', label: 'Thailand Time (ICT)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (KST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)' },
  { value: 'Australia/Sydney', label: 'Sydney Time (AEST/AEDT)' },
  { value: 'Australia/Perth', label: 'Perth Time (AWST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (NZST/NZDT)' },
  { value: 'Africa/Cairo', label: 'Egypt Time (EET)' },
  { value: 'Africa/Johannesburg', label: 'South Africa Time (SAST)' },
  { value: 'America/Sao_Paulo', label: 'Brazil Time (BRT)' },
  { value: 'America/Mexico_City', label: 'Mexico Time (CST)' },
  { value: 'America/Toronto', label: 'Canada Eastern Time (ET)' },
  { value: 'America/Vancouver', label: 'Canada Pacific Time (PT)' }
];


// Initial form state
const initialFormState = {
  aboutMe: "",
  therapeuticApproach: "",
  communicationApproach: "",
  professionalExperience: 0,
  mentalHealthExpertise: [] as string[],
  communicationModes: [] as string[],
  spokenLanguages: [] as string[],
  licenseInformation: "",
  availability: [] as { day: string; hours: string[] }[],
  timeZone: "",
}

export default function Page() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [expertiseInput, setExpertiseInput] = useState("")
  const [languageInput, setLanguageInput] = useState("")
  const [formData, setFormData] = useState(initialFormState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const {update, data: session} = useSession()

  // Fetch existing profile data if available
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/therapist/profile/form")
        if (response.ok) {
          const data = await response.json()
          
          // Transform old availability format to new format if needed
          let availability = data.availability || [];
          if (availability.length > 0 && availability[0].startTime) {
            // Old format detected - transform to new format
            availability = availability.map((slot: any) => {
              const hours = [];
              const startHour = parseInt(slot.startTime.split(':')[0]);
              const endHour = parseInt(slot.endTime.split(':')[0]);
              
              for (let hour = startHour; hour < endHour; hour++) {
                hours.push(`${hour.toString().padStart(2, '0')}:00`);
              }
              
              return {
                day: slot.day,
                hours
              };
            });
          }
  
          // Set form data with fetched data
          setFormData({
            aboutMe: data.aboutMe || "",
            therapeuticApproach: data.therapeuticApproach || "",
            communicationApproach: data.communicationApproach || "",
            professionalExperience: data.professionalExperience || 0,
            mentalHealthExpertise: data.mentalHealthExpertise || [],
            communicationModes: data.communicationModes || [],
            spokenLanguages: data.spokenLanguages || [],
            licenseInformation: data.licenseInformation || "",
            availability: availability,
            timeZone: data.timeZone || "",
          })
        }
      } catch (error) {
        console.error("Error fetching profile data:", error)
      } finally {
        setIsLoading(false)
      }
    }
  
    fetchProfileData()
  }, [])

  // Set default timezone from browser if not already set
  useEffect(() => {
    if (!formData.timeZone) {
      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setFormData(prev => ({
        ...prev,
        timeZone: browserTimeZone || 'UTC' // Fallback to UTC if browser timezone can't be detected
      }));
    }
  }, [formData.timeZone]);


  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
  
    if (formData.aboutMe.length < 10) {
      newErrors.aboutMe = "About me must be at least 10 characters.";
    }
  
    if (formData.therapeuticApproach.length < 10) {
      newErrors.therapeuticApproach = "Therapeutic approach must be at least 10 characters.";
    }
  
    if (formData.communicationApproach.length < 10) {
      newErrors.communicationApproach = "Communication approach must be at least 10 characters.";
    }
  
    if (formData.mentalHealthExpertise.length === 0) {
      newErrors.mentalHealthExpertise = "Please add at least one area of expertise.";
    }
  
    if (formData.communicationModes.length === 0) {
      newErrors.communicationModes = "Please select at least one communication mode.";
    }
  
    if (formData.spokenLanguages.length === 0) {
      newErrors.spokenLanguages = "Please add at least one language.";
    }
  
    if (formData.licenseInformation.length < 5) {
      newErrors.licenseInformation = "License information must be at least 5 characters.";
    }
  
    // Updated availability validation for new format
    if (formData.availability.length === 0) {
      newErrors.availability = "Please select at least one available hour.";
    } else {
      // Check if any day has at least one hour selected
      const hasValidAvailability = formData.availability.some(
        day => day.hours && day.hours.length > 0
      );
      if (!hasValidAvailability) {
        newErrors.availability = "Please select at least one available hour.";
      }
    }
  
    if (!formData.timeZone) {
      newErrors.timeZone = "Please select your time zone.";
    }
  
    setErrors(newErrors);
    console.log("Form validation errors:", newErrors); // Add this for debugging
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("Current form data:", formData);
  
    if (!validateForm()) {
      toast("Please fix the errors in the form before submitting.")
      return
    }
  
    console.log("Submitting form data:", formData); // Add this line
  
    setIsLoading(true)
  
    try {
      const response = await fetch("/api/therapist/profile/form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
  
      if (response.ok) {
        const responseData = await response.json();
        console.log("Response data:", responseData); // Add this line
        toast("Your profile has been successfully updated.")
        if (session) {
          update({...session, user: {...session.user, timeZone: formData.timeZone}})
        }
      } else {
        const errorData = await response.json();
        console.error("Error response:", errorData); // Add this line
        throw new Error("Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast("There was an error updating your profile. Please try again")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: Number.parseInt(value) || 0 }))
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Handle checkbox changes
  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        communicationModes: [...prev.communicationModes, id],
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        communicationModes: prev.communicationModes.filter((mode) => mode !== id),
      }))
    }
  }

  // Add expertise tag
  const addExpertise = () => {
    if (expertiseInput.trim() !== "") {
      if (!formData.mentalHealthExpertise.includes(expertiseInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          mentalHealthExpertise: [...prev.mentalHealthExpertise, expertiseInput.trim()],
        }))
      }
      setExpertiseInput("")
    }
  }

  // Remove expertise tag
  const removeExpertise = (expertise: string) => {
    setFormData((prev) => ({
      ...prev,
      mentalHealthExpertise: prev.mentalHealthExpertise.filter((item) => item !== expertise),
    }))
  }

  // Add language tag
  const addLanguage = () => {
    if (languageInput.trim() !== "") {
      if (!formData.spokenLanguages.includes(languageInput.trim())) {
        setFormData((prev) => ({
          ...prev,
          spokenLanguages: [...prev.spokenLanguages, languageInput.trim()],
        }))
      }
      setLanguageInput("")
    }
  }

  // Remove language tag
  const removeLanguage = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      spokenLanguages: prev.spokenLanguages.filter((item) => item !== language),
    }))
  }



  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your therapist profile information and availability.</p>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="expertise">Expertise & Languages</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-8">
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Share information about yourself and your therapeutic approach.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="aboutMe">About Me</Label>
                    <Textarea
                      id="aboutMe"
                      name="aboutMe"
                      placeholder="Share a brief introduction about yourself..."
                      className="min-h-[120px]"
                      value={formData.aboutMe}
                      onChange={handleInputChange}
                    />
                    <p className="text-sm text-muted-foreground">This will be displayed on your public profile.</p>
                    {errors.aboutMe && <p className="text-sm font-medium text-destructive">{errors.aboutMe}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="therapeuticApproach">My Therapeutic Approach</Label>
                    <Textarea
                      id="therapeuticApproach"
                      name="therapeuticApproach"
                      placeholder="Describe your therapeutic approach and methodologies..."
                      className="min-h-[120px]"
                      value={formData.therapeuticApproach}
                      onChange={handleInputChange}
                    />
                    <p className="text-sm text-muted-foreground">Explain your therapeutic philosophy and methods.</p>
                    {errors.therapeuticApproach && (
                      <p className="text-sm font-medium text-destructive">{errors.therapeuticApproach}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="communicationApproach">My Communication Approach</Label>
                    <Textarea
                      id="communicationApproach"
                      name="communicationApproach"
                      placeholder="Describe how you communicate with clients..."
                      className="min-h-[120px]"
                      value={formData.communicationApproach}
                      onChange={handleInputChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Explain your communication style and what clients can expect.
                    </p>
                    {errors.communicationApproach && (
                      <p className="text-sm font-medium text-destructive">{errors.communicationApproach}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="professionalExperience">Professional Experience (Years)</Label>
                    <Input
                      id="professionalExperience"
                      name="professionalExperience"
                      type="number"
                      min="0"
                      value={formData.professionalExperience}
                      onChange={handleNumberChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the number of years of professional experience you have.
                    </p>
                    {errors.professionalExperience && (
                      <p className="text-sm font-medium text-destructive">{errors.professionalExperience}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseInformation">License Information</Label>
                    <Textarea
                      id="licenseInformation"
                      name="licenseInformation"
                      placeholder="Enter your license details, certifications, and qualifications..."
                      className="min-h-[100px]"
                      value={formData.licenseInformation}
                      onChange={handleInputChange}
                    />
                    <p className="text-sm text-muted-foreground">
                      Include your license number, issuing authority, and any relevant certifications.
                    </p>
                    {errors.licenseInformation && (
                      <p className="text-sm font-medium text-destructive">{errors.licenseInformation}</p>
                    )}
                  </div>

                  {errors.availability && (
    <p className="text-sm font-medium text-destructive">
      {errors.availability}
    </p>
  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expertise" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Expertise & Languages</CardTitle>
                  <CardDescription>
                    Specify your areas of expertise, communication modes, and languages.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Mental Health Expertise</Label>
                    <div className="flex items-center mt-2 mb-4">
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
                      <Button type="button" variant="outline" onClick={addExpertise} className="ml-2">
                        Add
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Press Enter or click Add after typing each expertise area.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.mentalHealthExpertise.map((expertise, index) => (
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
                    {errors.mentalHealthExpertise && (
                      <p className="text-sm font-medium text-destructive mt-2">{errors.mentalHealthExpertise}</p>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <div className="mb-4">
                      <Label>Available Communication Modes</Label>
                      <p className="text-sm text-muted-foreground">
                        Select the communication methods you offer to clients.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {communicationModes.map((mode) => (
                        <div
                          key={mode.id}
                          className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                        >
                          <Checkbox
                            id={`mode-${mode.id}`}
                            checked={formData.communicationModes.includes(mode.id)}
                            onCheckedChange={(checked) => handleCheckboxChange(mode.id, checked === true)}
                          />
                          <Label htmlFor={`mode-${mode.id}`} className="cursor-pointer">
                            {mode.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.communicationModes && (
                      <p className="text-sm font-medium text-destructive mt-2">{errors.communicationModes}</p>
                    )}
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <Label>Spoken Languages</Label>
                    <div className="flex items-center mt-2 mb-4">
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
                      <Button type="button" variant="outline" onClick={addLanguage} className="ml-2">
                        Add
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Press Enter or click Add after typing each language.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {formData.spokenLanguages.map((language, index) => (
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
                    {errors.spokenLanguages && (
                      <p className="text-sm font-medium text-destructive mt-2">{errors.spokenLanguages}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability" className="space-y-6">
  <Card>
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle>Availability</CardTitle>
          <CardDescription>Select your available hours for each day.</CardDescription>
        </div>
        <div className="space-y-2 w-64">
          <Label htmlFor="timeZone">Time Zone</Label>
          <Select
            value={formData.timeZone}
            onValueChange={(value) => setFormData(prev => ({ ...prev, timeZone: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your time zone">
                {formData.timeZone ? timeZones.find(tz => tz.value === formData.timeZone)?.label : "Select time zone"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {timeZones.map((zone) => (
                <SelectItem key={zone.value} value={zone.value}>
                  {zone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.timeZone && <p className="text-sm font-medium text-destructive">{errors.timeZone}</p>}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        {daysOfWeek.map((day) => {
          // Find existing availability for this day
          const dayAvailability = formData.availability.find(a => a.day === day) || { day, hours: [] };
          const selectedHours = dayAvailability.hours || [];

          return (
            <div key={day} className="space-y-3">
              <h4 className="font-medium">{day}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0') + ':00';
                  const isSelected = selectedHours.includes(hour);
                  
                  return (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => {
                        setFormData(prev => {
                          // Find or create the day's availability
                          const dayIndex = prev.availability.findIndex(a => a.day === day);
                          let newAvailability = [...prev.availability];
                          
                          if (dayIndex === -1) {
                            // Add new day
                            newAvailability.push({
                              day,
                              hours: [hour]
                            });
                          } else {
                            // Toggle hour selection
                            const currentHours = newAvailability[dayIndex].hours || [];
                            const updatedHours = isSelected
                              ? currentHours.filter(h => h !== hour)
                              : [...currentHours, hour].sort();
                            
                            newAvailability[dayIndex] = {
                              ...newAvailability[dayIndex],
                              hours: updatedHours
                            };
                            
                            // Remove day if no hours selected
                            if (updatedHours.length === 0) {
                              newAvailability = newAvailability.filter(a => a.day !== day);
                            }
                          }
                          
                          return {
                            ...prev,
                            availability: newAvailability
                          };
                        });
                      }}
                      className={`
                        p-2 border rounded-md text-center text-sm
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'hover:bg-accent hover:text-accent-foreground'}
                        transition-colors
                      `}
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>
  </Card>
</TabsContent>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Tabs>
      </div>
    </div>
  )
}