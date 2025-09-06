import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import connectDB from '@/lib/db/connect'
import { authOptions } from '@/lib/auth/config'
import AdminSettings from '@/lib/db/models/AdminSettings'

export async function GET() {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await AdminSettings.findOne()
    return NextResponse.json({ balanceRate: settings?.balanceRate || 0 })
  } catch (error) {
    console.error('Error fetching balance rate:', error)
    return NextResponse.json(
      { error: 'Error fetching balance rate' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB()
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { balanceRate } = await req.json()
    if (typeof balanceRate !== 'number' || balanceRate < 0) {
      return NextResponse.json(
        { error: 'Invalid balance rate value' },
        { status: 400 }
      )
    }

    const settings = await AdminSettings.findOneAndUpdate(
      {},
      { balanceRate },
      { upsert: true, new: true }
    )

    return NextResponse.json({ balanceRate: settings.balanceRate })
  } catch (error) {
    console.error('Error updating balance rate:', error)
    return NextResponse.json(
      { error: 'Error updating balance rate' },
      { status: 500 }
    )
  }
}