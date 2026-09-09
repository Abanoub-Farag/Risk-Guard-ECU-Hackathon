import React from 'react';
import { useWebPushSubscription } from '../hooks/useWebPushSubscription';

export const PushPermissionBanner: React.FC = () => {
  const { isSupported, permission, requestPermission } = useWebPushSubscription();
  const [dismissed, setDismissed] = React.useState(false);

  if (!isSupported || permission !== 'default' || dismissed) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-100 p-4 relative z-40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          <p className="text-sm text-blue-800 font-medium">
            Enable browser notifications to receive instant updates when your prescription is approved.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setDismissed(true)} 
            className="px-3 py-1.5 text-sm text-blue-600 font-medium hover:bg-blue-100 rounded-md"
          >
            Not now
          </button>
          <button 
            onClick={requestPermission} 
            className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700"
          >
            Enable Notifications
          </button>
        </div>
      </div>
    </div>
  );
};
