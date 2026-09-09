import React from 'react';
import { authApi } from '../services/auth.api';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({ isOpen, onExtend, onLogout }) => {
  if (!isOpen) return null;

  const handleExtend = async () => {
    try {
      await authApi.refreshToken();
      onExtend();
    } catch {
      onLogout();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center">
        <svg className="w-12 h-12 mx-auto text-orange-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <h3 className="text-xl font-bold text-gray-900">Session Expiring</h3>
        <p className="text-sm text-gray-500 mt-2">Your secure session will expire soon due to inactivity.</p>
        <div className="mt-6 flex space-x-3">
          <button onClick={onLogout} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium transition-colors">Sign Out</button>
          <button onClick={handleExtend} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors">Extend Session</button>
        </div>
      </div>
    </div>
  );
};
