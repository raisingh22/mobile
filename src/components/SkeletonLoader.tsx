import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useThemeColors } from '../theme/colors';

interface SkeletonLoaderProps {
  shape?: 'circle' | 'textLine' | 'rect';
  width?: number | string;
  height?: number;
  style?: ViewStyle | ViewStyle[];
}

export function SkeletonLoader({
  shape = 'rect',
  width = '100%',
  height,
  style,
}: SkeletonLoaderProps) {
  const colors = useThemeColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  const skeletonColor = colors.cardHover;

  // Resolve shape styling
  const shapeStyle: ViewStyle = {};
  let resolvedHeight = height;

  if (shape === 'circle') {
    const size = typeof width === 'number' ? width : 48;
    shapeStyle.width = size;
    shapeStyle.height = size;
    shapeStyle.borderRadius = size / 2;
  } else if (shape === 'textLine') {
    shapeStyle.width = width as any;
    shapeStyle.height = height ?? 14;
    shapeStyle.borderRadius = 6;
    shapeStyle.marginVertical = 4;
  } else {
    // rect
    shapeStyle.width = width as any;
    shapeStyle.height = height ?? 48;
    shapeStyle.borderRadius = 10;
  }

  if (resolvedHeight !== undefined && shape !== 'circle') {
    shapeStyle.height = resolvedHeight;
  }

  return (
    <Animated.View
      style={[
        styles.base,
        {
          backgroundColor: skeletonColor,
          opacity,
        },
        shapeStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
