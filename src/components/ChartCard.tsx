import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useThemeColors } from '../theme/colors';
import { Card } from './Card';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type?: 'bar' | 'progress';
  data: ChartDataPoint[];
  loading?: boolean;
  empty?: boolean;
  variant?: 'default' | 'elevated' | 'glow';
  style?: ViewStyle | ViewStyle[];
}

function BarItem({
  item,
  percentage,
  colors,
}: {
  item: ChartDataPoint;
  percentage: number;
  colors: any;
}) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const activeColor = item.color ?? colors.primary;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: percentage,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const heightInterpolate = heightAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.barItemContainer}>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              height: heightInterpolate,
              backgroundColor: activeColor,
              shadowColor: activeColor,
            },
          ]}
        />
      </View>
      <Text numberOfLines={1} style={[styles.barLabel, { color: colors.textSecondary }]}>
        {item.label}
      </Text>
      <Text style={[styles.barValueText, { color: colors.text }]}>
        {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
      </Text>
    </View>
  );
}

export function ChartCard({
  title,
  subtitle,
  type = 'bar',
  data = [],
  loading = false,
  empty = false,
  variant = 'default',
  style,
}: ChartCardProps) {
  const colors = useThemeColors();

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card variant={variant} style={style}>
      {/* Title Header */}
      <View style={styles.header}>
        <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitleText, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <SkeletonLoader shape="rect" height={120} style={styles.skeleton} />
          <View style={styles.skeletonRow}>
            <SkeletonLoader shape="textLine" width="20%" />
            <SkeletonLoader shape="textLine" width="20%" />
            <SkeletonLoader shape="textLine" width="20%" />
            <SkeletonLoader shape="textLine" width="20%" />
          </View>
        </View>
      ) : empty || data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="No chart data"
            description="There is no analytics information to display right now."
            style={styles.emptyOverride}
          />
        </View>
      ) : type === 'bar' ? (
        <View style={styles.chartArea}>
          <View style={[styles.barsRow, { borderBottomColor: colors.borderLight }]}>
            {data.map((dp, idx) => {
              const pct = (dp.value / maxVal) * 100;
              return (
                <BarItem
                  key={idx}
                  item={dp}
                  percentage={pct}
                  colors={colors}
                />
              );
            })}
          </View>
        </View>
      ) : (
        /* Target Progress Bar Grouping */
        <View style={styles.progressArea}>
          {data.map((dp, idx) => {
            const pct = Math.min(1, dp.value / (dp.secondaryValue || 1));
            const barColor = dp.color ?? colors.primary;
            return (
              <View key={idx} style={styles.progressRow}>
                <View style={styles.progressLabels}>
                  <Text style={[styles.progressItemLabel, { color: colors.text }]}>
                    {dp.label}
                  </Text>
                  <Text style={[styles.progressItemVal, { color: colors.textSecondary }]}>
                    {dp.value} / {dp.secondaryValue}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: barColor,
                        width: `${pct * 100}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  subtitleText: {
    fontSize: 12,
    marginTop: 2,
  },
  loaderContainer: {
    height: 160,
    justifyContent: 'center',
  },
  skeleton: {
    borderRadius: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  emptyContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyOverride: {
    paddingVertical: 12,
  },
  chartArea: {
    height: 160,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    gap: 8,
  },
  barItemContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: 14,
    backgroundColor: '#cbd5e115',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
    width: '100%',
  },
  barValueText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  progressArea: {
    gap: 14,
    paddingVertical: 4,
  },
  progressRow: {
    width: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressItemLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressItemVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
