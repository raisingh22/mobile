import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  Animated, View, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, shadows } from '../theme/colors';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md' | 'lg';
  style?: any;
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className = '',
  icon,
  iconRight,
  size = 'md',
  style,
}: ButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colors = useThemeColors();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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
  const textStyle: any[] = [styles.text];

  if (size === 'sm') { containerStyle.push(styles.sm); textStyle.push(styles.textSm); }
  if (size === 'lg') { containerStyle.push(styles.lg); textStyle.push(styles.textLg); }

  if (variant === 'primary') {
    containerStyle.push({ backgroundColor: colors.primary }, shadows.primaryGlow);
    textStyle.push({ color: '#ffffff' });
  } else if (variant === 'secondary') {
    containerStyle.push({ backgroundColor: colors.cardHover, borderWidth: 1, borderColor: colors.border });
    textStyle.push({ color: colors.textSecondary });
  } else if (variant === 'outline') {
    containerStyle.push({ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary });
    textStyle.push({ color: colors.primary });
  } else if (variant === 'danger') {
    containerStyle.push({ backgroundColor: colors.danger }, shadows.dangerGlow);
    textStyle.push({ color: '#ffffff' });
  } else if (variant === 'ghost') {
    containerStyle.push({ backgroundColor: 'transparent' });
    textStyle.push({ color: colors.textMuted });
  }

  if (disabled || isLoading) {
    containerStyle.push(styles.disabled);
  }

  const iconColor =
    variant === 'outline' ? colors.primary :
    variant === 'ghost' ? colors.textMuted :
    variant === 'secondary' ? colors.textSecondary : '#ffffff';

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
          <ActivityIndicator color={variant === 'outline' || variant === 'ghost' || variant === 'secondary' ? colors.primary : '#ffffff'} size="small" />
        ) : (
          <View style={styles.row}>
            {icon && <Ionicons name={icon} size={size === 'sm' ? 14 : 17} color={iconColor} style={styles.iconLeft} />}
            <Text style={textStyle}>{title}</Text>
            {iconRight && <Ionicons name={iconRight} size={size === 'sm' ? 14 : 17} color={iconColor} style={styles.iconRight} />}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  lg: { paddingVertical: 16, paddingHorizontal: 26, borderRadius: 16 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  text: { fontWeight: '600', fontSize: 14, letterSpacing: 0.1 },
  textSm: { fontSize: 12 },
  textLg: { fontSize: 16 },
});
