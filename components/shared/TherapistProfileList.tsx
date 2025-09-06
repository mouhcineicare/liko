// components/ui/TherapistProfileList.tsx
"use client"

import { useState, useEffect } from "react"
import { Search, UserX, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import TherapistProfileCard from "./TherapistProfileCard"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TherapistProfile {
  id: string
  fullName: string
  image?: string
  summary?: string
  specialties?: string[]
  professionalExperience?: number
  spokenLanguages?: string[]
  timeZone?: string
  level?: number
}

export default function TherapistProfilesList() {
  const [profiles, setProfiles] = useState<TherapistProfile[]>([])
  const [filteredProfiles, setFilteredProfiles] = useState<TherapistProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [experienceFilter, setExperienceFilter] = useState<string>("all")

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/therapistprofiles")
        if (response.ok) {
          const { data } = await response.json()
          const processedData = data.map((profile: any) => ({
  id: profile.id || profile._id,
  fullName: profile.fullName || '',
  image: profile.image || '',
  summary: profile.summary || profile.aboutMe?.substring(0, 100) || '',
  specialties: profile.specialties || profile.mentalHealthExpertise || [],
  professionalExperience: profile.professionalExperience || 0, // This should now have the correct value
  spokenLanguages: profile.spokenLanguages || [],
  timeZone: profile.timeZone || 'Asia/Dubai',
  level: profile.level || 1,
  aboutMe: profile.aboutMe || '',
  therapeuticApproach: profile.therapeuticApproach || '',
  communicationApproach: profile.communicationApproach || '',
  communicationModes: profile.communicationModes || [],
  licenseInformation: profile.licenseInformation || '',
  availability: profile.availability || [],
}))
          
          setProfiles(processedData)
          setFilteredProfiles(processedData)
        }
      } catch (error) {
        console.error("Error fetching therapist profiles:", error)
      } finally {
        setTimeout(() => {
          setIsLoading(false)
        }, 1000)
      }
    }

    fetchProfiles()
  }, [])

  useEffect(() => {
    let filtered = [...profiles]
    
    // Apply search filter
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (profile) =>
          profile.fullName.toLowerCase().includes(term) ||
          (profile.specialties && profile.specialties.some((expertise) => 
            expertise.toLowerCase().includes(term))) ||
          (profile.spokenLanguages && profile.spokenLanguages.some((language) => 
            language.toLowerCase().includes(term)))
      )
    }
    
    // Apply experience filter
    if (experienceFilter !== "all") {
      const years = parseInt(experienceFilter)
      filtered = filtered.filter(
        (profile) => profile.professionalExperience && profile.professionalExperience >= years
      )
    }
    
    setFilteredProfiles(filtered)
  }, [searchTerm, profiles, experienceFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Our Therapists</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <Input disabled placeholder="Search therapists..." className="pl-10" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {/* <Select disabled value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
            </Select> */}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <TherapistProfileCard key={i} isLoading={true} />
          ))}
        </div>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
        <div className="bg-gray-100 p-6 rounded-full mb-4">
          <UserX className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Therapists Available</h3>
        <p className="text-gray-600 max-w-md mb-6">
          We don't have any therapist profiles available at the moment. Please check back later.
        </p>
        <Button className="bg-blue-600 hover:bg-blue-700">Contact Support</Button>
      </div>
    )
  }

  if (filteredProfiles.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Our Therapists</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search therapists..."
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            {/* <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experience</SelectItem>
                <SelectItem value="5">5+ years</SelectItem>
                <SelectItem value="10">10+ years</SelectItem>
                <SelectItem value="15">15+ years</SelectItem>
              </SelectContent>
            </Select> */}
          </form>
        </div>

        <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No Results Found</h3>
          <p className="text-gray-600 max-w-md mb-4">
            We couldn't find any therapists matching "{searchTerm}". Try different keywords or browse all therapists.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("")
              setExperienceFilter("all")
            }}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            View All Therapists
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Our Therapists</h2>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search therapists..."
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          {/* <Select value={experienceFilter} onValueChange={setExperienceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Experience</SelectItem>
              <SelectItem value="5">5+ years</SelectItem>
              <SelectItem value="10">10+ years</SelectItem>
              <SelectItem value="15">15+ years</SelectItem>
            </SelectContent>
          </Select> */}
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProfiles.map((profile) => (
          <TherapistProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  )
}