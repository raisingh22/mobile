import React, { useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';

export interface FilterChipOption {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selectedValues: any | any[];
  onChange: (value: any) => void;
  multiSelect?: boolean;
  style?: ViewStyle | ViewStyle[];
  contentContainerStyle?: ViewStyle;
}

function ChipItem({
  option,
  isSelected,
  onPress,
}: {
  option: FilterChipOption;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colors = useThemeColors();

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 40,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
    }).start();
  };

  const activeBg = colors.primaryGlow;
  const activeBorder = colors.primary;
  const activeText = colors.primary;

  const inactiveBg = colors.card;
  const inactiveBorder = colors.borderLight;
  const inactiveText = colors.textSecondary;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.chip,
          {
            backgroundColor: isSelected ? activeBg : inactiveBg,
            borderColor: isSelected ? activeBorder : inactiveBorder,
          },
        ]}
      >
        <View style={styles.row}>
          {option.icon ? (
            <Ionicons
              name={option.icon}
              size={14}
              color={isSelected ? activeText : inactiveText}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              {
                color: isSelected ? activeText : inactiveText,
                fontWeight: isSelected ? '700' : '500',
              },
            ]}
          >
            {option.label}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function FilterChips({
  options,
  selectedValues,
  onChange,
  multiSelect = false,
  style,
  contentContainerStyle,
}: FilterChipsProps) {
  const handlePress = (value: any) => {
    if (multiSelect) {
      const current = Array.isArray(selectedValues) ? selectedValues : [];
      if (current.includes(value)) {
        onChange(current.filter((v) => v !== value));
      } else {
        onChange([...current, value]);
      }
    } else {
      onChange(value);
    }
  };

  const checkIsSelected = (value: any) => {
    if (multiSelect) {
      return Array.isArray(selectedValues) && selectedValues.includes(value);
    }
    return selectedValues === value;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scrollView, style]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
    >
      {options.map((option) => (
        <ChipItem
          key={option.value}
          option={option}
          isSelected={checkIsSelected(option.value)}
          onPress={() => handlePress(option.value)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
