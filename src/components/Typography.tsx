import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { useThemeColors } from '../theme/colors';

export interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'bodySecondary' | 'caption' | 'muted';
  color?: string;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Typography({
  children,
  variant = 'body',
  color,
  weight,
  align = 'left',
  style,
  ...props
}: TypographyProps) {
  const themeColors = useThemeColors();

  const getVariantStyle = (): TextStyle => {
    switch (variant) {
      case 'h1':
        return {
          fontSize: 28,
          fontWeight: '700',
          lineHeight: 34,
          color: themeColors.text,
          letterSpacing: -0.5,
        };
      case 'h2':
        return {
          fontSize: 22,
          fontWeight: '700',
          lineHeight: 28,
          color: themeColors.text,
          letterSpacing: -0.3,
        };
      case 'h3':
        return {
          fontSize: 18,
          fontWeight: '600',
          lineHeight: 24,
          color: themeColors.text,
          letterSpacing: -0.1,
        };
      case 'subtitle':
        return {
          fontSize: 15,
          fontWeight: '500',
          lineHeight: 20,
          color: themeColors.textSecondary,
        };
      case 'body':
        return {
          fontSize: 14,
          fontWeight: '400',
          lineHeight: 20,
          color: themeColors.text,
        };
      case 'bodySecondary':
        return {
          fontSize: 14,
          fontWeight: '400',
          lineHeight: 20,
          color: themeColors.textSecondary,
        };
      case 'caption':
        return {
          fontSize: 12,
          fontWeight: '400',
          lineHeight: 16,
          color: themeColors.textMuted,
        };
      case 'muted':
        return {
          fontSize: 11,
          fontWeight: '400',
          lineHeight: 14,
          color: themeColors.textDisabled,
        };
      default:
        return {
          fontSize: 14,
          color: themeColors.text,
        };
    }
  };

  const getWeightStyle = (): TextStyle => {
    if (!weight) return {};
    switch (weight) {
      case 'normal':
        return { fontWeight: '400' };
      case 'medium':
        return { fontWeight: '500' };
      case 'semibold':
        return { fontWeight: '600' };
      case 'bold':
        return { fontWeight: '700' };
      default:
        return {};
    }
  };

  const combinedStyles = StyleSheet.flatten([
    getVariantStyle(),
    getWeightStyle(),
    align && { textAlign: align },
    color && { color },
    style,
  ]);

  return (
    <Text style={combinedStyles} {...props}>
      {children}
    </Text>
  );
}
