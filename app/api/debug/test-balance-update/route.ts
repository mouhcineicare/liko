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

    // Test balance update using the same logic as cancellation
    try {
      await Balance.findByIdAndUpdate(
        balance._id,
        {
          $inc: { balanceAmount: amount },
          $push: { 
            history: {
              action: "added",
              amount: amount,
              reason: `Test balance update - ${amount} AED added`,
              createdAt: new Date()
            }
          },
          $set: { updatedAt: new Date() }
        }
      )
      console.log('Test balance update successful')
    } catch (error) {
      console.error('Test balance update failed:', error)
      throw error
    }

    // Get updated balance
    const updatedBalance = await Balance.findOne({ user: session.user.id })

    return NextResponse.json({
      success: true,
      message: "Test balance update completed",
      balance: {
        oldBalance,
        amountAdded: amount,
        newBalance: updatedBalance?.balanceAmount,
        wasUpdated: updatedBalance?.balanceAmount === oldBalance + amount
      }
    })
  } catch (error) {
    console.error("Test balance update error:", error)
    return NextResponse.json({ 
      error: "Test balance update failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
