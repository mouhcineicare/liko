/**
 * Checks if the browser supports notifications
 */
function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Checks if notification permissions have already been granted
 */
function isNotificationGranted(): boolean {
  return Notification.permission === 'granted';
}

/**
 * Checks if notification permissions have been denied
 */
function isNotificationDenied(): boolean {
  return Notification.permission === 'denied';
}

/**
 * Requests browser notification permission
 * @returns Promise that resolves to the permission status
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    // Check if browser supports notifications
    if (!isNotificationSupported()) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    // If already granted, return immediately
    if (isNotificationGranted()) {
      return 'granted';
    }

    // If previously denied, don't ask again
    if (isNotificationDenied()) {
      console.warn('Notification permission was previously denied');
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
    
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Shows a test notification if permissions are granted
 * @param title Notification title
 * @param options Notification options
 */
export async function showNotification(title: string, options?: NotificationOptions): Promise<void> {
  try {
    // Check if notifications are supported and granted
    if (!isNotificationSupported() || !isNotificationGranted()) {
      return;
    }

    // Show notification
    const serviceWorkerRegistration = await navigator.serviceWorker?.ready;
    if (serviceWorkerRegistration) {
      // If service worker is available (better for PWAs)
      serviceWorkerRegistration.showNotification(title, options);
    } else {
      // Fallback to regular notifications
      new Notification(title, options);
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}