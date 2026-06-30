import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

// ── Status config ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  SCHEDULED:  { label: 'Scheduled',  color: '#06b6d4', bg: '#06b6d418', icon: 'time-outline' },
  CONFIRMED:  { label: 'Confirmed',  color: '#10b981', bg: '#10b98118', icon: 'checkmark-circle-outline' },
  COMPLETED:  { label: 'Completed',  color: '#a1a1aa', bg: '#a1a1aa18', icon: 'checkmark-done-outline' },
  CANCELLED:  { label: 'Cancelled',  color: '#ef4444', bg: '#ef444418', icon: 'close-circle-outline' },
  NO_SHOW:    { label: 'No Show',    color: '#f97316', bg: '#f9731618', icon: 'alert-circle-outline' },
  WALK_IN:    { label: 'Walk-in',    color: '#a78bfa', bg: '#a78bfa18', icon: 'walk-outline' },
};

const TYPE_ICONS: Record<string, any> = {
  'Examination':     'eye-outline',
  'Frame Selection': 'glasses-outline',
  'Collection':      'bag-check-outline',
  'Follow-up':       'repeat-outline',
  'Walk-in':         'walk-outline',
};

// ── Calendar strip helpers ─────────────────────────────────────────
function buildDateStrip(centreDate: Date, range = 15) {
  const days: Date[] = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(centreDate);
    d.setDate(centreDate.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateKey(d: Date) {
  return d.toISOString().split('T')[0];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTime(iso: string) {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// ── Appointment card ───────────────────────────────────────────────
function AppointmentCard({ item, onPress }: { item: any; onPress: () => void }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.SCHEDULED;
  const typeIcon = TYPE_ICONS[item.type] ?? 'calendar-outline';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="bg-card border border-border rounded-2xl p-4 mb-3"
    >
      {/* Time + status row */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="bg-[#06b6d4]/10 w-10 h-10 rounded-xl items-center justify-center mr-3">
            <Ionicons name={typeIcon} size={18} color="#06b6d4" />
          </View>
          <View>
            <Text className="text-text font-bold text-base">{formatTime(item.scheduledAt)}</Text>
            <Text className="text-textMuted text-xs mt-0.5">{item.durationMinutes} min · {item.type}</Text>
          </View>
        </View>
        <View className="px-2.5 py-1 rounded-full flex-row items-center" style={{ backgroundColor: cfg.bg }}>
          <Ionicons name={cfg.icon} size={11} color={cfg.color} style={{ marginRight: 3 }} />
          <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
            {cfg.label}
          </Text>
        </View>
      </View>

      {/* Patient row */}
      <View className="flex-row items-center pt-3 border-t border-border">
        <View className="w-8 h-8 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/30 items-center justify-center mr-2.5">
          <Text className="text-[#a78bfa] font-bold text-[10px]">
            {item.customer?.fullName?.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-text font-semibold text-sm">{item.customer?.fullName}</Text>
          <View className="flex-row items-center mt-0.5">
            <Ionicons name="call-outline" size={11} color="#71717a" />
            <Text className="text-textMuted text-xs ml-1">{item.customer?.phone}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#374151" />
      </View>

      {item.notes ? (
        <View className="mt-2.5 pt-2.5 border-t border-border flex-row items-start">
          <Ionicons name="document-text-outline" size={12} color="#71717a" style={{ marginTop: 1 }} />
          <Text className="text-textMuted text-xs ml-1.5 flex-1" numberOfLines={2}>{item.notes}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────────
interface AppointmentsScreenProps {
  navigation: any;
}

export function AppointmentsScreen({ navigation }: AppointmentsScreenProps) {
  const insets = useSafeAreaInsets();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [refreshing, setRefreshing] = useState(false);
  const stripRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();

  const dateStrip = buildDateStrip(today);
  const selectedKey = toDateKey(selectedDate);

  const { data: appointments = [], isLoading, refetch } = useQuery<any>({
    queryKey: ['appointments', selectedKey],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.appointments.list, { params: { date: selectedKey } });
      return res.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Stats for selected day
  const confirmed = appointments.filter((a: any) => a.status === 'CONFIRMED').length;
  const completed = appointments.filter((a: any) => a.status === 'COMPLETED').length;
  const walkIns = appointments.filter((a: any) => a.status === 'WALK_IN').length;

  const isToday = toDateKey(selectedDate) === toDateKey(today);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="bg-card border-b border-border px-5 pb-3"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 20 }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text text-xl font-bold">Appointments</Text>
            <Text className="text-textMuted text-xs mt-0.5">
              {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddEditAppointment', {})}
            className="w-10 h-10 rounded-full bg-[#06b6d4] items-center justify-center"
            style={{ shadowColor: '#06b6d4', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Day stats strip */}
        {appointments.length > 0 && (
          <View className="flex-row mt-3 space-x-2" style={{ gap: 8 }}>
            <View className="flex-row items-center bg-[#10b981]/10 px-2.5 py-1 rounded-full">
              <Ionicons name="checkmark-circle-outline" size={11} color="#10b981" />
              <Text className="text-[#10b981] text-[10px] font-bold ml-1">{confirmed} Confirmed</Text>
            </View>
            <View className="flex-row items-center bg-[#a1a1aa]/10 px-2.5 py-1 rounded-full">
              <Ionicons name="checkmark-done-outline" size={11} color="#a1a1aa" />
              <Text className="text-textSecondary text-[10px] font-bold ml-1">{completed} Done</Text>
            </View>
            {walkIns > 0 && (
              <View className="flex-row items-center bg-[#a78bfa]/10 px-2.5 py-1 rounded-full">
                <Ionicons name="walk-outline" size={11} color="#a78bfa" />
                <Text className="text-[#a78bfa] text-[10px] font-bold ml-1">{walkIns} Walk-in</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Calendar Strip */}
      <View className="bg-card border-b border-border">
        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
          onLayout={() => {
            // Scroll to today (index 15)
            stripRef.current?.scrollTo({ x: 15 * 60 - 120, animated: false });
          }}
        >
          {dateStrip.map((date) => {
            const key = toDateKey(date);
            const isSelected = key === selectedKey;
            const isDayToday = key === toDateKey(today);
            const isSunday = date.getDay() === 0;

            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedDate(date)}
                className="items-center mx-1.5"
                style={{
                  width: 52,
                  paddingVertical: 8,
                  paddingHorizontal: 4,
                  borderRadius: 14,
                  backgroundColor: isSelected ? '#06b6d4' : isDayToday ? '#06b6d418' : 'transparent',
                  borderWidth: isDayToday && !isSelected ? 1 : 0,
                  borderColor: '#06b6d4',
                }}
              >
                <Text
                  className="text-[10px] font-bold uppercase"
                  style={{ color: isSelected ? '#fff' : isSunday ? '#ef4444' : '#71717a' }}
                >
                  {DAY_NAMES[date.getDay()]}
                </Text>
                <Text
                  className="text-lg font-bold mt-0.5"
                  style={{ color: isSelected ? '#fff' : isDayToday ? '#06b6d4' : '#e5e7eb' }}
                >
                  {date.getDate()}
                </Text>
                <Text
                  className="text-[9px] mt-0.5"
                  style={{ color: isSelected ? '#e0f7fa' : '#4b5563' }}
                >
                  {MONTH_NAMES[date.getMonth()]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Appointments List */}
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-textMuted mt-3 text-sm">Loading schedule...</Text>
        </View>
      ) : (
        <FlashList
          data={appointments}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }: { item: any }) => (
            <AppointmentCard
              item={item}
              onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.id })}
            />
          )}
          ListHeaderComponent={
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text font-bold text-sm">
                {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''}
                {isToday ? ' Today' : ''}
              </Text>
              {/* Walk-in FAB inline */}
              <TouchableOpacity
                onPress={() => navigation.navigate('AddEditAppointment', { walkIn: true })}
                className="flex-row items-center bg-[#a78bfa]/10 border border-[#a78bfa]/30 px-3 py-1.5 rounded-xl"
              >
                <Ionicons name="walk-outline" size={14} color="#a78bfa" />
                <Text className="text-[#a78bfa] text-xs font-bold ml-1.5">Walk-in</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <View className="w-20 h-20 rounded-full bg-border items-center justify-center mb-4">
                <Ionicons name="calendar-outline" size={36} color="#374151" />
              </View>
              <Text className="text-text font-semibold text-base mb-1">No Appointments</Text>
              <Text className="text-textMuted text-sm text-center px-8">
                {isToday
                  ? 'Nothing scheduled for today. Tap + to book or use Walk-in.'
                  : 'No appointments on this day.'}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddEditAppointment', {})}
                className="mt-5 bg-[#06b6d4] px-5 py-2.5 rounded-xl flex-row items-center"
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-white font-bold ml-1.5">Book Appointment</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}
