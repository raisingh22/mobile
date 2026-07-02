import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/colors';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
  const colors = useThemeColors();

  const STATUS_MAP: Record<string, { color: string; bg: string; dot: string; label?: string }> = {
    // Order statuses
    PENDING:        { color: colors.warning, bg: colors.warningGlow, dot: colors.warning },
    IN_PROGRESS:    { color: colors.info, bg: colors.infoGlow, dot: colors.info, label: 'In Progress' },
    READY:          { color: colors.purple, bg: colors.purpleGlow, dot: colors.purple },
    DELIVERED:      { color: colors.success, bg: colors.successGlow, dot: colors.success },
    CANCELLED:      { color: colors.danger, bg: colors.dangerGlow, dot: colors.danger },
    // Appointment statuses
    SCHEDULED:      { color: colors.primary, bg: colors.primaryGlow, dot: colors.primary },
    CONFIRMED:      { color: colors.success, bg: colors.successGlow, dot: colors.success },
    COMPLETED:      { color: colors.textSecondary, bg: colors.cardHover, dot: colors.textMuted },
    NO_SHOW:        { color: colors.warning, bg: colors.warningGlow, dot: colors.warning, label: 'No Show' },
    WALK_IN:        { color: colors.purple, bg: colors.purpleGlow, dot: colors.purple, label: 'Walk-in' },
    // Payment
    PAID:           { color: colors.success, bg: colors.successGlow, dot: colors.success },
    UNPAID:         { color: colors.danger, bg: colors.dangerGlow, dot: colors.danger },
    PARTIALLY_PAID: { color: colors.warning, bg: colors.warningGlow, dot: colors.warning, label: 'Partial' },
    // Generic
    ACTIVE:         { color: colors.success, bg: colors.successGlow, dot: colors.success },
    INACTIVE:       { color: colors.danger, bg: colors.dangerGlow, dot: colors.danger },
    DONE:           { color: colors.success, bg: colors.successGlow, dot: colors.success },
    TODO:           { color: colors.danger, bg: colors.dangerGlow, dot: colors.danger },
  };

  const DEFAULT = { color: colors.textMuted, bg: colors.cardHover, dot: colors.textDisabled };

  const key = status?.toUpperCase() ?? '';
  const cfg = STATUS_MAP[key] ?? DEFAULT;
  const label = cfg.label ?? key.replace(/_/g, ' ');
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSm,
        { backgroundColor: cfg.bg, borderColor: cfg.color + '22' },
      ]}
    >
      <View style={[styles.dot, isSmall && styles.dotSm, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.text, isSmall && styles.textSm, { color: cfg.color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  badgeSm: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotSm: { width: 4, height: 4, borderRadius: 2 },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  textSm: { fontSize: 9 },
});
