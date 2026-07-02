import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export function EmptyState({
  title,
  description,
  icon = 'document-text-outline',
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, style]}>
      {/* Icon Wrapper */}
      <View style={[styles.iconWrapper, { backgroundColor: colors.cardHover }]}>
        <Ionicons name={icon} size={36} color={colors.textSecondary} />
      </View>

      {/* Texts */}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>

      {/* Optional CTA Button */}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
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
    paddingVertical: 36,
    paddingHorizontal: 24,
    width: '100%',
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  description: {
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
