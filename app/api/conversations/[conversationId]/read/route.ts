// app/api/conversations/[conversationId]/read/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import ChatMessage from '@/lib/db/models/ChatMessage';
import mongoose from 'mongoose';
import { pusherServer } from '@/lib/pusher-server';
import { normalizeConversationId } from '@/lib/utils/conversation';

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Normalize conversation ID
  const normalizedId = normalizeConversationId(
    params.conversationId,
    session.user.id,
    session.user.role
  );

  await connectDB();

  try {
    const [patientId, therapistId] = normalizedId.split('_');
    
    // Verify participants
    const isPatient = session.user.role === 'patient' && session.user.id === patientId;
    const isTherapist = session.user.role === 'therapist' && session.user.id === therapistId;
    
    if (!isPatient && !isTherapist) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

       // Get unread messages before updating
      const unreadMessages = await ChatMessage.find({
      conversationId: normalizedId,
      receiver: session.user.id,
      read: false
      }).lean();

    const updateResult = await ChatMessage.updateMany(
      { 
        conversationId: normalizedId,
        receiver: session.user.id,
        read: false
      },
      { $set: { read: true } }
    );

    // Only trigger Pusher event if messages were actually updated
    if (updateResult.modifiedCount > 0) {
      // Get the other participant ID
      const otherParticipantId = normalizedId.split('_').find(id => id !== session.user.id);

      // Trigger read receipt event
      await pusherServer.trigger(
        `conversation-${params.conversationId}`,
        'messages-read',
        {
          readerId: session.user.id,
          messageIds: unreadMessages.map(msg => msg._id),
          readAt: new Date().toISOString()
        }
      );

      // Notify the other participant
      if (otherParticipantId) {
        await pusherServer.trigger(
          `user-${otherParticipantId}`,
          'messages-read-notification',
          {
            conversationId: params.conversationId,
            readerId: session.user.id,
            readCount: updateResult.modifiedCount
          }
        );
      }
    }

    return NextResponse.json({ 
      success: true,
      readCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}

async function fetchUnreadCounts(userId: string) {
  const results = await ChatMessage.aggregate([
    {
      $match: {
        receiver: new mongoose.Types.ObjectId(userId),
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

  return {
    totalCount: results.reduce((sum, curr) => sum + curr.count, 0),
    conversations: results.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {} as Record<string, number>)
  };
}