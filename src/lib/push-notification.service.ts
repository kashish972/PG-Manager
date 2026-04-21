const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

export async function requestPushPermission(): Promise<{ granted: boolean; error?: string }> {
  if (!('Notification' in window)) {
    return { granted: false, error: 'Push notifications not supported in this browser' };
  }

  if (Notification.permission === 'granted') {
    return { granted: true };
  }

  if (Notification.permission === 'denied') {
    return { granted: false, error: 'Push notifications blocked. Please enable in browser settings.' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted' };
  } catch (error: any) {
    return { granted: false, error: error.message || 'Failed to request permission' };
  }
}

export function getPushPermissionStatus(): 'granted' | 'denied' | 'default' | null {
  if (!('Notification' in window)) return null;
  return Notification.permission as 'granted' | 'denied' | 'default';
}

export async function showPushNotification(data: PushNotificationData): Promise<{ success: boolean; error?: string }> {
  if (!('Notification' in window)) {
    return { success: false, error: 'Push notifications not supported' };
  }

  if (Notification.permission !== 'granted') {
    const result = await requestPushPermission();
    if (!result.granted) {
      return { success: false, error: result.error || 'Permission denied' };
    }
  }

  try {
    new Notification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/notification-icon.png',
      badge: data.badge || '/icons/badge-icon.png',
      tag: data.tag || 'pg-manager-notification',
      data: data.data,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to show notification' };
  }
}

export function generatePushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  
  return navigator.serviceWorker.ready.then((registration) => {
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY || ''),
    });
  });
}

export function urlBase64ToUint8Array(base64String: string): any {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function unsubscribePush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}