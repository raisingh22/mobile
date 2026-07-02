import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';
import { Card } from './Card';

export interface StatCardItem {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface StatisticCardProps {
  title: string;
  value?: string | number;
  progress?: number; // Value between 0 and 1
  progressColor?: string;
  items?: StatCardItem[];
  variant?: 'default' | 'elevated' | 'glow';
  style?: ViewStyle | ViewStyle[];
}

export function StatisticCard({
  title,
  value,
  progress,
  progressColor,
  items = [],
  variant = 'default',
  style,
}: StatisticCardProps) {
  const colors = useThemeColors();

  const resolvedProgressColor = progressColor ?? colors.primary;

  return (
    <Card variant={variant} style={style}>
      {/* Title Header */}
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      
      {/* Primary Value (if provided) */}
      {value !== undefined ? (
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      ) : null}

      {/* Progress Bar Component */}
      {progress !== undefined ? (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: resolvedProgressColor,
                  width: `${Math.min(100, Math.max(0, progress * 100))}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressFooter}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Target Progress</Text>
            <Text style={[styles.progressVal, { color: colors.text }]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      ) : null}

      {/* Secondary Stats Grid */}
      {items.length > 0 ? (
        <View style={[styles.grid, progress !== undefined && styles.gridSpacing]}>
          {items.map((item, index) => {
            const iconColor = item.color ?? colors.textSecondary;
            return (
              <View
                key={index}
                style={[
                  styles.gridItem,
                  { borderLeftColor: colors.borderLight },
                  index % 2 !== 0 && styles.gridItemRight,
                ]}
              >
                <View style={styles.itemHeader}>
                  {item.icon ? (
                    <Ionicons name={item.icon} size={14} color={iconColor} style={styles.itemIcon} />
                  ) : null}
                  <Text numberOfLines={1} style={[styles.itemLabel, { color: colors.textMuted }]}>
                    {item.label}
                  </Text>
                </View>
                <Text style={[styles.itemValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  gridSpacing: {
    marginTop: 18,
    borderTopWidth: 1.2,
    borderTopColor: '#cbd5e120',
    paddingTop: 12,
  },
  gridItem: {
    width: '50%',
    paddingVertical: 4,
    paddingLeft: 8,
    borderLeftWidth: 1.5,
    marginBottom: 8,
  },
  gridItemRight: {
    paddingLeft: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemIcon: {
    marginRight: 4,
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
