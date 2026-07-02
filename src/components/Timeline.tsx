import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';

export interface TimelineEvent {
  key: string | number;
  title: string;
  timestamp: string;
  description?: string;
  status?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';
  icon?: keyof typeof Ionicons.glyphMap;
}

interface TimelineProps {
  events: TimelineEvent[];
  style?: ViewStyle | ViewStyle[];
}

export function Timeline({ events, style }: TimelineProps) {
  const colors = useThemeColors();

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'danger': return colors.danger;
      case 'info': return colors.info;
      case 'primary': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'success': return colors.successGlow;
      case 'warning': return colors.warningGlow;
      case 'danger': return colors.dangerGlow;
      case 'info': return colors.infoGlow;
      case 'primary': return colors.primaryGlow;
      default: return colors.cardHover;
    }
  };

  return (
    <View style={[styles.container, style]}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const color = getStatusColor(event.status);
        const bg = getStatusBg(event.status);

        return (
          <View key={event.key} style={styles.row}>
            {/* Timeline Line & Dot Column */}
            <View style={styles.indicatorColumn}>
              <View style={[styles.dotWrapper, { backgroundColor: bg, borderColor: color + '33' }]}>
                {event.icon ? (
                  <Ionicons name={event.icon} size={14} color={color} />
                ) : (
                  <View style={[styles.innerDot, { backgroundColor: color }]} />
                )}
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: colors.borderLight },
                  ]}
                />
              ) : null}
            </View>

            {/* Event Description Column */}
            <View style={styles.contentColumn}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {event.title}
                </Text>
                <Text style={[styles.timestamp, { color: colors.textMuted }]}>
                  {event.timestamp}
                </Text>
              </View>
              {event.description ? (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {event.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  indicatorColumn: {
    alignItems: 'center',
    width: 44,
  },
  dotWrapper: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
    zIndex: 1,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 4,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});
