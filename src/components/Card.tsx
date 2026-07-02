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

  const variantStyles =
    variant === 'glow'
      ? {
          borderColor: colors.borderGlow,
          shadowColor: colors.primary,
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 4,
        }
      : variant === 'elevated'
      ? {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: colors.backgroundSolid === '#090d16' ? 0.3 : 0.08,
          shadowRadius: 12,
          elevation: 6,
        }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: colors.backgroundSolid === '#090d16' ? 0.2 : 0.04,
          shadowRadius: 6,
          elevation: 2,
        };

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
        !noPadding && styles.padded,
        variantStyles,
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
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  padded: { padding: 18 },
});
