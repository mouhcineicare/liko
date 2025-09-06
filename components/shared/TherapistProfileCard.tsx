"use client"

import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Clock, Languages, Award, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TherapistProfileCardProps {
  profile?: {
    id: string
    fullName: string
    image?: string
    specialties?: string[]
    summary?: string
    professionalExperience?: number
    spokenLanguages?: string[]
    timeZone?: string
    level?: number
  }
  isLoading?: boolean
}

export default function TherapistProfileCard({ profile, isLoading }: TherapistProfileCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 animate-pulse h-full flex flex-col">
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-start space-x-4">
            <div className="rounded-full bg-gray-200 h-16 w-16"></div>
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="flex flex-wrap gap-2">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start space-x-4">
          <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.fullName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full bg-gray-100">
                <div className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{profile.fullName}</h3>
            {profile.level && profile.level >= 2 && (
              <div className="flex items-center mt-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span className="text-xs font-medium text-gray-600">Experienced Therapist</span>
              </div>
            )}
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {profile.summary || 'Professional therapist dedicated to providing quality mental health care.'}
            </p>
            
            {(profile.specialties && profile.specialties.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.specialties.slice(0, 3).map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center">
              <Award className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
              <span>{profile.professionalExperience}+ years</span>
          </div>
          
          <div className="flex items-center">
              <Languages className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />
              <span className="truncate">{profile?.spokenLanguages?.slice(0, 2).join(', ') || 'English'}</span>
            </div>
        </div>
      </div>
      
      {/* Fixed position button at bottom */}
      <div className="p-4 border-t border-gray-100 mt-auto">
        <Link href={`/therapist-profiles/${profile.id}/${profile.fullName.toLowerCase().replace(/\s+/g, '-')}`}>
          <Button variant="outline" className="w-full">
            View Profile
          </Button>
        </Link>
      </div>
    </div>
  )
}