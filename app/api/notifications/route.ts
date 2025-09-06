import { NextResponse } from "next/server";
import connectDB from "@/lib/db/connect";
import { Notification } from "@/lib/db/models";

export async function GET(request: Request) {
  await connectDB();
  
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10);

  const unreadCount = await Notification.countDocuments({ 
    userId, 
    isRead: false 
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(request: Request) {
  await connectDB();
  
  const { userId, notificationId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  if (notificationId) {
    // Mark single notification as read
    await Notification.findByIdAndUpdate(notificationId, { isRead: true });
  } else {
    // Mark all notifications as read
    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } }
    );
  }

  return NextResponse.json({ success: true });
}