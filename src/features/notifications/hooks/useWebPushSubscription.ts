import { useState, useEffect } from 'react';

export function useWebPushSubscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        // Here you would normally subscribe to push manager and send token to backend
        // const registration = await navigator.serviceWorker.ready;
        // const subscription = await registration.pushManager.subscribe({ ... });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting push permission', error);
      return false;
    }
  };

  return { isSupported, permission, requestPermission };
}
