import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';

import { useThemeColors } from '../theme/colors';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glow';
  noPadding?: boolean;
}

export function Card({ children, variant = 'default', noPadding = false, style, ...props }: CardProps) {
  const colors = useThemeColors();
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.card, borderColor: colors.border },
        !noPadding && styles.padded,
        variant === 'elevated' && styles.elevated,
        variant === 'glow' && styles.glow,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  padded: { padding: 20 },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    borderColor: '#06b6d430',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
});
