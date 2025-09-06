import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Languages, Award, MessageSquare, Star, BookOpen, Shield, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface TherapistProfileSectionProps {
  therapist: {
    id: string
    fullName: string
    image?: string
    specialties?: string[]
    summary?: string
    aboutMe?: string
    therapeuticApproach?: string
    communicationApproach?: string
    professionalExperience?: number
    mentalHealthExpertise?: string[]
    communicationModes?: string[]
    spokenLanguages?: string[]
    licenseInformation?: string
    timeZone?: string
    level?: number
    availability?: {
      day: string
      hours?: string[]
    }[]
  }
}

export default function TherapistProfileSection({ therapist }: TherapistProfileSectionProps) {
  const formatAvailability = (availability: typeof therapist.availability) => {
    if (!availability || availability.length === 0) return "Not specified"
    
    const daysMap: Record<string, string> = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun"
    }

    // Filter out days with no hours or empty hours array
    const availableDays = availability.filter(day => 
      day.hours && day.hours.length > 0
    )

    if (availableDays.length === 0) return "Not specified"

    // Format the first available day's hours as an example
    const firstDay = availableDays[0]
    const dayName = daysMap[firstDay.day.toLowerCase()] || firstDay.day
    const hours = firstDay.hours?.join(', ') || ''

    // If only one day, show full info
    if (availableDays.length === 1) {
      return `${dayName}: ${hours}`
    }

    // If multiple days, show first day as example + count
    return `${dayName}: ${hours} (and ${availableDays.length - 1} more days)`
  }

  // Filter out empty fields for display
  const hasAvailability = therapist.availability?.some(day => 
    day.hours && day.hours.length > 0
  )

  const hasLanguages = therapist.spokenLanguages && therapist.spokenLanguages.length > 0
  const hasCommunicationModes = therapist.communicationModes && therapist.communicationModes.length > 0
  const hasExpertise = therapist.mentalHealthExpertise && therapist.mentalHealthExpertise.length > 0
  const hasSpecialties = therapist.specialties && therapist.specialties.length > 0

  return (
    <div className="divide-y divide-gray-200">
      {/* Header Section */}
      <div className="px-6 py-8 md:flex md:items-start md:space-x-8">
        <div className="flex-shrink-0 mb-6 md:mb-0">
          <div className="relative h-40 w-40 rounded-full overflow-hidden border-4 border-white shadow-lg">
            {therapist.image ? (
              <Image
                src={therapist.image}
                alt={therapist.fullName}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-gray-100">
                <div className="h-24 w-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Book Session Button */}
      <div className="w-full mt-4">
    <Link href={`/book-appointment?therapistId=${therapist.id}`} passHref>
    <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
      Book a Session
    </Button>
  </Link>
</div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">{therapist.fullName}</h1>
            {therapist.level && therapist.level >= 2 && (
              <Badge variant="default" className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>Experienced</span>
              </Badge>
            )}
          </div>
          
          {(hasSpecialties || hasExpertise) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(therapist.specialties || therapist.mentalHealthExpertise || []).map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          )}
          
          {(therapist.aboutMe || therapist.summary) && (
            <p className="mt-4 text-gray-600">{therapist.aboutMe || therapist.summary}</p>
          )}
          
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <Award className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Experience</p>
                <p className="text-gray-600">
                  {therapist.professionalExperience || 1}+ years
                </p>
              </div>
            </div>
            
            {therapist.timeZone && (
              <div className="flex items-center">
                <Globe className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Time Zone</p>
                  <p className="text-gray-600">{therapist.timeZone}</p>
                </div>
              </div>
            )}
            
            {hasLanguages && (
              <div className="flex items-center">
                <Languages className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Languages</p>
                  <p className="text-gray-600">
                    {therapist?.spokenLanguages?.join(', ') || 'English'}
                  </p>
                </div>
              </div>
            )}
            
            {therapist.licenseInformation && (
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">License</p>
                  <p className="text-gray-600">{therapist.licenseInformation}</p>
                </div>
              </div>
            )}

            {hasAvailability && (
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Availability</p>
                  <p className="text-gray-600">
                    {formatAvailability(therapist.availability)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* About Me Section */}
      {therapist.aboutMe && (
        <div className="px-6 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">About Me</h2>
          <p className="text-gray-700 whitespace-pre-line">{therapist.aboutMe}</p>
        </div>
      )}
      
      {/* Therapeutic Approach */}
      {therapist.therapeuticApproach && (
        <div className="px-6 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Therapeutic Approach</h2>
          <p className="text-gray-700 whitespace-pre-line">{therapist.therapeuticApproach}</p>
        </div>
      )}
      
      {/* Communication Style */}
      {therapist.communicationApproach && (
        <div className="px-6 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Communication Style</h2>
          <p className="text-gray-700 whitespace-pre-line">{therapist.communicationApproach}</p>
        </div>
      )}
      
      {/* Expertise */}
      {(therapist.mentalHealthExpertise && therapist.mentalHealthExpertise.length > 0) && (
        <div className="px-6 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Areas of Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {therapist.mentalHealthExpertise.map((expertise) => (
              <Badge key={expertise} variant="outline" className="text-sm py-1 px-3">
                {expertise}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Communication Modes */}
      {(therapist.communicationModes && therapist.communicationModes.length > 0) && (
        <div className="px-6 py-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Communication Options</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {therapist.communicationModes.map((mode) => (
              <div key={mode} className="flex items-center bg-gray-50 p-3 rounded-lg">
                <MessageSquare className="h-5 w-5 text-gray-500 mr-3" />
                <span className="font-medium text-gray-700">{mode}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}