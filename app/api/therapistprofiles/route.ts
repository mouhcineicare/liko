// app/api/therapistprofiles/route.ts
import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import User from '@/lib/db/models/User'
import TherapyProfile from '@/lib/db/models/Therapy-profile'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    
    // First get all active therapists
    const therapists = await User.find({
      role: 'therapist',
      status: 'active'
    }).select('-password -email -telephone -verificationToken -verificationTokenExpires -resetToken -resetTokenExpiry -emailVerificationCode -emailVerificationCodeExpires -googleRefreshToken')
    .sort({ level: -1, professionalExperience: -1 })

    if (!therapists.length) {
      return NextResponse.json({ error: 'No active therapists found' }, { status: 404 })
    }

    // Get all therapy profiles for these therapists using therapyId
    const therapistIds = therapists.map(t => t._id.toString())
    const therapyProfiles = await TherapyProfile.find({ 
      therapyId: { $in: therapistIds }
    })

    // Create a map for quick lookup
    const therapyProfileMap = new Map(
      therapyProfiles.map(profile => [profile.therapyId, profile.toObject()])
    )

    // Only include therapists that have a therapy profile
    const transformedData = therapists
      .filter(therapist => therapyProfileMap.has(therapist._id.toString()))
      .map(therapist => {
        const therapyData = therapyProfileMap.get(therapist._id.toString())!
        return {
          ...therapist.toObject(),
          ...therapyData,
          id: therapist._id.toString(),
          therapyId: therapist._id.toString(),
          professionalExperience: therapyData.professionalExperience || therapist.professionalExperience || 0
        }
      })

    if (transformedData.length === 0) {
      return NextResponse.json({ error: 'No therapists with complete profiles found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: transformedData
    })
  } catch (error) {
    console.error('Error fetching therapist profiles:', error)
    return NextResponse.json(
      { error: 'Failed to load therapist profiles' },
      { status: 500 }
    )
  }
}