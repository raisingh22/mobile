import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  Animated, View, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../theme/colors';

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

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const containerStyle: any[] = [styles.base];
  const textStyle: any[] = [styles.text];

  if (size === 'sm') { containerStyle.push(styles.sm); textStyle.push(styles.textSm); }
  if (size === 'lg') { containerStyle.push(styles.lg); textStyle.push(styles.textLg); }

  if (variant === 'primary') {
    containerStyle.push(styles.primary, shadows.primaryGlow);
  } else if (variant === 'secondary') {
    containerStyle.push(styles.secondary);
  } else if (variant === 'outline') {
    containerStyle.push(styles.outline);
    textStyle.push(styles.textCyan);
  } else if (variant === 'danger') {
    containerStyle.push(styles.danger, shadows.dangerGlow);
  } else if (variant === 'ghost') {
    containerStyle.push(styles.ghost);
    textStyle.push(styles.textMuted);
  }

  if (disabled || isLoading) {
    containerStyle.push(styles.disabled);
  }

  const iconColor =
    variant === 'outline' ? '#06b6d4' :
    variant === 'ghost' ? '#94a3b8' : '#ffffff';

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
          <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#06b6d4' : '#ffffff'} size="small" />
        ) : (
          <View style={styles.row}>
            {icon && <Ionicons name={icon} size={17} color={iconColor} style={styles.iconLeft} />}
            <Text style={textStyle}>{title}</Text>
            {iconRight && <Ionicons name={iconRight} size={17} color={iconColor} style={styles.iconRight} />}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  lg: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: 18 },
  primary: { backgroundColor: '#06b6d4' },
  secondary: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#06b6d4' },
  danger: { backgroundColor: '#f43f5e' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  text: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  textSm: { fontSize: 13 },
  textLg: { fontSize: 17 },
  textCyan: { color: '#06b6d4' },
  textMuted: { color: '#94a3b8' },
});
