import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface CustomToastProps {
  text1?: string;
  text2?: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

function CustomToast({ text1, text2, type }: CustomToastProps) {
  const colors = useThemeColors();

  let accentColor = colors.primary;
  let bgGlow = colors.primaryGlow;
  let iconName: keyof typeof Ionicons.glyphMap = 'information-circle';

  if (type === 'success') {
    accentColor = colors.success;
    bgGlow = colors.successGlow;
    iconName = 'checkmark-circle';
  } else if (type === 'error') {
    accentColor = colors.danger;
    bgGlow = colors.dangerGlow;
    iconName = 'close-circle';
  } else if (type === 'warning') {
    accentColor = colors.warning;
    bgGlow = colors.warningGlow;
    iconName = 'warning';
  } else if (type === 'info') {
    accentColor = colors.info;
    bgGlow = colors.infoGlow;
    iconName = 'information-circle';
  }

  return (
    <View
      style={[
        styles.toastCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
        },
      ]}
    >
      {/* Accent Indicator Bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.contentRow}>
        {/* Status Icon Wrapper */}
        <View style={[styles.iconWrapper, { backgroundColor: bgGlow }]}>
          <Ionicons name={iconName} size={18} color={accentColor} />
        </View>

        {/* Text Details */}
        <View style={styles.textContainer}>
          {text1 ? (
            <Text numberOfLines={1} style={[styles.titleText, { color: colors.text }]}>
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text numberOfLines={2} style={[styles.descText, { color: colors.textSecondary }]}>
              {text2}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: any) => (
    <CustomToast text1={props.text1} text2={props.text2} type="success" />
  ),
  error: (props: any) => (
    <CustomToast text1={props.text1} text2={props.text2} type="error" />
  ),
  warning: (props: any) => (
    <CustomToast text1={props.text1} text2={props.text2} type="warning" />
  ),
  info: (props: any) => (
    <CustomToast text1={props.text1} text2={props.text2} type="info" />
  ),
};

const styles = StyleSheet.create({
  toastCard: {
    width: width - 32,
    maxWidth: 450,
    borderRadius: 14,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: Platform.OS === 'ios' ? 10 : 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  descText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
