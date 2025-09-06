import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import TherapistPayoutInfo from "@/lib/db/models/TherapistPayoutInfo"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const therapistId = params.id
    if (!therapistId) {
      return NextResponse.json({ error: "Therapist ID is required" }, { status: 400 })
    }

    await connectDB()

    // Get the payout info for the therapist
    const payoutInfo = await TherapistPayoutInfo.findOne({ therapist: therapistId })
      .populate('therapist', 'name email')
      .lean()
      .exec()

    if (!payoutInfo) {
      return NextResponse.json({
        payoutInfo: null,
        message: "No payout information found for this therapist",
      })
    }

    return NextResponse.json({
      payoutInfo,
    })
  } catch (error) {
    console.error("Error fetching therapist payout info:", error)
    return NextResponse.json({ error: "Error fetching therapist payout information" }, { status: 500 })
  }
}