import { NextResponse } from 'next/server';
import { Notification } from '@/lib/db/models';
import connectDB from '@/lib/db/connect';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function POST(request: Request) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { notificationId, markAll } = await request.json();

    // Validate input
    if (!notificationId && !markAll) {
      return NextResponse.json(
        { error: 'Either notificationId or markAll must be provided' },
        { status: 400 }
      );
    }

    if (notificationId) {
      // Mark single notification as read
      const updated = await Notification.findOneAndUpdate(
        {
          _id: notificationId,
          userId: session.user.id // Ensure user owns the notification
        },
        { isRead: true },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          { error: 'Notification not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, notification: updated });
    } else {
      // Mark all notifications as read for this user
      const result = await Notification.updateMany(
        {
          userId: session.user.id,
          isRead: false
        },
        { $set: { isRead: true } }
      );

      return NextResponse.json({
        success: true,
        markedCount: result.modifiedCount
      });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}