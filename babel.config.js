module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'transform-inline-environment-variables',
      {
        include: ['EXPO_PUBLIC_API_BASE_URL', 'JAMBIT_API_BASE_URL'],
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
