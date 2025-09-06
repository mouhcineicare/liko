import connectDB from "@/lib/db/connect";
import Appointment from "@/lib/db/models/Appointment";
import FeedBack from "@/lib/db/models/FeedBack";
import { NextRequest, NextResponse } from "next/server";

// GET - check if feedback alert should be shown
export async function GET(req: Request) {
    await connectDB();
  
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id') || null;
  
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
  
    const completedAppointment = await Appointment.findOne({
      patient: userId,
      status: "completed",
    });

    const existingFeedback = await FeedBack.countDocuments({ _id: userId });

    const showFeedbackPrompt = existingFeedback < 100;

    return NextResponse.json({ showFeedbackPrompt });
  }

// POST - submit feedback
export async function POST(req: NextRequest) {
  await connectDB();

  const { userId, fullName, rating, comment } = await req.json();

  if (!userId || !fullName || !rating || !comment) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const feedback = new FeedBack({ userId, fullName, rating, comment });
  await feedback.save();

  return NextResponse.json({ success: true });
}
