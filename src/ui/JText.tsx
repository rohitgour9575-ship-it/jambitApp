import React from 'react';
import { Text, type TextProps } from '@tamagui/core';
import { fonts } from '../theme';

export function JText(props: TextProps) {
  return <Text fontFamily={fonts.family || '$body'} color="$color" {...props} />;
}
