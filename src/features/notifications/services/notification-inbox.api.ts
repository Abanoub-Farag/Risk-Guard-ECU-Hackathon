import { NotificationPayload } from '../types/notification.types';

export const notificationInboxApi = {
  async fetchNotifications(): Promise<NotificationPayload[]> {
    const res = await fetch('/api/v1/notifications', {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markAsRead(id: string): Promise<void> {
    const res = await fetch(`/api/v1/notifications/${id}/read`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to mark as read');
  },

  async markAllAsRead(): Promise<void> {
    const res = await fetch(`/api/v1/notifications/read-all`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to mark all as read');
  }
};
