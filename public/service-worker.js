// In your service-worker.js
self.addEventListener('notificationclick', (event) => {
  if (event.action === 'reply') {
    // Handle reply action
    clients.openWindow(`/messages/reply?messageId=${event.notification.data.messageId}`);
  } else if (event.action === 'markRead') {
    // Handle mark as read
    markMessageAsRead(event.notification.data.messageId);
  } else {
    // Default click behavior
    clients.openWindow('/messages');
  }
  event.notification.close();
});