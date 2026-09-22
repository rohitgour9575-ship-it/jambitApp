import { apiRequest } from './client';
import type { JambitNotification } from '../types';

export function getNotifications(token: string) {
  return apiRequest<{ notifications: JambitNotification[]; unreadCount: number }>('/notifications', { token });
}

export function registerPushDevice(
  token: string,
  body: { token: string; platform: 'android' | 'ios'; deviceName?: string; appVersion?: string },
) {
  return apiRequest<{ registered: boolean; deviceId: string }>('/notifications/devices', {
    method: 'POST',
    token,
    body,
  });
}

export function removePushDevice(token: string, pushToken?: string) {
  return apiRequest<{ removed: boolean }>('/notifications/devices', {
    method: 'DELETE',
    token,
    body: pushToken ? { token: pushToken } : {},
  });
}

export function markNotificationRead(token: string, notificationId: string) {
  return apiRequest<{ notification: JambitNotification }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
  });
}

export function markAllNotificationsRead(token: string) {
  return apiRequest<{ updated: boolean; unreadCount: number }>('/notifications/read-all', {
    method: 'POST',
    token,
  });
}
