import React from 'react';
import { NotificationPayload } from '../types/notification.types';

interface NotificationCardProps {
  notification: NotificationPayload;
  onClick: (notification: NotificationPayload) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onClick }) => {
  const isUnread = notification.status !== 'READ';
  
  const getIcon = () => {
    switch(notification.eventType) {
      case 'CLAIM_APPROVED': return <span className="text-green-500">✓</span>;
      case 'CLAIM_FLAGGED_FOR_REVIEW': return <span className="text-yellow-500">⚠</span>;
      case 'CLAIM_REJECTED': return <span className="text-red-500">✕</span>;
      case 'VOUCHER_EXPIRING_SOON': return <span className="text-orange-500">⏱</span>;
      default: return <span className="text-blue-500">i</span>;
    }
  };

  return (
    <div 
      onClick={() => onClick(notification)}
      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 ${isUnread ? 'bg-blue-50/30' : ''}`}
    >
      <div className="flex-shrink-0 mt-1 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
          {notification.title}
        </h4>
        <p className={`text-sm mt-1 line-clamp-2 ${isUnread ? 'text-gray-600' : 'text-gray-500'}`}>
          {notification.body}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          {new Date(notification.createdAt).toLocaleDateString()}
        </p>
      </div>
      {isUnread && (
        <div className="flex-shrink-0">
          <span className="h-2 w-2 bg-blue-600 rounded-full inline-block"></span>
        </div>
      )}
    </div>
  );
};
