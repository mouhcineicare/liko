import { NextResponse } from 'next/server'
import User from '@/lib/db/models/User'
import connectDB from '@/lib/db/connect'
import { Types } from 'mongoose'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  await connectDB()

  try {
    // Find all patients where therapy field matches this therapist's ID
    const patients = await User.find(
      { 
        role: 'patient',
        therapy: new Types.ObjectId(params.id.toString()) 
      },
      { 
        fullName: 1,
        email: 1,
        image: 1,
        telephone: 1,
        therapy: 1
      }
    ).lean()

    return NextResponse.json({ patients })
  } catch (error) {
    console.error('Error fetching therapist patients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}