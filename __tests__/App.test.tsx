/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
  },
}));

jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
  },
}));

jest.mock('react-native-reanimated', () => {
  const ReactModule = require('react');
  const {View} = require('react-native');
  let animation: {delay: jest.Mock; duration: jest.Mock};
  animation = {
    delay: jest.fn(() => animation),
    duration: jest.fn(() => animation),
  };
  const AnimatedView = ReactModule.forwardRef(
    ({entering: _entering, exiting: _exiting, ...props}: any, ref: any) =>
      ReactModule.createElement(View, {...props, ref}),
  );

  return {
    __esModule: true,
    default: {View: AnimatedView},
    FadeInLeft: animation,
    FadeInRight: animation,
    FadeOutLeft: animation,
    FadeOutRight: animation,
  };
});

jest.mock('../src/notifications/pushNotifications', () => ({
  getCurrentPushToken: jest.fn(async () => null),
  requestPushPermission: jest.fn(async () => false),
  subscribeToForegroundPushes: jest.fn(() => jest.fn()),
  subscribeToOpenedPushes: jest.fn(() => jest.fn()),
  subscribeToPushTokenRefresh: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-screens', () => {
  const screens = jest.requireActual('react-native-screens');
  return {...screens, enableScreens: jest.fn()};
});

test('renders correctly', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  expect(renderer).not.toBeNull();

  ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});
