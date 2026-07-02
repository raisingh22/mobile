import React from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { useThemeColors } from '../theme/colors';

export function PullToRefresh(props: RefreshControlProps) {
  const colors = useThemeColors();

  return (
    <RefreshControl
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
      {...props}
    />
  );
}
