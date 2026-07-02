import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { useThemeColors } from '../theme/colors';

interface AvatarProps {
  source?: ImageSourcePropType | { uri: string };
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  status?: 'online' | 'offline' | 'busy' | 'away';
  style?: ViewStyle | ViewStyle[];
}

const AVATAR_COLORS = [
  '#4f46e5', // Indigo
  '#8b5cf6', // Violet
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#a855f7', // Purple
];

function getDeterministicColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  source,
  name = '',
  size = 'md',
  status,
  style,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const colors = useThemeColors();

  // Resolve pixel dimensions
  let avatarSize = 40;
  if (typeof size === 'number') {
    avatarSize = size;
  } else {
    switch (size) {
      case 'sm': avatarSize = 32; break;
      case 'md': avatarSize = 40; break;
      case 'lg': avatarSize = 56; break;
      case 'xl': avatarSize = 72; break;
    }
  }

  const hasImage = source && !imageError;
  const initials = getInitials(name);
  const initialsBgColor = getDeterministicColor(name);

  // Status Badge configurations
  const renderStatusBadge = () => {
    if (!status) return null;

    let badgeColor = colors.textDisabled;
    if (status === 'online') badgeColor = colors.success;
    if (status === 'offline') badgeColor = colors.textMuted;
    if (status === 'busy') badgeColor = colors.danger;
    if (status === 'away') badgeColor = colors.warning;

    const dotSize = Math.max(8, Math.round(avatarSize * 0.22));
    const borderSize = Math.max(1.5, Math.round(avatarSize * 0.05));

    return (
      <View
        style={[
          styles.statusDot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: badgeColor,
            borderColor: colors.card,
            borderWidth: borderSize,
            bottom: 0,
            right: 0,
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { width: avatarSize, height: avatarSize }, style]}>
      {hasImage ? (
        <Image
          source={source}
          style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
          onError={() => setImageError(true)}
        />
      ) : (
        <View
          style={[
            styles.fallbackContainer,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              backgroundColor: initialsBgColor,
            },
          ]}
        >
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.initials,
              {
                fontSize: Math.round(avatarSize * 0.4),
                color: '#ffffff',
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
      {renderStatusBadge()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '700',
    textAlign: 'center',
  },
  statusDot: {
    position: 'absolute',
  },
});
