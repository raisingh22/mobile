import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';
import { Card } from './Card';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
  variant?: 'default' | 'elevated' | 'glow';
  onPress?: () => void;
  accentColor?: string;
  accentBg?: string;
}

export function KPICard({
  title,
  value,
  icon,
  trend,
  variant = 'default',
  onPress,
  accentColor,
  accentBg,
}: KPICardProps) {
  const colors = useThemeColors();

  const defaultAccentColor = colors.primary;
  const defaultAccentBg = colors.primaryGlow;

  const activeAccent = accentColor ?? defaultAccentColor;
  const activeBg = accentBg ?? defaultAccentBg;

  const content = (
    <View style={styles.cardContent}>
      {/* Top Header Row: Icon + Trend Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrapper, { backgroundColor: activeBg }]}>
          <Ionicons name={icon} size={20} color={activeAccent} />
        </View>

        {trend ? (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: trend.isPositive ? colors.successGlow : colors.dangerGlow,
              },
            ]}
          >
            <Ionicons
              name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={trend.isPositive ? colors.success : colors.danger}
              style={styles.trendIcon}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend.isPositive ? colors.success : colors.danger },
              ]}
            >
              {trend.value}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Metric Title & Value */}
      <View style={styles.metricsContainer}>
        <Text style={[styles.valueText, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.titleText, { color: colors.textSecondary }]}>{title}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <Card variant={variant} noPadding style={styles.cardOverride}>
          {content}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card variant={variant} noPadding style={styles.cardOverride}>
      {content}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardOverride: {
    marginBottom: 12,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendIcon: {
    marginRight: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsContainer: {
    marginTop: 4,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.1,
  },
});
