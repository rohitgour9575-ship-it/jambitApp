import notifee, { AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  isDeviceRegisteredForRemoteMessages,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

export const notificationChannelId = 'jambit_updates';

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return notificationChannelId;

  return notifee.createChannel({
    id: notificationChannelId,
    name: 'Jambit updates',
    description: 'Event, group, friend and account updates from Jambit.',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
}

export async function requestPushPermission() {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }
  } else {
    const settings = await notifee.requestPermission();
    if (
      settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED &&
      settings.authorizationStatus !== AuthorizationStatus.PROVISIONAL
    ) {
      return false;
    }
  }

  const messaging = getMessaging();
  if (!isDeviceRegisteredForRemoteMessages(messaging)) {
    await registerDeviceForRemoteMessages(messaging);
  }

  await ensureNotificationChannel();
  return true;
}

export async function getCurrentPushToken() {
  const messaging = getMessaging();
  if (!isDeviceRegisteredForRemoteMessages(messaging)) {
    await registerDeviceForRemoteMessages(messaging);
  }
  return getToken(messaging);
}

export async function displayPushNotification(remoteMessage: RemoteMessage) {
  const title = String(remoteMessage.notification?.title || remoteMessage.data?.title || 'Jambit');
  const body = String(remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new update.');
  const channelId = await ensureNotificationChannel();

  await notifee.displayNotification({
    id: remoteMessage.messageId,
    title,
    body,
    data: remoteMessage.data,
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      smallIcon: 'ic_notification',
    },
    ios: {
      sound: 'default',
    },
  });
}

export function subscribeToForegroundPushes(
  listener?: (remoteMessage: RemoteMessage) => void,
) {
  return onMessage(getMessaging(), async (remoteMessage) => {
    await displayPushNotification(remoteMessage);
    listener?.(remoteMessage);
  });
}

export function subscribeToPushTokenRefresh(listener: (token: string) => void) {
  return onTokenRefresh(getMessaging(), listener);
}

export function subscribeToOpenedPushes(
  listener: (data: RemoteMessage['data']) => void,
) {
  const messaging = getMessaging();
  const unsubscribe = onNotificationOpenedApp(messaging, (remoteMessage) => listener(remoteMessage.data));
  getInitialNotification(messaging).then((remoteMessage) => {
    if (remoteMessage) listener(remoteMessage.data);
  });
  return unsubscribe;
}
