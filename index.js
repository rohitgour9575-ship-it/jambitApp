/**
 * @format
 */
/* global globalThis */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import { name as appName } from './app.json';
import { displayPushNotification } from './src/notifications/pushNotifications';

setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  if (!remoteMessage.notification) {
    await displayPushNotification(remoteMessage);
  }
});

const createMatchMediaResult = () => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

const matchMedia = () => createMatchMediaResult();

if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = matchMedia;
}

if (typeof globalThis.window === 'object' && typeof globalThis.window.matchMedia !== 'function') {
  globalThis.window.matchMedia = matchMedia;
}

const App = require('./App').default;

AppRegistry.registerComponent(appName, () => App);
