// app/api/conversations/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import ChatMessage from '@/lib/db/models/ChatMessage';
import mongoose from 'mongoose';
import { pusherServer } from '@/lib/pusher-server';
import { normalizeConversationId } from '@/lib/utils/conversation';

interface Conversation {
  _id: {
    sender: mongoose.Types.ObjectId;
    receiver: mongoose.Types.ObjectId;
  };
  lastMessage: any;
  unreadCount: number;
  otherUser?: any;
  sender?: any;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  try {
    // Find all conversations where user is a participant
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { 'participants.0': new mongoose.Types.ObjectId(session.user.id) },
            { 'participants.1': new mongoose.Types.ObjectId(session.user.id) }
          ]
        }
      },
      {
        $sort: { createdAt: -1 } // Sort messages by date (newest first)
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' }, // Get the most recent message
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$receiver', new mongoose.Types.ObjectId(session.user.id)] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { participants: "$lastMessage.participants" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$_id", "$$participants"] },
                    { $ne: ["$_id", new mongoose.Types.ObjectId(session.user.id)] }
                  ]
                }
              }
            },
            { $project: { fullName: 1, image: 1, role: 1 } }
          ],
          as: 'otherUser'
        }
      },
      {
        $unwind: '$otherUser' // Convert the array to an object
      },
      {
        $project: {
          id: '$_id',
          otherUser: 1,
          lastMessage: {
            content: '$lastMessage.content',
            createdAt: '$lastMessage.createdAt',
            read: '$lastMessage.read'
          },
          unreadCount: 1,
          _id: 0
        }
      }
    ]);

    // Normalize conversation IDs
    const normalizedConversations = conversations.map(conv => {
      const normalizedId = normalizeConversationId(
        conv.id,
        session.user.id,
        session.user.role
      );
      
      return {
        ...conv,
        id: normalizedId
      };
    });

    return NextResponse.json({
      conversations: normalizedConversations,
      unreadTotal: normalizedConversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { receiverId, content } = await req.json();

  await connectDB();

  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    const participants = [session.user.id, receiverId].sort();
    const conversationId = participants.join('_');

    const message = new ChatMessage({
      conversationId,
      participants: participants.map(id => new mongoose.Types.ObjectId(id)),
      sender: new mongoose.Types.ObjectId(session.user.id),
      receiver: new mongoose.Types.ObjectId(receiverId),
      content
    });

    await message.save();

    const populatedMessage = await ChatMessage.populate(message, [
      { path: 'sender', select: 'fullName image role' },
      { path: 'receiver', select: 'fullName image role' }
    ]);

    // Trigger Pusher events
    await Promise.all([
      pusherServer.trigger(
        `conversation-${conversationId}`,
        'new-message',
        populatedMessage.toObject()
      ),
      pusherServer.trigger(
        `user-${session.user.id}`,
        'message-sent',
        populatedMessage.toObject()
      ),
      pusherServer.trigger(
        `user-${receiverId}`,
        'new-message-notification',
        {
          conversationId,
          sender: populatedMessage.sender,
          content: populatedMessage.content,
          unreadCount: 1
        }
      )
    ]);

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}