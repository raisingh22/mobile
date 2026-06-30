import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

const STATUS_MAP: Record<string, { color: string; bg: string; dot: string; label?: string }> = {
  // Order statuses
  PENDING:        { color: '#f59e0b', bg: '#f59e0b14', dot: '#f59e0b' },
  IN_PROGRESS:    { color: '#3b82f6', bg: '#3b82f614', dot: '#3b82f6', label: 'In Progress' },
  READY:          { color: '#a78bfa', bg: '#a78bfa14', dot: '#a78bfa' },
  DELIVERED:      { color: '#10b981', bg: '#10b98114', dot: '#10b981' },
  CANCELLED:      { color: '#f43f5e', bg: '#f43f5e14', dot: '#f43f5e' },
  // Appointment statuses
  SCHEDULED:      { color: '#06b6d4', bg: '#06b6d414', dot: '#06b6d4' },
  CONFIRMED:      { color: '#10b981', bg: '#10b98114', dot: '#10b981' },
  COMPLETED:      { color: '#64748b', bg: '#64748b14', dot: '#64748b' },
  NO_SHOW:        { color: '#f97316', bg: '#f9731614', dot: '#f97316', label: 'No Show' },
  WALK_IN:        { color: '#a78bfa', bg: '#a78bfa14', dot: '#a78bfa', label: 'Walk-in' },
  // Payment
  PAID:           { color: '#10b981', bg: '#10b98114', dot: '#10b981' },
  UNPAID:         { color: '#f43f5e', bg: '#f43f5e14', dot: '#f43f5e' },
  PARTIALLY_PAID: { color: '#f59e0b', bg: '#f59e0b14', dot: '#f59e0b', label: 'Partial' },
  // Generic
  ACTIVE:         { color: '#10b981', bg: '#10b98114', dot: '#10b981' },
  INACTIVE:       { color: '#f43f5e', bg: '#f43f5e14', dot: '#f43f5e' },
  DONE:           { color: '#10b981', bg: '#10b98114', dot: '#10b981' },
  TODO:           { color: '#f43f5e', bg: '#f43f5e14', dot: '#f43f5e' },
};

const DEFAULT = { color: '#94a3b8', bg: '#94a3b814', dot: '#94a3b8' };

export function StatusBadge({ status, className = '', size = 'md' }: StatusBadgeProps) {
  const key = status?.toUpperCase() ?? '';
  const cfg = STATUS_MAP[key] ?? DEFAULT;
  const label = cfg.label ?? key.replace(/_/g, ' ');
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSm,
        { backgroundColor: cfg.bg, borderColor: cfg.color + '44' },
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    gap: 5,
  },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 2 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: { width: 5, height: 5 },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textSm: { fontSize: 10 },
});
