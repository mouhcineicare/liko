// app/api/conversations/[conversationId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connect';
import ChatMessage from '@/lib/db/models/ChatMessage';
import mongoose from 'mongoose';
import { pusherServer } from '@/lib/pusher-server';

export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  try {
    const [participant1, participant2] = params.conversationId.split('_');
    if (![participant1, participant2].includes(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const messages = await ChatMessage.find({
      conversationId: params.conversationId
    })
    .sort({ createdAt: 1 }) // Changed to ascending order
    .populate([
      { path: 'sender', select: 'fullName image role' },
      { path: 'receiver', select: 'fullName image role' }
    ])
    .lean();

    return NextResponse.json({ 
      messages,
      hasMore: false
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { content } = await req.json();

  await connectDB();

  try {
    const [participant1, participant2] = params.conversationId.split('_');
    if (![participant1, participant2].includes(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const receiverId = participant1 === session.user.id ? participant2 : participant1;

    const message = new ChatMessage({
      conversationId: params.conversationId,
      participants: [participant1, participant2],
      sender: session.user.id,
      receiver: receiverId,
      content,
      read: false
    });

    await message.save();

    const populatedMessage = await ChatMessage.populate(message, [
      { path: 'sender', select: 'fullName image role' },
      { path: 'receiver', select: 'fullName image role' }
    ]);

    // Trigger Pusher events
    await Promise.all([
      pusherServer.trigger(
        `conversation-${params.conversationId}`,
        'new-message',
        populatedMessage.toObject()
      ),
      pusherServer.trigger(
        `user-${receiverId}`,
        'new-message-notification',
        {
          conversationId: params.conversationId,
          sender: populatedMessage.sender,
          content: populatedMessage.content,
          isUnread: true
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