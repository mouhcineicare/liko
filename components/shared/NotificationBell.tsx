"use client";

import { Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { pushNotificationToBrowser } from "@/lib/services/push-browser-notifications";

interface Notification {
  _id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${session?.user?.id}`);
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);

      // push to browser
      data.notifications.map((notif: Notification) => pushNotificationToBrowser({
          title: notif.content.substring(0, 20),
          body: notif.content,
          data: { url: '/' }
        }))
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          markAll: !notificationId
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
  
      // Refresh notifications after marking as read
      await fetchNotifications();
    } catch (error) {
      console.error('Error:', error);
      // Optionally show error to user
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={() => {
          setShowNotifications(!showNotifications);
          if (!showNotifications && unreadCount > 0) {
            markAsRead();
          }
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>
      
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg border z-50">
          <div className="p-2 border-b">
            <h3 className="font-medium">Notifications</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={cn(
                    "p-3 border-b hover:bg-gray-50 cursor-pointer",
                    !notification.isRead && "bg-blue-50"
                  )}
                  onClick={() => markAsRead(notification._id)}
                >
                  <p className="text-sm">{notification.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="p-2 border-t text-center">
              <button
                className="text-sm text-blue-600 hover:underline"
                onClick={() => markAsRead()}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}