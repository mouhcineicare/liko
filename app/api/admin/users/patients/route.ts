import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import User from "@/lib/db/models/User"
import PatientOnboarding from "@/lib/db/models/PatientOnboarding"
import Balance from "@/lib/db/models/Balance"
import { fixNegativeRemainingBalances } from '@/scripts/nageative-balance';
import { Types } from "mongoose"

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get("search") || ""
    const skipPagination = searchParams.get("skipPagination") === "true"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit
    const hasBalance = searchParams.get("hasBalance") === "true"

    await connectDB()

    try {
      await fixNegativeRemainingBalances().catch(err => {
        console.error('Error running balance fixer:', err)
      })
    } catch (error: any) {
      console.log('error updating balances')
    }

    // Build base query for patients
    let query: any = { role: "patient" }

    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i")
      query = {
        ...query,
        $or: [
          { fullName: searchRegex }, 
          { email: searchRegex }, 
          { telephone: searchRegex }
        ],
      }
    }

    // First get patient IDs with positive balance if needed
    let patientIdsWithBalance: Types.ObjectId[] = []
    if (hasBalance) {
      const balances = await Balance.find({
        $expr: { $gt: [{ $subtract: ["$totalSessions", "$spentSessions"] }, 0] }
      }, "user").lean()
      
      patientIdsWithBalance = balances.map(b => b.user)
      query = { ...query, _id: { $in: patientIdsWithBalance } }
    }

    // Get total count for pagination
    const totalPatients = await User.countDocuments(query)
    const findLimit = skipPagination ? Number.parseInt(searchParams.get("limit") || "50") : limit
    
    // Fetch patients with basic info
    const users = await User.find(query, "fullName email telephone createdAt status therapy image stripeCustomerId")
      .sort({ [skipPagination ? 'fullName' : 'createdAt']: skipPagination ? 1 : -1 })
      .skip(skipPagination ? 0 : skip)
      .limit(findLimit)

    const patientIds = users.map(p => p._id)

    // Fetch balances for these patients
    const balances = await Balance.find(
      { user: { $in: patientIds } },
      "user totalSessions spentSessions history payments"
    ).populate({
      path: 'history.plan',
      select: 'title'
    }).lean()

    // Create a map of patientId to balance for quick lookup
    const balanceMap = new Map(
      balances.map(b => [b.user.toString(), b])
    )

    // Calculate remaining sessions per patient
    const patientsWithBalances = users.map(user => {
      const balance = balanceMap.get(user._id.toString())
      const remainingSessions = balance 
        ? balance.totalSessions - balance.spentSessions
        : 0

      return {
        ...user.toObject(),
        balance: {
          totalSessions: balance?.totalSessions || 0,
          spentSessions: balance?.spentSessions || 0,
          remainingSessions: remainingSessions > 0 ? remainingSessions : 0,
          history: balance?.history || [],
          payments: balance?.payments || [],
        }
      }
    })

    return NextResponse.json({
      patients: patientsWithBalances,
      ...(skipPagination
        ? { total: users.length }
        : {
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(totalPatients / limit),
              totalPatients,
              hasNextPage: page < Math.ceil(totalPatients / limit),
              hasPrevPage: page > 1,
            }
          }
      )
    })
  } catch (error) {
    console.error("Error fetching patients:", error)
    return NextResponse.json({ 
      error: "Error fetching patients",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}


export async function POST(request: Request) {
  try {
    const { email, fullName, password, telephone, therapy } = await request.json()

    if (!email || !fullName || !password) {
      return NextResponse.json({ error: "Email, full name and password are required" }, { status: 400 })
    }

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    // Create new patient
    const newPatient = await User.create({
      role: "patient",
      email,
      fullName,
      password,
      telephone: telephone || "",
      status: "active",
      emailVerified: false,
      therapy: new Types.ObjectId(therapy.toString()) || null, // Set therapy if provided
    })

    // Create empty onboarding record
    await PatientOnboarding.create({
      patient: newPatient._id,
      responses: [],
    })

    return NextResponse.json({ message: "Patient created successfully", patient: newPatient }, { status: 201 })
  } catch (error) {
    console.error("Error creating patient:", error)
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: "GET, OPTIONS",
    },
  })
}

