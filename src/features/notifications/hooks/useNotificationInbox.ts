import { useState, useEffect, useCallback } from 'react';
import { NotificationPayload } from '../types/notification.types';
import { notificationInboxApi } from '../services/notification-inbox.api';

export function useNotificationInbox() {
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInbox = useCallback(async () => {
    try {
      const data = await notificationInboxApi.fetchNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => n.status !== 'READ').length);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    // In production, you might set up an SSE or WebSocket here for live updates
    const interval = setInterval(fetchInbox, 60000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await notificationInboxApi.markAsRead(id);
    } catch {
      fetchInbox(); // Revert on failure
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
    setUnreadCount(0);
    try {
      await notificationInboxApi.markAllAsRead();
    } catch {
      fetchInbox();
    }
  };

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, refresh: fetchInbox };
}
