interface ApiNotification {
  _id: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResponse {
  notifications: ApiNotification[];
  unreadCount: number;
}

interface NotificationAction {
   actions: { action: string, title: string }[],
}

type PushNotificationOptions = {
  title: string;
  body: string;
  icon?: string;
  data?: {
    url?: string;
    notificationId?: string;
    [key: string]: any;
  };
  requireInteraction?: boolean;
  actions?: NotificationAction[];
};

/**
 * Pushes a notification to the browser if notifications are enabled
 */
export async function pushNotificationToBrowser(options: PushNotificationOptions): Promise<void> {
  try {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Try service worker first
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration?.showNotification) {
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/assets/icons/icare-logo.png',
          data: options.data,
          requireInteraction: options.requireInteraction
        });
        return;
      }
    }

    // Fallback to classic notifications
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      data: options.data
    });

    notification.onclick = () => {
      if (options.data?.url) {
        window.focus();
        window.location.href = options.data.url;
      }
      notification.close();
    };

  } catch (error) {
    console.error('Failed to push notification:', error);
  }
}

/**
 * Processes API notification data and pushes relevant notifications
 */
export async function processAndPushNotifications(
  responseData: NotificationResponse, 
  userId: string
): Promise<void> {
  try {
    const { notifications, unreadCount } = responseData;

    if (unreadCount === 0) return;

    // Get only unread notifications sorted by newest first
    const unreadNotifications = notifications
      .filter(n => !n.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (unreadNotifications.length === 0) return;

    // Show summary notification if multiple unread
    if (unreadNotifications.length > 1) {
      await pushNotificationToBrowser({
        title: `You have ${unreadCount} new notifications`,
        body: unreadNotifications[0].content,
        icon: '/assets/icons/icare-logo.png',
        data: {
          url: `/notifications`,
          userId
        },
        requireInteraction: true
      });
    } 
    // Show individual notification if only one
    else {
      await pushNotificationToBrowser({
        title: 'New Notification',
        body: unreadNotifications[0].content,
        icon: '/assets/icons/icare-logo.png',
        data: {
          url: `/notifications?id=${unreadNotifications[0]._id}`,
          notificationId: unreadNotifications[0]._id,
          userId
        }
      });
    }

  } catch (error) {
    console.error('Error processing notifications:', error);
  }
}

/**
 * Fetches notifications from API and pushes them to browser
 */
export async function fetchAndPushUserNotifications(userId: string): Promise<void> {
  try {
    const response = await fetch(`/api/notifications?userId=${userId}`);
    const data: NotificationResponse = await response.json();
    await processAndPushNotifications(data, userId);
  } catch (error) {
    console.error('Error fetching user notifications:', error);
  }
}