import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import { Balance } from "@/lib/db/models"
import Appointment from "@/lib/db/models/Appointment"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get user's balance
    const balance = await Balance.findOne({ user: session.user.id })
    
    // Get user's recent appointments
    const appointments = await Appointment.find({ 
      patient: session.user.id 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('_id price status payment isBalance totalSessions completedSessions createdAt')

    return NextResponse.json({
      userId: session.user.id,
      balance: balance ? {
        balanceAmount: balance.balanceAmount,
        historyCount: balance.history?.length || 0,
        recentHistory: balance.history?.slice(-3) || []
      } : null,
      recentAppointments: appointments.map(apt => ({
        _id: apt._id,
        price: apt.price,
        status: apt.status,
        isBalance: apt.isBalance,
        totalSessions: apt.totalSessions,
        completedSessions: apt.completedSessions,
        payment: apt.payment,
        createdAt: apt.createdAt
      }))
    })
  } catch (error) {
    console.error("Debug balance error:", error)
    return NextResponse.json({ 
      error: "Debug failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
