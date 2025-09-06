// app/api/therapistprofiles/[id]/route.ts
import { NextResponse } from 'next/server'
import connectDB from '@/lib/db/connect'
import User from '@/lib/db/models/User'
import TherapyProfile, { ITherapyProfile } from '@/lib/db/models/Therapy-profile'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid therapist ID' }, { status: 400 })
    }
    
    // Get the therapist
    const therapist = await User.findOne({
      _id: params.id,
      role: 'therapist',
      status: 'active'
    }).select('-password -email -telephone -verificationToken -verificationTokenExpires -resetToken -resetTokenExpiry -emailVerificationCode -emailVerificationCodeExpires -googleRefreshToken')

    if (!therapist) {
      return NextResponse.json({ error: 'Therapist not found or not active' }, { status: 404 })
    }

    // Get their therapy profile
    const therapyProfile = await TherapyProfile.findOne({
      therapyId: therapist._id.toString()
    })

    const therapistData = therapist.toObject()
    const therapyData: ITherapyProfile | null = therapyProfile?.toObject() || null

    if(!therapyData) {
      return NextResponse.json({ error: 'Therapist Profile not found or not active' }, { status: 404 })
    }
    
    const mergedData = {
      ...therapistData,
      ...therapyData,
      id: therapistData._id.toString(),
      therapyId: therapistData._id.toString(),
      // Merge specialties from both models
      specialties: therapistData.specialties || therapyData.mentalHealthExpertise || [],
      // Ensure professionalExperience comes from therapy if not in user
      professionalExperience: therapyData.professionalExperience || therapistData.professionalExperience || 0
    }

    return NextResponse.json({
      success: true,
      data: mergedData
    })
  } catch (error) {
    console.error('Error fetching therapist profile:', error)
    return NextResponse.json(
      { error: 'Failed to load therapist information' },
      { status: 500 }
    )
  }
}