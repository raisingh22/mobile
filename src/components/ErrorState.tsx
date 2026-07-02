import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle | ViewStyle[];
}

export function ErrorState({
  message,
  onRetry,
  title = 'Something went wrong',
  icon = 'alert-circle-outline',
  style,
}: ErrorStateProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      {/* Icon Ring */}
      <View style={[styles.iconWrapper, { backgroundColor: colors.dangerGlow }]}>
        <Ionicons name={icon} size={36} color={colors.danger} />
      </View>

      {/* Message Group */}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

      {/* Optional Action Button */}
      {onRetry ? (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="danger"
          size="sm"
          icon="refresh-outline"
          style={styles.btn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
  },
  iconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: 20,
  },
  btn: {
    alignSelf: 'center',
  },
});
