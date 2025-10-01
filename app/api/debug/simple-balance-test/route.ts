import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import connectDB from "@/lib/db/connect"
import { Balance } from "@/lib/db/models"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { amount = 10 } = await req.json()

    await connectDB()

    // Get current balance
    let balance = await Balance.findOne({ user: session.user.id })
    if (!balance) {
      balance = new Balance({
        user: session.user.id,
        balanceAmount: 0
      })
    }

    const oldBalance = balance.balanceAmount
    console.log('Simple balance test - before update:', {
      userId: session.user.id,
      oldBalance,
      amountToAdd: amount
    })

    // Simple balance update
    balance.balanceAmount += amount
    balance.updatedAt = new Date()
    
    await balance.save()

    // Get updated balance from database
    const updatedBalance = await Balance.findOne({ user: session.user.id })

    console.log('Simple balance test - after update:', {
      userId: session.user.id,
      oldBalance,
      amountAdded: amount,
      newBalance: updatedBalance?.balanceAmount,
      success: updatedBalance?.balanceAmount === oldBalance + amount
    })

    return NextResponse.json({
      success: true,
      message: "Simple balance test completed",
      balance: {
        oldBalance,
        amountAdded: amount,
        newBalance: updatedBalance?.balanceAmount,
        wasUpdated: updatedBalance?.balanceAmount === oldBalance + amount
      }
    })
  } catch (error) {
    console.error("Simple balance test error:", error)
    return NextResponse.json({ 
      error: "Simple balance test failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
