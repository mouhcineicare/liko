import { authOptions } from "@/lib/auth/config";
import connectDB from "@/lib/db/connect";
import FeedBack from "@/lib/db/models/FeedBack";
import User from "@/lib/db/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  
    await connectDB();
  
    try {
      const feedbacks = await FeedBack.find({})
        .sort({ createdAt: -1 })
        .populate('userId', 'email image status', User);
  
      return NextResponse.json(feedbacks);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      return NextResponse.json(
        { error: 'Failed to load feedbacks' },
        { status: 500 }
      );
    }
  }