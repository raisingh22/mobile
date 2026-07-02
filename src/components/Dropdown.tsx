import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';
import { BottomSheet } from './BottomSheet';

export interface DropdownOption {
  label: string;
  value: any;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: any;
  onChange: (value: any) => void;
  placeholder?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Dropdown({
  label,
  options,
  selectedValue,
  onChange,
  placeholder = 'Select option',
  error,
  icon,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useThemeColors();

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const handleSelect = (value: any) => {
    onChange(value);
    setIsOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={colors.textMuted}
            style={styles.iconLeft}
          />
        ) : null}

        <Text
          style={[
            styles.valueText,
            { color: selectedOption ? colors.text : colors.textDisabled },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>

        <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {/* Options Selector BottomSheet */}
      <BottomSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={label || 'Select Option'}
      >
        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const isSelected = option.value === selectedValue;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleSelect(option.value)}
                style={[
                  styles.optionItem,
                  { borderBottomColor: colors.borderLight },
                  isSelected && { backgroundColor: colors.primaryGlow },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? colors.primary : colors.text },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  iconLeft: {
    marginRight: 10,
  },
  valueText: {
    flex: 1,
    fontSize: 15,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionsList: {
    maxHeight: 300,
    width: '100%',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 15,
  },
});
