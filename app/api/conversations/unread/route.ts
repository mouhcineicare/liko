// app/api/conversations/unread/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import ChatMessage from '@/lib/db/models/ChatMessage';
import mongoose from 'mongoose';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized - No session or user ID' },
      { status: 401 }
    );
  }

  await connectDB();

  try {
    // First verify the user exists
    const User = mongoose.models.User || mongoose.model('User');
    const userExists = await User.findById(session.user.id).select('_id').lean();
    
    if (!userExists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const results = await ChatMessage.aggregate([
      {
        $match: {
          receiver: new mongoose.Types.ObjectId(session.user.id),
          read: false
        }
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCount = results.reduce((sum, curr) => sum + curr.count, 0);
    const conversations = results.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalCount,
      conversations,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}