import { NativeModules, Platform } from 'react-native';

declare const process: {
  env: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    JAMBIT_API_BASE_URL?: string;
  };
};

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.JAMBIT_API_BASE_URL;
const productionApiBaseUrl = 'https://jambit.in/api';

function getMetroHost() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  if (!scriptUrl) return '';

  const match = scriptUrl.match(/^https?:\/\/([^/:]+)(?::\d+)?\//);
  return match?.[1] || '';
}

function getLocalApiBaseUrl() {
  // Android development uses adb reverse for both Metro and the local API.
  // A LAN-derived Metro host is unreliable on networks that isolate Wi-Fi clients.
  if (Platform.OS === 'android') {
    return 'http://127.0.0.1:5055/api';
  }

  const metroHost = getMetroHost();
  if (metroHost) {
    return `http://${metroHost}:5055/api`;
  }

  return 'http://localhost:5055/api';
}

export const appConfig = {
  brandName: 'JambIt',
  apiBaseUrl: configuredApiBaseUrl || (__DEV__ ? getLocalApiBaseUrl() : productionApiBaseUrl),
  apiTimeoutMs: 8000,
};
