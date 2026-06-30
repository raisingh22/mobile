import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';
import { CommunicationService } from '../../services/CommunicationService';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  SCHEDULED: { label: 'Scheduled', color: '#06b6d4', bg: '#06b6d418', icon: 'time-outline' },
  CONFIRMED: { label: 'Confirmed', color: '#10b981', bg: '#10b98118', icon: 'checkmark-circle-outline' },
  COMPLETED: { label: 'Completed', color: '#a1a1aa', bg: '#a1a1aa18', icon: 'checkmark-done-outline' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', bg: '#ef444418', icon: 'close-circle-outline' },
  NO_SHOW:   { label: 'No Show',   color: '#f97316', bg: '#f9731618', icon: 'alert-circle-outline' },
  WALK_IN:   { label: 'Walk-in',   color: '#a78bfa', bg: '#a78bfa18', icon: 'walk-outline' },
};

const TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  WALK_IN:   ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW:   ['SCHEDULED'],
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { date, time: `${h}:${m} ${ampm}` };
}

interface AppointmentDetailsScreenProps {
  route: any;
  navigation: any;
}

export function AppointmentDetailsScreen({ route, navigation }: AppointmentDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const { appointmentId } = route.params;
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.appointments.details(appointmentId));
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return axiosClient.patch(ENDPOINTS.appointments.update(appointmentId), { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setUpdatingStatus(null);
      Toast.show({ type: 'success', text1: 'Status Updated' });
    },
    onError: () => {
      setUpdatingStatus(null);
      Toast.show({ type: 'error', text1: 'Update Failed' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => axiosClient.delete(ENDPOINTS.appointments.delete(appointmentId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Toast.show({ type: 'success', text1: 'Appointment Deleted' });
      navigation.goBack();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Delete Failed' }),
  });

  const handleStatusChange = (status: string) => {
    setUpdatingStatus(status);
    statusMutation.mutate(status);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Appointment',
      'Are you sure you want to delete this appointment?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const handleWhatsAppReminder = () => {
    if (!appointment?.customer?.phone) {
      Toast.show({ type: 'error', text1: 'No Phone', text2: 'Customer has no phone number.' });
      return;
    }
    const { date, time } = formatDateTime(appointment.scheduledAt);
    const msg = `Hi ${appointment.customer.fullName}, this is a reminder for your upcoming ${appointment.type} appointment on ${date} at ${time}. Please let us know if you need to reschedule.`;
    CommunicationService.sendWhatsApp(appointment.customer.phone, msg);
  };

  const handleSMSReminder = () => {
    if (!appointment?.customer?.phone) {
      Toast.show({ type: 'error', text1: 'No Phone', text2: 'Customer has no phone number.' });
      return;
    }
    const { date, time } = formatDateTime(appointment.scheduledAt);
    const msg = `Reminder: Your ${appointment.type} appointment is on ${date} at ${time}. Reply to reschedule.`;
    CommunicationService.sendSMS(appointment.customer.phone, msg);
  };

  if (isLoading || !appointment) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const cfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.SCHEDULED;
  const { date, time } = formatDateTime(appointment.scheduledAt);
  const transitions = TRANSITIONS[appointment.status] ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="bg-card border-b border-border px-5 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 20 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-border items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#06b6d4" />
        </TouchableOpacity>
        <Text className="text-text font-bold text-base">Appointment</Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.navigate('AddEditAppointment', { appointment })}
            className="w-9 h-9 rounded-full bg-border items-center justify-center mr-2"
          >
            <Ionicons name="create-outline" size={19} color="#06b6d4" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="w-9 h-9 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 items-center justify-center"
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* ── Status hero ── */}
        <View className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
          <View
            className="px-5 py-4 flex-row items-center"
            style={{ backgroundColor: cfg.bg }}
          >
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: cfg.color + '22' }}
            >
              <Ionicons name={cfg.icon} size={24} color={cfg.color} />
            </View>
            <View>
              <Text className="font-bold text-xl text-text">{time}</Text>
              <Text className="text-textSecondary text-xs mt-0.5">{date}</Text>
            </View>
            <View className="ml-auto">
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: cfg.color + '22', borderWidth: 1, borderColor: cfg.color }}
              >
                <Text className="font-bold text-xs uppercase tracking-wide" style={{ color: cfg.color }}>
                  {cfg.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Details grid */}
          <View className="px-5 py-4 flex-row flex-wrap" style={{ gap: 16 }}>
            <View className="w-[45%]">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">Type</Text>
              <Text className="text-text font-semibold text-sm mt-0.5">{appointment.type}</Text>
            </View>
            <View className="w-[45%]">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">Duration</Text>
              <Text className="text-text font-semibold text-sm mt-0.5">{appointment.durationMinutes} minutes</Text>
            </View>
          </View>

          {appointment.notes && (
            <View className="px-5 pb-4 pt-2 border-t border-border">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1.5">Notes</Text>
              <Text className="text-textSecondary text-sm leading-5">{appointment.notes}</Text>
            </View>
          )}
        </View>

        {/* ── Patient card ── */}
        <View className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
          <View className="px-4 py-3 flex-row items-center border-b border-border" style={{ backgroundColor: '#0f1623' }}>
            <View className="w-7 h-7 rounded-full bg-[#a78bfa]/10 items-center justify-center mr-2">
              <Ionicons name="person-outline" size={14} color="#a78bfa" />
            </View>
            <Text className="text-text font-bold text-sm">Patient</Text>
          </View>
          <TouchableOpacity
            className="px-5 py-4 flex-row items-center"
            onPress={() => navigation.navigate('CustomerDetails', { customerId: appointment.customerId })}
          >
            <View className="w-11 h-11 rounded-full bg-[#06b6d4]/10 border-2 border-[#06b6d4]/30 items-center justify-center mr-3">
              <Text className="text-[#06b6d4] font-bold">
                {appointment.customer?.fullName?.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-text font-bold text-base">{appointment.customer?.fullName}</Text>
              <View className="flex-row items-center mt-0.5">
                <Ionicons name="call-outline" size={12} color="#71717a" />
                <Text className="text-textSecondary text-sm ml-1.5">{appointment.customer?.phone}</Text>
              </View>
              {appointment.customer?.email && (
                <View className="flex-row items-center mt-0.5">
                  <Ionicons name="mail-outline" size={12} color="#71717a" />
                  <Text className="text-textSecondary text-sm ml-1.5">{appointment.customer.email}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* ── Reschedule button ── */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddEditAppointment', { appointment })}
          className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center mb-4"
        >
          <View className="w-8 h-8 rounded-full bg-[#f59e0b]/10 items-center justify-center mr-3">
            <Ionicons name="calendar-outline" size={15} color="#f59e0b" />
          </View>
          <View className="flex-1">
            <Text className="text-text font-semibold text-sm">Reschedule</Text>
            <Text className="text-textMuted text-xs mt-0.5">Change date, time, or type</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#374151" />
        </TouchableOpacity>

        {/* ── Status actions ── */}
        {transitions.length > 0 && (
          <View className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
            <View className="px-4 py-3 border-b border-border" style={{ backgroundColor: '#0f1623' }}>
              <Text className="text-text font-bold text-sm">Update Status</Text>
            </View>
            <View className="p-4" style={{ gap: 8 }}>
              {transitions.map((status) => {
                const s = STATUS_CONFIG[status];
                const isLoading = updatingStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => handleStatusChange(status)}
                    disabled={!!updatingStatus}
                    className="flex-row items-center px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor: s.bg,
                      borderColor: s.color + '55',
                      opacity: updatingStatus && updatingStatus !== status ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={s.color} style={{ marginRight: 12 }} />
                    ) : (
                      <Ionicons name={s.icon} size={18} color={s.color} style={{ marginRight: 12 }} />
                    )}
                    <Text className="font-bold text-sm" style={{ color: s.color }}>
                      Mark as {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* View patient prescriptions shortcut */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CustomerDetails', { customerId: appointment.customerId })}
          className="bg-card border border-[#06b6d4]/30 rounded-xl px-4 py-3 flex-row items-center mb-6"
        >
          <Ionicons name="eye-outline" size={16} color="#06b6d4" style={{ marginRight: 12 }} />
          <Text className="text-[#06b6d4] font-semibold text-sm">View Patient Profile & History</Text>
          <Ionicons name="chevron-forward" size={16} color="#06b6d4" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* Communication Actions */}
        <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-3">Customer Communication</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <TouchableOpacity onPress={handleWhatsAppReminder} className="flex-row items-center py-2.5 border-b border-border">
            <Ionicons name="logo-whatsapp" size={20} color="#10b981" className="mr-3" />
            <Text className="text-text text-sm font-medium">Send WhatsApp Reminder</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSMSReminder} className="flex-row items-center py-2.5">
            <Ionicons name="chatbubble-outline" size={20} color="#06b6d4" className="mr-3" />
            <Text className="text-text text-sm font-medium">Send SMS Reminder</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
