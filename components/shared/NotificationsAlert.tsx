// components/NotificationAlert.tsx
import { useEffect, useState } from 'react';
import { requestNotificationPermission } from '@/lib/services/browser-notifications';

export const NotificationAlert = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkNotificationPermission = async () => {
      try {
        // Check if notifications are supported
        if (!('Notification' in window)) {
          setShowAlert(false);
          return;
        }

        // If already granted, don't show alert
        if (Notification.permission === 'granted') {
          setShowAlert(false);
          return;
        }

        // If previously denied, don't show alert
        if (Notification.permission === 'denied') {
          setShowAlert(false);
          return;
        }

        // If permission hasn't been requested yet, show alert
        setShowAlert(true);
      } catch (error) {
        console.error('Error checking notification permission:', error);
        setShowAlert(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkNotificationPermission();
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      setShowAlert(permission !== 'granted');
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setShowAlert(false);
    }
  };

  if (isChecking) return null;
  if (!showAlert) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Enable Notifications
            </h3>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <p>
                Get important updates by enabling browser notifications.
              </p>
            </div>
            <div className="mt-4 flex">
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Allow Notifications
              </button>
              <button
                type="button"
                onClick={() => setShowAlert(false)}
                className="ml-3 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};