// app/api/migrations/therapist-ids/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import mongoose from "mongoose";

export async function POST() {
  try {
    await connectDB();

    // Find all users with string therapy values
    const users = await User.find({
      therapy: { $type: "string", $ne: null }
    });

    let migratedCount = 0;
    let errors = 0;

    for (const user of users) {
      try {
        if (mongoose.Types.ObjectId.isValid(user.therapy)) {
          await User.updateOne(
            { _id: user._id },
            { 
              $set: { 
                therapy: new mongoose.Types.ObjectId(user.therapy) 
              } 
            }
          );
          migratedCount++;
        } else {
          console.warn(`Invalid ObjectId for user ${user._id}: ${user.therapy}`);
          errors++;
        }
      } catch (error) {
        console.error(`Error migrating user ${user._id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Therapist ID migration completed",
      stats: {
        totalUsers: users.length,
        migratedCount,
        errors
      }
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}