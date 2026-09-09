import React from 'react';
import { NotificationPayload } from '../types/notification.types';
import { NotificationCard } from './NotificationCard';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationPayload[];
  onMarkAllRead: () => void;
  onNotificationClick: (notification: NotificationPayload) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ 
  isOpen, onClose, notifications, onMarkAllRead, onNotificationClick 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 max-w-sm w-full flex">
        <div className="w-full bg-white shadow-2xl flex flex-col notification-drawer-slide-in">
          
          <div className="px-4 py-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            <div className="flex items-center gap-4">
              <button onClick={onMarkAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                Mark all read
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>You have no notifications right now.</p>
              </div>
            ) : (
              notifications.map(notification => (
                <NotificationCard 
                  key={notification.id} 
                  notification={notification} 
                  onClick={onNotificationClick} 
                />
              ))
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};
