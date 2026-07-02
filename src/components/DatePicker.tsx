import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/colors';
import { Modal } from './Modal';
import { format, addMonths, subMonths, startOfMonth, getDaysInMonth, getDay, isSameDay } from 'date-fns';

interface DatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  error?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const colors = useThemeColors();

  const handleDaySelect = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Generate days in month grid (42 cells)
  const generateCalendarDays = () => {
    const startOfCurrentMonth = startOfMonth(currentMonth);
    const totalDays = getDaysInMonth(currentMonth);
    const startDayOfWeek = getDay(startOfCurrentMonth); // 0 = Sun, 1 = Mon...
    
    const days: (Date | null)[] = [];
    
    // Fill previous month padding cells
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Fill current month days
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Fill next month padding cells to complete full grid rows (multiple of 7)
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => {
          setCurrentMonth(value || new Date());
          setIsOpen(true);
        }}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.valueText,
            { color: value ? colors.text : colors.textDisabled },
          ]}
        >
          {value ? format(value, 'PPP') : placeholder}
        </Text>

        <Ionicons name="calendar-outline" size={17} color={colors.textMuted} />
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {/* Custom Calendar Modal */}
      <Modal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={label || 'Select Date'}
      >
        {/* Calendar Nav Header */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          
          <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Week Day Labels Row */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((wd) => (
            <Text key={wd} style={[styles.weekDayText, { color: colors.textMuted }]}>
              {wd}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <FlatList
          data={calendarDays}
          numColumns={7}
          keyExtractor={(_, index) => index.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => {
            if (!item) {
              return <View style={styles.dayCellEmpty} />;
            }

            const isSelected = value && isSameDay(item, value);
            const isToday = isSameDay(item, new Date());

            return (
              <TouchableOpacity
                onPress={() => handleDaySelect(item)}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.primary },
                  !isSelected && isToday && { borderColor: colors.primary, borderWidth: 1.2 },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: colors.text },
                    isSelected && { color: '#ffffff', fontWeight: '700' },
                    !isSelected && isToday && { color: colors.primary, fontWeight: '700' },
                  ]}
                >
                  {item.getDate()}
                </Text>
              </TouchableOpacity>
            );
          }}
          style={styles.grid}
        />
      </Modal>
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
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    alignSelf: 'center',
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  dayCellEmpty: {
    width: 38,
    height: 38,
    margin: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
