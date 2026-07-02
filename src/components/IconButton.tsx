import React, { useRef } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, shadows } from '../theme/colors';

interface IconButtonProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  iconSize?: number;
}

export function IconButton({
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  iconSize,
}: IconButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colors = useThemeColors();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 5,
    }).start();
  };

  const containerStyle: any[] = [styles.base];

  if (size === 'sm') containerStyle.push(styles.sm);
  if (size === 'md') containerStyle.push(styles.md);
  if (size === 'lg') containerStyle.push(styles.lg);

  if (variant === 'primary') {
    containerStyle.push({ backgroundColor: colors.primary }, shadows.primaryGlow);
  } else if (variant === 'secondary') {
    containerStyle.push({
      backgroundColor: colors.cardHover,
      borderWidth: 1,
      borderColor: colors.border,
    });
  } else if (variant === 'outline') {
    containerStyle.push({
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary,
    });
  } else if (variant === 'danger') {
    containerStyle.push({ backgroundColor: colors.danger }, shadows.dangerGlow);
  } else if (variant === 'ghost') {
    containerStyle.push({ backgroundColor: 'transparent' });
  }

  if (disabled || isLoading) {
    containerStyle.push(styles.disabled);
  }

  const iconColor =
    variant === 'outline' ? colors.primary :
    variant === 'ghost' ? colors.textSecondary :
    variant === 'secondary' ? colors.textSecondary : '#ffffff';

  const defaultIconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const resolvedIconSize = iconSize ?? defaultIconSize;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isLoading}
        activeOpacity={1}
        style={containerStyle}
      >
        {isLoading ? (
          <ActivityIndicator
            color={
              variant === 'outline' || variant === 'ghost' || variant === 'secondary'
                ? colors.primary
                : '#ffffff'
            }
            size={size === 'sm' ? 'small' : 'small'}
          />
        ) : (
          <Ionicons name={icon} size={resolvedIconSize} color={iconColor} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  md: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  lg: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
