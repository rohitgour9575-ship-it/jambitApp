module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-native-community|@react-native-google-signin|@react-native-async-storage|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|react-native-reanimated|react-native-worklets|react-native-svg|react-native-qrcode-svg|lucide-react-native|@tamagui|tamagui)/)',
  ],
};
