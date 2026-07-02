import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, shadows } from '../theme/colors';

interface FABProps {
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle | ViewStyle[];
  visible?: boolean;
}

export function FAB({
  onPress,
  icon,
  label,
  variant = 'primary',
  style,
  visible = true,
}: FABProps) {
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;
  const colors = useThemeColors();

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [visible]);

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 40,
      bounciness: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 5,
    }).start();
  };

  const containerStyle: any[] = [styles.base];

  if (variant === 'primary') {
    containerStyle.push({ backgroundColor: colors.primary }, shadows.primaryGlow);
  } else if (variant === 'secondary') {
    containerStyle.push({
      backgroundColor: colors.cardHover,
      borderWidth: 1,
      borderColor: colors.border,
    });
  } else if (variant === 'danger') {
    containerStyle.push({ backgroundColor: colors.danger }, shadows.dangerGlow);
  }

  if (label) {
    containerStyle.push(styles.extended);
  } else {
    containerStyle.push(styles.circular);
  }

  const iconColor = variant === 'secondary' ? colors.textSecondary : '#ffffff';

  return (
    <Animated.View
      style={[
        styles.positionWrapper,
        {
          transform: [
            { scale: scaleAnim },
            { scale: pressScaleAnim },
          ],
          opacity: scaleAnim,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={containerStyle}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
        {label ? (
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: iconColor },
            ]}
          >
            {label}
          </Text>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  positionWrapper: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 99,
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    height: 56,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  circular: {
    width: 56,
    borderRadius: 28,
  },
  extended: {
    paddingHorizontal: 20,
    borderRadius: 28,
    gap: 8,
  },
  label: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
