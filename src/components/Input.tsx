import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TextInputProps,
  Animated, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  onIconRightPress?: () => void;
  hint?: string;
}

export function Input({
  label,
  error,
  icon,
  iconRight,
  onIconRightPress,
  hint,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1, duration: 200, useNativeDriver: false,
    }).start();
    props.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0, duration: 150, useNativeDriver: false,
    }).start();
    props.onBlur?.({} as any);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? colors.danger : colors.border, error ? colors.danger : colors.primary],
  });

  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, error ? 0.25 : 0.3],
  });

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[
          styles.label,
          { color: colors.textSecondary },
          isFocused && !error && { color: colors.primary }
        ]}>
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.container,
          {
            borderColor,
            backgroundColor: colors.surface,
            shadowColor: error ? colors.danger : colors.primary,
            shadowOpacity
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={isFocused ? colors.primary : colors.textMuted}
            style={styles.iconLeft}
          />
        ) : null}

        <TextInput
          style={[styles.input, { color: colors.text }, icon && styles.inputWithIcon]}
          placeholderTextColor={colors.textDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {iconRight ? (
          onIconRightPress ? (
            <TouchableOpacity onPress={onIconRightPress} style={styles.iconRightBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={iconRight} size={17} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name={iconRight} size={17} color={colors.textMuted} style={styles.iconRight} />
          )
        ) : null}
      </Animated.View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 0,
  },
  iconLeft: { marginRight: 10 },
  iconRight: { marginLeft: 8 },
  iconRightBtn: { marginLeft: 8, padding: 2 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 11,
    fontWeight: '400',
  },
  inputWithIcon: { paddingLeft: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 },
  errorText: { fontSize: 12, fontWeight: '500' },
  hint: { fontSize: 11, marginTop: 4 },
});
