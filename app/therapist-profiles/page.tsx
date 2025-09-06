import TherapistProfilesList from '@/components/shared/TherapistProfileList'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Our Professional Therapists | Find Your Perfect Match',
  description: 'Browse our team of licensed therapists specializing in various mental health areas. Find the right professional for your needs.',
  keywords: ['therapists', 'mental health professionals', 'counselors', 'therapy', 'find therapist'],
  openGraph: {
    title: 'Our Therapist Team | Professional Mental Health Support',
    description: 'Meet our team of qualified therapists ready to support your mental health journey',
    images: [
      {
        url: '/images/therapists-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Team of professional therapists',
      },
    ],
  }
}

export default function TherapistProfilesPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Therapists</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our licensed professionals are here to support your mental health journey with personalized care.
          </p>
        </div>
        
        <TherapistProfilesList />
      </div>
    </div>
  )
}