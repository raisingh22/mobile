import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, FlatList, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors } from '../../theme/colors';

const APPOINTMENT_TYPES = [
  { label: 'Examination',     icon: 'eye-outline',       color: '#06b6d4' },
  { label: 'Frame Selection', icon: 'glasses-outline',   color: '#a78bfa' },
  { label: 'Collection',      icon: 'bag-check-outline', color: '#10b981' },
  { label: 'Follow-up',       icon: 'repeat-outline',    color: '#f59e0b' },
  { label: 'Walk-in',         icon: 'walk-outline',      color: '#f97316' },
];

const DURATIONS = [15, 30, 45, 60, 90];

function pad2(n: number) { return String(n).padStart(2, '0'); }

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nowTime() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

interface AddEditAppointmentScreenProps {
  route: any;
  navigation: any;
}

export function AddEditAppointmentScreen({ route, navigation }: AddEditAppointmentScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { appointment, walkIn } = route.params ?? {};
  const isEdit = !!appointment;
  const queryClient = useQueryClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(appointment?.customerId ?? '');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>(appointment?.customer?.fullName ?? '');
  const [selectedType, setSelectedType] = useState<string>(appointment?.type ?? (walkIn ? 'Walk-in' : 'Examination'));
  const [date, setDate] = useState<string>(
    appointment?.scheduledAt ? appointment.scheduledAt.split('T')[0] : todayIso()
  );
  const [time, setTime] = useState<string>(
    appointment?.scheduledAt
      ? (() => { const d = new Date(appointment.scheduledAt); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; })()
      : nowTime()
  );
  const [duration, setDuration] = useState<number>(appointment?.durationMinutes ?? 30);
  const [notes, setNotes] = useState<string>(appointment?.notes ?? '');
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: allCustomersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.customers.list, { params: { limit: 200 } });
      return res.data;
    },
  });
  const allCustomers: any[] = allCustomersData?.data ?? [];
  const filteredCustomers = allCustomers.filter((c) =>
    c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const payload = {
        customerId: selectedCustomerId,
        scheduledAt,
        durationMinutes: duration,
        type: selectedType,
        notes: notes || undefined,
      };
      if (isEdit) {
        return axiosClient.patch(ENDPOINTS.appointments.update(appointment.id), payload);
      }
      return axiosClient.post(ENDPOINTS.appointments.create, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Toast.show({
        type: 'success',
        text1: isEdit ? 'Appointment Updated' : 'Appointment Booked',
        text2: `${selectedCustomerName} — ${date} at ${time}`,
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Failed';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
      setIsSubmitting(false);
    },
  });

  const canSubmit = selectedCustomerId && date && time;

  const handleSubmit = () => {
    if (!canSubmit) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please select customer, date, and time.' });
      return;
    }
    setIsSubmitting(true);
    mutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* Header */}
      <View
        className="bg-card border-b border-border px-5 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 16 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-border items-center justify-center"
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Ionicons name="calendar-outline" size={15} color="#06b6d4" />
          <Text className="text-text text-base font-bold ml-2">
            {isEdit ? 'Reschedule' : walkIn ? 'Walk-in' : 'Book Appointment'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || !canSubmit}
          className="px-4 py-1.5 rounded-xl"
          style={{ backgroundColor: canSubmit ? colors.primary : colors.border }}
        >
          {isSubmitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className="font-bold text-sm" style={{ color: canSubmit ? '#fff' : colors.textSecondary }}>
                {isEdit ? 'Save' : 'Book'}
              </Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* ── Customer picker ── */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-[#a78bfa]/10 items-center justify-center mr-2">
              <Ionicons name="person-outline" size={14} color="#a78bfa" />
            </View>
            <Text className="text-text font-bold text-sm">Patient</Text>
            {!selectedCustomerId && <Text className="text-[#ef4444] text-xs ml-1">*</Text>}
          </View>
          <TouchableOpacity
            onPress={() => setCustomerModalVisible(true)}
            className="bg-card border rounded-xl px-4 py-3 flex-row items-center justify-between"
            style={{ borderColor: selectedCustomerId ? colors.primary : colors.border }}
          >
            {selectedCustomerId ? (
              <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 items-center justify-center mr-2.5">
                  <Text className="text-[#06b6d4] font-bold text-xs">
                    {selectedCustomerName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text className="text-text font-semibold text-sm">{selectedCustomerName}</Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="search-outline" size={15} color={colors.textSecondary} />
                <Text className="text-textMuted text-sm ml-2">Search patient...</Text>
              </View>
            )}
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Appointment type ── */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-[#06b6d4]/10 items-center justify-center mr-2">
              <Ionicons name="medical-outline" size={14} color="#06b6d4" />
            </View>
            <Text className="text-text font-bold text-sm">Appointment Type</Text>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {APPOINTMENT_TYPES.map((t) => {
              const active = selectedType === t.label;
              return (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => setSelectedType(t.label)}
                  className="flex-row items-center px-3 py-2 rounded-xl border"
                  style={{
                    backgroundColor: active ? t.color + '18' : 'transparent',
                    borderColor: active ? t.color : colors.border,
                  }}
                >
                  <Ionicons name={t.icon as any} size={13} color={active ? t.color : colors.textSecondary} />
                  <Text
                    className="text-xs font-semibold ml-2"
                    style={{ color: active ? t.color : colors.textSecondary }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-[#10b981]/10 items-center justify-center mr-2">
              <Ionicons name="calendar-outline" size={14} color="#10b981" />
            </View>
            <Text className="text-text font-bold text-sm">Date & Time</Text>
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1.5">Date</Text>
              <View className="bg-card border border-border rounded-xl px-3 py-2.5 flex-row items-center">
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <TextInput
                  className="flex-1 text-text text-sm ml-2"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={date}
                  onChangeText={setDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1.5">Time</Text>
              <View className="bg-card border border-border rounded-xl px-3 py-2.5 flex-row items-center">
                <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                <TextInput
                  className="flex-1 text-text text-sm ml-2"
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                  value={time}
                  onChangeText={setTime}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
        </View>

        <View className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-[#f59e0b]/10 items-center justify-center mr-2">
              <Ionicons name="hourglass-outline" size={14} color="#f59e0b" />
            </View>
            <Text className="text-text font-bold text-sm">Duration</Text>
          </View>
          <View className="flex-row" style={{ gap: 8 }}>
            {DURATIONS.map((d) => {
              const active = duration === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDuration(d)}
                  className="flex-1 items-center py-2.5 rounded-xl border"
                  style={{
                    backgroundColor: active ? colors.warningGlow : 'transparent',
                    borderColor: active ? colors.warning : colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: active ? colors.warning : colors.textSecondary }}
                  >
                    {d}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="bg-card border border-border rounded-2xl p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-[#71717a]/10 items-center justify-center mr-2">
              <Ionicons name="document-text-outline" size={14} color="#71717a" />
            </View>
            <Text className="text-text font-bold text-sm">Notes</Text>
          </View>
          <View className="bg-card border border-border rounded-xl px-3 py-2.5">
            <TextInput
              className="text-text text-sm"
              placeholder="Any notes for this appointment..."
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: 'top', minHeight: 70 }}
            />
          </View>
        </View>
      </ScrollView>

      <Modal visible={customerModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View className="bg-card rounded-t-3xl" style={{ maxHeight: '70%' }}>
            <View className="px-4 pt-4 pb-3 border-b border-border">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-text font-bold text-base">Select Patient</Text>
                <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View className="bg-card border border-border rounded-xl px-3 py-2 flex-row items-center">
                <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  className="flex-1 text-text text-sm ml-2"
                  placeholder="Search name..."
                  placeholderTextColor={colors.textSecondary}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  autoFocus
                />
              </View>
            </View>
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center bg-card border border-border rounded-xl px-4 py-3 mb-2"
                  onPress={() => {
                    setSelectedCustomerId(item.id);
                    setSelectedCustomerName(item.fullName);
                    setCustomerModalVisible(false);
                    setCustomerSearch('');
                  }}
                >
                  <View className="w-9 h-9 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 items-center justify-center mr-3">
                    <Text className="text-[#06b6d4] font-bold text-xs">
                      {item.fullName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-text font-semibold text-sm">{item.fullName}</Text>
                    <Text className="text-textMuted text-xs mt-0.5">{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="items-center py-10">
                  <Text className="text-textMuted text-sm">No patients found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
