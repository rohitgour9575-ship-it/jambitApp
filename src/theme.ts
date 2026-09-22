import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

const fontFamilies = {
  regular: Platform.OS === 'android' ? 'Poppins-Regular' : undefined,
  medium: Platform.OS === 'android' ? 'Poppins-Medium' : undefined,
  semibold: Platform.OS === 'android' ? 'Poppins-SemiBold' : undefined,
  bold: Platform.OS === 'android' ? 'Poppins-Bold' : undefined,
};

export const fonts = {
  family: fontFamilies.regular,
  regular: fontFamilies.regular,
  medium: fontFamilies.medium,
  semibold: fontFamilies.semibold,
  bold: fontFamilies.bold,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '700',
  bold: '900',
} as const;

export const type = {
  hero: 40,
  h1: 30,
  h2: 24,
  h3: 19,
  body: 16,
  small: 13,
  tiny: 11,
};

export const appTextDefaults: TextStyle | undefined = fonts.family
  ? {
      fontFamily: fonts.family,
      includeFontPadding: true,
    }
  : undefined;

export const typography = {
  fonts,
  weights: fontWeights,
  sizes: type,
  defaultTextStyle: appTextDefaults,
  defaultInputStyle: appTextDefaults,
};

export const colors = {
  bg: '#fff8f0',
  surface: '#ffffff',
  cream: '#fff3e4',
  peachSoft: '#ffe7cf',
  pinkSoft: '#ffe3ef',
  ink: '#1f2937',
  text: '#374151',
  muted: '#7a6f68',
  line: '#f0ded3',
  softLine: '#f6eadf',
  brand: '#ff2e7a',
  orange: '#ffba00',
  coral: '#ff5c3d',
  purple: '#6b5cff',
  purpleSoft: '#eeeaff',
  green: '#22c55e',
  blackButton: '#1f2937',
  success: '#22c55e',
  warning: '#ff5c3d',
  gold: '#ffba00',
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 28,
  xl: 36,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const shadow = {
  card: {
    elevation: 2,
    shadowColor: '#9b4b22',
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  strong: {
    elevation: 8,
    shadowColor: '#9b4b22',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
  },
};
