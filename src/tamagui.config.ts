import { Dimensions } from 'react-native';
import { createTamagui, setupMatchMedia } from '@tamagui/core';
import { defaultConfig } from '@tamagui/config/v4';
import { colors, fonts } from './theme';

type NativeMediaDimensions = {
  width: number;
  height: number;
};

type NativeMediaEvent = {
  matches: boolean;
  media: string;
};

type NativeMediaListener = (event: NativeMediaEvent) => void;

function matchesNativeMediaQuery(query: string, dimensions: NativeMediaDimensions = Dimensions.get('window')) {
  const tests = [...query.matchAll(/\((min|max)-(width|height):\s*([0-9.]+)px\)/g)];

  if (!tests.length) {
    return false;
  }

  return tests.every(([, bound, axis, rawValue]) => {
    const current = axis === 'width' ? dimensions.width : dimensions.height;
    const target = Number(rawValue);

    return bound === 'min' ? current >= target : current <= target;
  });
}

function nativeMatchMedia(query: string) {
  const listeners = new Set<NativeMediaListener>();
  const getEvent = () => ({ matches: matchesNativeMediaQuery(query), media: query });
  const mediaQueryList = {
    media: query,
    onchange: null as NativeMediaListener | null,
    get matches() {
      return matchesNativeMediaQuery(query);
    },
    match(nextQuery: string, dimensions: NativeMediaDimensions) {
      return matchesNativeMediaQuery(nextQuery, dimensions);
    },
    addListener(listener: NativeMediaListener) {
      listeners.add(listener);
    },
    removeListener(listener: NativeMediaListener) {
      listeners.delete(listener);
    },
    addEventListener(_eventName: string, listener: NativeMediaListener) {
      listeners.add(listener);
    },
    removeEventListener(_eventName: string, listener: NativeMediaListener) {
      listeners.delete(listener);
    },
    dispatchEvent() {
      return false;
    },
  };

  Dimensions.addEventListener('change', () => {
    const event = getEvent();
    listeners.forEach((listener) => listener(event));
    mediaQueryList.onchange?.(event);
  });

  return mediaQueryList;
}

setupMatchMedia(nativeMatchMedia as any);

export const jambitDesign = {
  colors,
  fontFamily: fonts.family,
} as const;

const lightTheme = {
  ...defaultConfig.themes.light,
  background: jambitDesign.colors.bg,
  backgroundHover: jambitDesign.colors.cream,
  backgroundPress: jambitDesign.colors.peachSoft,
  color: jambitDesign.colors.ink,
  colorHover: jambitDesign.colors.text,
  colorPress: jambitDesign.colors.ink,
  borderColor: jambitDesign.colors.line,
  borderColorHover: jambitDesign.colors.softLine,
  shadowColor: '#9b4b22',
  brand: jambitDesign.colors.brand,
  orange: jambitDesign.colors.orange,
  coral: jambitDesign.colors.coral,
  purple: jambitDesign.colors.purple,
  green: jambitDesign.colors.green,
};

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  media: defaultConfig.media,
  themes: {
    ...defaultConfig.themes,
    light: lightTheme,
  },
} as any) as any;

export default tamaguiConfig;
