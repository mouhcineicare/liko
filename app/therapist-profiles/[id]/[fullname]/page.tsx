// app/therapist-profiles/[id]/[fullname]/page.tsx
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import TherapistProfileSection from '@/components/shared/TherapistProfileSection';

interface Props {
  params: { id: string; fullname: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/therapistprofiles/${params.id}`, {
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      return {
        title: 'Therapist Not Found',
        description: 'The requested therapist profile could not be found'
      }
    }

    const { data: therapist } = await response.json()

    return {
      title: `${therapist.fullName} | Professional Therapist`,
      description: therapist.aboutMe || therapist.summary || 
        `Professional profile of ${therapist.fullName}, specializing in ${therapist.specialties?.join(', ') || 
        therapist.mentalHealthExpertise?.join(', ') || 'mental health'}`,
      openGraph: {
        title: `${therapist.fullName} | Therapist Profile`,
        description: (therapist.aboutMe || therapist.summary || 
          `Learn more about therapist ${therapist.fullName}`).substring(0, 160),
        type: 'profile',
        images: therapist.image ? [{ url: therapist.image }] : undefined
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Therapist Profile',
      description: 'Professional therapist profile'
    }
  }
}

export default async function TherapistProfilePage({ params }: Props) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/therapistprofiles/${params.id}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
      notFound()
    }

    const { data: therapist } = await response.json()
    
    const fullProfile = {
      ...therapist,
      id: therapist.id || therapist._id,
      professionalExperience: therapist.professionalExperience || 0,
      summary: therapist.summary || '',
      therapeuticApproach: therapist.therapeuticApproach || '',
      communicationApproach: therapist.communicationApproach || '',
      mentalHealthExpertise: therapist.mentalHealthExpertise || therapist.specialties || [],
      communicationModes: therapist.communicationModes || [],
      spokenLanguages: therapist.spokenLanguages || [],
      licenseInformation: therapist.licenseInformation || '',
      timeZone: therapist.timeZone || 'Asia/Dubai',
      level: therapist.level || 1,
      availability: therapist.availability || [],
      specialties: therapist.specialties || therapist.mentalHealthExpertise || [],
      aboutMe: therapist.aboutMe || '',
    }

    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <TherapistProfileSection therapist={fullProfile} />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error fetching therapist data:', error)
    notFound()
  }
}