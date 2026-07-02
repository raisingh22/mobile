import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Linking,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors } from '../../theme/colors';

// ── Event Filters ────────────────────────────────────────────────────
interface EventFilter {
  key: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
}

const EVENT_FILTERS: EventFilter[] = [
  { key: 'APPOINTMENT', label: 'Appointments', icon: 'calendar-outline', color: '#3b82f6', bg: '#3b82f618' },
  { key: 'DELIVERY',    label: 'Deliveries',   icon: 'glasses-outline',  color: '#22c55e', bg: '#22c55e18' },
  { key: 'PICKUP',      label: 'Pickups',      icon: 'cube-outline',     color: '#6366f1', bg: '#6366f118' },
  { key: 'PAYMENT',     label: 'Payments',     icon: 'cash-outline',     color: '#ef4444', bg: '#ef444418' },
  { key: 'FOLLOW_UP',   label: 'Follow-ups',   icon: 'repeat-outline',   color: '#f97316', bg: '#f9731618' },
  { key: 'BIRTHDAY',    label: 'Birthdays',    icon: 'gift-outline',     color: '#ec4899', bg: '#ec489918' },
  { key: 'STOCK_ARRIVAL', label: 'Stock Orders',icon: 'download-outline', color: '#854d0e', bg: '#854d0e18' },
  { key: 'STAFF',       label: 'Staff Schedule',icon: 'person-outline',  color: '#4f46e5', bg: '#4f46e518' },
  { key: 'PERSONAL_NOTE',label: 'Reminders',   icon: 'document-text-outline', color: '#4f46e5', bg: '#4f46e518' },
  { key: 'VISIT',       label: 'Visits',        icon: 'medical-outline',  color: '#14b8a6', bg: '#14b8a618' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Interfaces ──────────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  sourceId: string;
  title: string;
  type: string;
  date: string;
  time?: string;
  status?: string;
  color: string;
  icon: any;
  details: {
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    orderId?: string;
    orderNumber?: string;
    amount?: number;
    notes?: string;
    [key: string]: any;
  };
}

export function AppointmentsScreen({ navigation }: { navigation: any }) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedView, setSelectedView] = useState<'DAY' | 'MONTH'>('DAY');
  const [activeFilters, setActiveFilters] = useState<string[]>(EVENT_FILTERS.map(f => f.key));
  const [refreshing, setRefreshing] = useState(false);

  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const activeYear = selectedDate.getFullYear();
  const activeMonth = selectedDate.getMonth();

  const dateStripRef = useRef<ScrollView>(null);

  // Auto-scroll the date strip to center the selected date
  useEffect(() => {
    if (selectedView !== 'MONTH' && dateStripRef.current) {
      const diffTime = selectedDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      const index = diffDays + 7;
      
      if (index >= 0 && index < 15) {
        // Width of cell is 52, mx-1.5 adds 6px left and right. Total item width is 64.
        const scrollX = Math.max(0, index * 64 - 100);
        setTimeout(() => {
          dateStripRef.current?.scrollTo({ x: scrollX, animated: true });
        }, 150);
      }
    }
  }, [selectedDateKey, selectedView]);

  // Quick action states
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Reminder form states
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // Staff Schedule form states
  const [staffUserId, setStaffUserId] = useState('');
  const [staffType, setStaffType] = useState('SHIFT');
  const [staffNotes, setStaffNotes] = useState('');



  // ── Queries ────────────────────────────────────────────────────────
  // 1. Fetch Calendar Events for active Month
  const startStr = new Date(activeYear, activeMonth, 1).toISOString().split('T')[0];
  const endStr = new Date(activeYear, activeMonth + 1, 0).toISOString().split('T')[0];

  const { data: allEvents = [], isLoading: isEventsLoading, refetch: refetchEvents } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', activeYear, activeMonth],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.calendar.events, {
        params: { startDate: startStr, endDate: endStr },
      });
      return res.data;
    },
  });

  // 2. Fetch Daily Summary stats for Selected Day
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['calendar-summary', selectedDateKey],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.calendar.summary, {
        params: { date: selectedDateKey },
      });
      return res.data;
    },
  });

  // 3. Fetch Workspace Users for Staff Schedules dropdown
  const { data: workspaceUsers = [] } = useQuery({
    queryKey: ['workspace-users'],
    queryFn: async () => {
      const res = await axiosClient.get('/calendar/users');
      return res.data;
    },
  });

  // ── Mutations ──────────────────────────────────────────────────────
  // Create Personal Reminder
  const createReminderMutation = useMutation({
    mutationFn: async () => {
      if (!reminderTitle.trim()) throw new Error('Reminder title is required.');
      await axiosClient.post(ENDPOINTS.calendar.createReminder, {
        title: reminderTitle.trim(),
        notes: reminderNotes.trim() || null,
        date: selectedDateKey,
        time: reminderTime.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
      setReminderTitle('');
      setReminderNotes('');
      setReminderTime('');
      setShowReminderModal(false);
      Toast.show({ type: 'success', text1: 'Reminder Saved' });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: 'Error saving reminder', text2: err.message });
    },
  });

  // Create Staff Shift/Leave
  const createStaffScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!staffUserId) throw new Error('Please select a staff member.');
      await axiosClient.post(ENDPOINTS.calendar.createStaffSchedule, {
        userId: staffUserId,
        date: selectedDateKey,
        type: staffType,
        notes: staffNotes.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
      setStaffUserId('');
      setStaffNotes('');
      setShowStaffModal(false);
      Toast.show({ type: 'success', text1: 'Staff Schedule Saved' });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: 'Error saving schedule', text2: err.message });
    },
  });

  // Delete Staff Schedule / Reminder
  const deleteEventMutation = useMutation({
    mutationFn: async (event: CalendarEvent) => {
      if (event.type === 'PERSONAL_NOTE') {
        await axiosClient.delete(ENDPOINTS.calendar.deleteReminder(event.sourceId));
      } else if (event.type === 'STAFF') {
        await axiosClient.delete(ENDPOINTS.calendar.deleteStaffSchedule(event.sourceId));
      } else if (event.type === 'APPOINTMENT') {
        await axiosClient.delete(ENDPOINTS.appointments.delete(event.sourceId));
      } else if (event.type === 'VISIT') {
        await axiosClient.delete(ENDPOINTS.visits.delete(event.sourceId));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
      Toast.show({ type: 'success', text1: 'Event Deleted Successfully' });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: 'Delete failed', text2: err.message });
    },
  });

  // Toggle delivery status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      await axiosClient.patch(ENDPOINTS.orders.update(orderId), { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
      Toast.show({ type: 'success', text1: 'Order Status Updated' });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: 'Update failed', text2: err.message });
    },
  });

  // Add Quick Walk-in customer appointment
  const createWalkInMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await axiosClient.post(ENDPOINTS.appointments.walkIn, { customerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
      Toast.show({ type: 'success', text1: 'Walk-in Registered' });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: 'Failed to add walk-in', text2: err.message });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchEvents();
    await refetchSummary();
    setRefreshing(false);
  };

  // ── Operations Event Filter Helpers ───────────────────────────────
  const filteredEvents = allEvents.filter(e => {
    const isFilterActive = activeFilters.includes(e.type);
    if (!isFilterActive) return false;
    return true;
  });

  const dayEvents = filteredEvents.filter(e => e.date === selectedDateKey);

  const toggleFilter = (key: string) => {
    if (activeFilters.includes(key)) {
      setActiveFilters(activeFilters.filter(f => f !== key));
    } else {
      setActiveFilters([...activeFilters, key]);
    }
  };

  // ── Actions Helpers ────────────────────────────────────────────────
  const handleSendBirthdayGreeting = (phone: string, name: string) => {
    const text = `Hi ${name}, OptiFlow wishes you a very Happy Birthday! 🎂 We hope your day is filled with joy and clarity. Looking forward to seeing you soon!`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Greeting', 'Unable to open WhatsApp. Prefer using standard SMS?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'SMS Instead', onPress: () => Linking.openURL(`sms:${phone}?&body=${encodeURIComponent(text)}`) }
      ]);
    });
  };

  const handleActionSheet = (action: string) => {
    setShowQuickActions(false);
    if (action === 'APPOINTMENT') {
      navigation.navigate('AddEditAppointment', { date: selectedDateKey });
    } else if (action === 'ORDER') {
      navigation.navigate('AddOrder', { date: selectedDateKey });
    } else if (action === 'WALK_IN') {
      // Trigger Walk-in Customer Selection
      Alert.alert('Walk-in Customer', 'Do you want to search and register a walk-in patient?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select Customer',
          onPress: () => {
            // Quick select from customers list
            navigation.navigate('Customers', { selectMode: true, onSelect: (c: any) => createWalkInMutation.mutate(c.id) });
          }
        }
      ]);
    } else if (action === 'REMINDER') {
      setShowReminderModal(true);
    } else if (action === 'STAFF') {
      setShowStaffModal(true);
    } else if (action === 'PAYMENT') {
      // Search customer to record payment
      navigation.navigate('Customers', { selectMode: true, onSelect: (c: any) => navigation.navigate('AddEditPayment', { customerId: c.id, customerName: c.fullName }) });
    }
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    Alert.alert('Delete Event', `Are you sure you want to delete: "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEventMutation.mutate(event) }
    ]);
  };

  // ── Month View Helpers ─────────────────────────────────────────────
  const generateMonthGrid = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const cells: { date: Date | null; key: string }[] = [];

    // Padded cells
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ date: null, key: `empty-${i}` });
    }

    // Days cells
    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      cells.push({ date: cellDate, key: cellDate.toISOString().split('T')[0] });
    }

    return cells;
  };

  const renderMonthGrid = () => {
    const cells = generateMonthGrid();
    const eventsByDay: Record<string, CalendarEvent[]> = {};

    filteredEvents.forEach(e => {
      if (!eventsByDay[e.date]) eventsByDay[e.date] = [];
      eventsByDay[e.date].push(e);
    });

    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Days Header */}
        <View className="flex-row border-b border-border bg-card py-2.5">
          {DAY_NAMES.map(name => (
            <Text key={name} className="flex-1 text-center font-bold text-xs text-textMuted uppercase tracking-wider">
              {name}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View className="flex-row flex-wrap border-l border-t border-border">
          {cells.map(cell => {
            const isSelected = cell.date && cell.date.toISOString().split('T')[0] === selectedDateKey;
            const dateKey = cell.date ? cell.date.toISOString().split('T')[0] : '';
            const dayEventsList = cell.date ? eventsByDay[dateKey] || [] : [];
            const isCellToday = cell.date && cell.date.toDateString() === today.toDateString();

            // Count indicators
            const appointmentsCount = dayEventsList.filter(e => e.type === 'APPOINTMENT').length;
            const deliveriesCount = dayEventsList.filter(e => e.type === 'DELIVERY' || e.type === 'PICKUP').length;
            const paymentsCount = dayEventsList.filter(e => e.type === 'PAYMENT').length;
            const holidaysList = dayEventsList.filter(e => e.type === 'HOLIDAY');
            const hasHoliday = holidaysList.length > 0;

            return (
              <TouchableOpacity
                key={cell.key}
                disabled={!cell.date}
                onPress={() => {
                  if (cell.date) {
                    setSelectedDate(cell.date);
                    setSelectedView('DAY');
                  }
                }}
                style={{
                  width: '14.28%',
                  aspectRatio: 0.85,
                  backgroundColor: isSelected 
                    ? colors.primaryGlow 
                    : isCellToday 
                      ? `${colors.primary}10` 
                      : colors.card,
                  borderColor: colors.border,
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  padding: 4,
                }}
              >
                {cell.date ? (
                  <View className="flex-1 justify-between">
                    {/* Day number */}
                    <View className="flex-row justify-between items-center">
                      <Text
                        className="font-bold text-xs"
                        style={{
                          color: isSelected 
                            ? colors.primary 
                            : isCellToday 
                              ? colors.primary 
                              : colors.text
                        }}
                      >
                        {cell.date.getDate()}
                      </Text>
                      {isCellToday && (
                        <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </View>

                    {/* Operational Indicators */}
                    <View className="mt-1 space-y-0.5" style={{ gap: 1 }}>
                      {hasHoliday ? (
                        <Text className="text-[8px] font-bold text-warning text-center bg-warningGlow rounded px-0.5" numberOfLines={1}>
                          🎉 Holiday
                        </Text>
                      ) : (
                        <>
                          {appointmentsCount > 0 && (
                            <View className="flex-row items-center justify-center bg-[#3b82f612] rounded px-0.5">
                              <Text className="text-[8px]">👁️ {appointmentsCount}</Text>
                            </View>
                          )}
                          {deliveriesCount > 0 && (
                            <View className="flex-row items-center justify-center bg-[#22c55e12] rounded px-0.5">
                              <Text className="text-[8px]">📦 {deliveriesCount}</Text>
                            </View>
                          )}
                          {paymentsCount > 0 && (
                            <View className="flex-row items-center justify-center bg-[#ef444412] rounded px-0.5">
                              <Text className="text-[8px] text-danger font-semibold">💰 {paymentsCount}</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ── Render Event Item ──────────────────────────────────────────────
  const renderEventItem = ({ item }: { item: CalendarEvent }) => {
    let typeLabel = item.type;
    const filterObj = EVENT_FILTERS.find(f => f.key === item.type);
    if (filterObj) typeLabel = filterObj.label;

    return (
      <View
        className="bg-card border border-border rounded-2xl p-4 mb-3.5"
        style={{ borderLeftWidth: 4, borderLeftColor: item.color }}
      >
        {/* Header row */}
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-lg items-center justify-center mr-2.5" style={{ backgroundColor: `${item.color}15` }}>
              <Ionicons name={item.icon} size={15} color={item.color} />
            </View>
            <View>
              <Text className="text-text font-bold text-sm" numberOfLines={1}>{item.title}</Text>
              <Text className="text-textMuted text-[10px] mt-0.5">{typeLabel} {item.time ? `· ${item.time}` : ''}</Text>
            </View>
          </View>

          {/* Delete action for custom schedules & appointments */}
          {(item.type === 'PERSONAL_NOTE' || item.type === 'STAFF' || item.type === 'APPOINTMENT' || item.type === 'VISIT') && (
            <TouchableOpacity onPress={() => handleDeleteEvent(item)} className="p-1">
              <Ionicons name="trash-outline" size={14} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content detail */}
        {item.details.notes ? (
          <Text className="text-textSecondary text-xs mb-3 bg-background p-2.5 rounded-xl border border-border/40" style={{ fontStyle: 'italic' }}>
            {item.details.notes}
          </Text>
        ) : null}

        {/* Footer dynamic contextual buttons */}
        <View className="flex-row items-center justify-end space-x-2 pt-2.5 border-t border-border/40" style={{ gap: 8 }}>
          {/* Appointment detail */}
          {item.type === 'APPOINTMENT' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('AppointmentDetails', { appointmentId: item.sourceId })}
              className="flex-row items-center bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="eye-outline" size={12} color={colors.primary} />
              <Text className="text-primary text-[11px] font-bold ml-1.5">View Details</Text>
            </TouchableOpacity>
          )}

          {/* Visit detail */}
          {item.type === 'VISIT' && item.details.customerId && (
            <TouchableOpacity
              onPress={() => navigation.navigate('CustomerDetails', { customerId: item.details.customerId })}
              className="flex-row items-center bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="person-outline" size={12} color={colors.primary} />
              <Text className="text-primary text-[11px] font-bold ml-1.5">View Patient</Text>
            </TouchableOpacity>
          )}

          {/* Customer Birthday WhatsApp greeting */}
          {item.type === 'BIRTHDAY' && item.details.customerPhone && (
            <TouchableOpacity
              onPress={() => handleSendBirthdayGreeting(item.details.customerPhone!, item.details.customerName!)}
              className="flex-row items-center bg-[#25d366]/10 border border-[#25d366]/30 px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="logo-whatsapp" size={12} color="#25d366" />
              <Text className="text-[#25d366] text-[11px] font-bold ml-1.5">Send Greeting</Text>
            </TouchableOpacity>
          )}

          {/* Payment due context action */}
          {item.type === 'PAYMENT' && item.details.customerId && (
            <TouchableOpacity
              onPress={() => navigation.navigate('AddEditPayment', { customerId: item.details.customerId, customerName: item.details.customerName })}
              className="flex-row items-center bg-[#ef4444]/10 border border-[#ef4444]/20 px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="cash-outline" size={12} color="#ef4444" />
              <Text className="text-danger text-[11px] font-bold ml-1.5">Record Payment</Text>
            </TouchableOpacity>
          )}

          {/* Delivery quick action: ready or delivered */}
          {item.type === 'DELIVERY' && item.status !== 'READY' && (
            <TouchableOpacity
              onPress={() => updateOrderStatusMutation.mutate({ orderId: item.sourceId, status: 'READY' })}
              className="flex-row items-center bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="checkmark-circle-outline" size={12} color="#6366f1" />
              <Text className="text-primary text-[11px] font-bold ml-1.5">Mark Ready for Pickup</Text>
            </TouchableOpacity>
          )}

          {item.type === 'PICKUP' && item.status === 'READY' && (
            <TouchableOpacity
              onPress={() => updateOrderStatusMutation.mutate({ orderId: item.sourceId, status: 'DELIVERED' })}
              className="flex-row items-center bg-success/10 border border-success/20 px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="checkbox-outline" size={12} color={colors.success} />
              <Text className="text-success text-[11px] font-bold ml-1.5">Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {item.details.orderId && (
            <TouchableOpacity
              onPress={() => navigation.navigate('OrderDetails', { orderId: item.details.orderId })}
              className="flex-row items-center bg-card border border-border px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
              <Text className="text-textSecondary text-[11px] font-bold ml-1.5">View Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSolid }}>
      {/* ── Top Header ──────────────────────────────────────────────── */}
      <View
        className="bg-card border-b border-border px-5 pb-3.5"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 20 }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text text-xl font-bold">Operations Hub</Text>
            <Text className="text-textMuted text-xs mt-0.5">
              {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Day / Month Segment Toggle */}
          <View className="flex-row bg-background border border-border p-1 rounded-xl">
            <TouchableOpacity
              onPress={() => setSelectedView('DAY')}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: selectedView === 'DAY' ? colors.card : 'transparent' }}
            >
              <Text className="text-xs font-bold" style={{ color: selectedView === 'DAY' ? colors.primary : colors.textMuted }}>Day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedView('MONTH')}
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: selectedView === 'MONTH' ? colors.card : 'transparent' }}
            >
              <Text className="text-xs font-bold" style={{ color: selectedView === 'MONTH' ? colors.primary : colors.textMuted }}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Collapsible/Horizontal Scrolling event filters */}
        <View className="mt-3.5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {EVENT_FILTERS.map(filter => {
              const isActive = activeFilters.includes(filter.key);
              return (
                <TouchableOpacity
                  key={filter.key}
                  onPress={() => toggleFilter(filter.key)}
                  className="flex-row items-center px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: isActive ? filter.bg : 'transparent',
                    borderColor: isActive ? filter.color : colors.border,
                  }}
                >
                  <Ionicons name={filter.icon} size={12} color={isActive ? filter.color : colors.textMuted} />
                  <Text
                    className="text-xs font-semibold ml-1.5"
                    style={{ color: isActive ? filter.color : colors.textSecondary }}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* ── Main View Content ───────────────────────────────────────── */}
      {selectedView === 'MONTH' ? (
        renderMonthGrid()
      ) : (
        <View className="flex-1">
          {/* Day View Strip for quick switching */}
          <View className="bg-card border-b border-border py-2.5">
            <ScrollView
              ref={dateStripRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              {Array.from({ length: 15 }).map((_, i) => {
                const dateOffset = new Date(today);
                dateOffset.setDate(today.getDate() + (i - 7));
                const key = dateOffset.toISOString().split('T')[0];
                const isSelected = key === selectedDateKey;
                const isCellToday = key === today.toISOString().split('T')[0];

                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSelectedDate(dateOffset)}
                    className="items-center mx-1.5"
                    style={{
                      width: 52,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: isSelected ? colors.primary : isCellToday ? `${colors.primary}18` : 'transparent',
                      borderWidth: isCellToday && !isSelected ? 1 : 0,
                      borderColor: colors.primary,
                    }}
                  >
                    <Text
                      className="text-[9px] font-bold uppercase"
                      style={{ color: isSelected ? '#fff' : colors.textMuted }}
                    >
                      {DAY_NAMES[dateOffset.getDay()]}
                    </Text>
                    <Text
                      className="text-base font-bold mt-0.5"
                      style={{ color: isSelected ? '#fff' : isCellToday ? colors.primary : colors.text }}
                    >
                      {dateOffset.getDate()}
                    </Text>
                    <Text
                      className="text-[9px] mt-0.5"
                      style={{ color: isSelected ? '#e2e8f0' : colors.textMuted }}
                    >
                      {MONTH_NAMES[dateOffset.getMonth()]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Timeline and Events FlashList */}
          {isEventsLoading || isSummaryLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-textMuted mt-3 text-sm">Synchronizing operations...</Text>
            </View>
          ) : (
            <FlashList
              data={dayEvents}
              keyExtractor={(item: CalendarEvent) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              renderItem={renderEventItem}
              ListHeaderComponent={
                <View className="mb-5">
                  {/* Today's Summary Dashboard Card */}
                  <View className="bg-card border border-border rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row items-center justify-between mb-3 border-b border-border pb-2.5">
                      <Text className="text-text font-bold text-sm">Today's Summary</Text>
                      <Ionicons name="bar-chart-outline" size={14} color={colors.primary} />
                    </View>

                    <View className="flex-row flex-wrap justify-between" style={{ gap: 8 }}>
                      <View className="w-[48%] bg-background/50 border border-border/40 p-2.5 rounded-xl">
                        <Text className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Appointments</Text>
                        <Text className="text-text font-bold text-lg mt-1">{summary?.appointments ?? 0}</Text>
                      </View>
                      <View className="w-[48%] bg-background/50 border border-border/40 p-2.5 rounded-xl">
                        <Text className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Orders Ready</Text>
                        <Text className="text-text font-bold text-lg mt-1">{summary?.ordersReady ?? 0}</Text>
                      </View>
                      <View className="w-[48%] bg-background/50 border border-border/40 p-2.5 rounded-xl">
                        <Text className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Pending Deliveries</Text>
                        <Text className="text-text font-bold text-lg mt-1">{summary?.pendingDeliveries ?? 0}</Text>
                      </View>
                      <View className="w-[48%] bg-background/50 border border-border/40 p-2.5 rounded-xl">
                        <Text className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Payments Due</Text>
                        <Text className="text-danger font-bold text-lg mt-1">₹{summary?.paymentsDue?.toLocaleString('en-IN') ?? 0}</Text>
                      </View>
                      <View className="w-[48%] bg-background/50 border border-border/40 p-2.5 rounded-xl">
                        <Text className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Birthdays Today</Text>
                        <Text className="text-text font-bold text-lg mt-1">{summary?.birthdays ?? 0}</Text>
                      </View>
                      <View className="w-[48%] bg-background/50 border border-border/40 p-2.5 rounded-xl">
                        <Text className="text-[10px] text-textMuted font-medium uppercase tracking-wider">Low Stock items</Text>
                        <Text className="text-warning font-bold text-lg mt-1">{summary?.lowStock ?? 0}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Scheduled Items Count */}
                  <Text className="text-text font-bold text-base mt-2">
                    {dayEvents.length} Item{dayEvents.length !== 1 ? 's' : ''} Scheduled
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View className="items-center py-16 bg-card border border-border rounded-2xl p-6">
                  <View className="w-16 h-16 rounded-full bg-background items-center justify-center mb-4">
                    <Ionicons name="calendar-outline" size={28} color={colors.textDisabled} />
                  </View>
                  <Text className="text-text font-bold text-base mb-1">No Schedule Entries</Text>
                  <Text className="text-textMuted text-xs text-center px-4">
                    No active operations found for this day. Taping '+' allows scheduling appointments, orders, and custom reminders.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ── Quick Actions Floating Button ───────────────────────────── */}
      <TouchableOpacity
        onPress={() => setShowQuickActions(true)}
        className="position-absolute absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center bg-primary"
        style={{
          shadowColor: colors.primary,
          shadowOpacity: 0.4,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          zIndex: 50,
          elevation: 10,
        }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* ── Quick Actions Sheet Modal ───────────────────────────────── */}
      <Modal
        visible={showQuickActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickActions(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowQuickActions(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <View className="bg-card border-t border-border rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 20 }}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-text font-bold text-lg">Quick Actions</Text>
              <TouchableOpacity onPress={() => setShowQuickActions(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap justify-between" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={() => handleActionSheet('APPOINTMENT')}
                className="w-[47%] bg-background border border-border p-4 rounded-2xl items-center"
              >
                <Ionicons name="calendar" size={22} color="#3b82f6" />
                <Text className="text-text font-semibold text-xs mt-2">Schedule Appt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleActionSheet('ORDER')}
                className="w-[47%] bg-background border border-border p-4 rounded-2xl items-center"
              >
                <Ionicons name="cube" size={22} color="#22c55e" />
                <Text className="text-text font-semibold text-xs mt-2">Create Order</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleActionSheet('WALK_IN')}
                className="w-[47%] bg-background border border-border p-4 rounded-2xl items-center"
              >
                <Ionicons name="walk" size={22} color="#f97316" />
                <Text className="text-text font-semibold text-xs mt-2">Walk-in Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleActionSheet('PAYMENT')}
                className="w-[47%] bg-background border border-border p-4 rounded-2xl items-center"
              >
                <Ionicons name="cash" size={22} color="#ef4444" />
                <Text className="text-text font-semibold text-xs mt-2">Record Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleActionSheet('REMINDER')}
                className="w-[47%] bg-background border border-border p-4 rounded-2xl items-center"
              >
                <Ionicons name="document-text" size={22} color="#4f46e5" />
                <Text className="text-text font-semibold text-xs mt-2">Add Reminder</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleActionSheet('STAFF')}
                className="w-[47%] bg-background border border-border p-4 rounded-2xl items-center"
              >
                <Ionicons name="person" size={22} color="#4f46e5" />
                <Text className="text-text font-semibold text-xs mt-2">Block/Staff Shift</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Reminder Creation Modal ─────────────────────────────────── */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-center p-5">
          <View className="bg-card border border-border rounded-2xl p-5">
            <Text className="text-text font-bold text-lg mb-4">Add Personal Reminder</Text>
            
            <Text className="text-textSecondary text-xs font-semibold mb-1">Title *</Text>
            <TextInput
              value={reminderTitle}
              onChangeText={setReminderTitle}
              placeholder="e.g. Call lens supplier"
              placeholderTextColor={colors.textDisabled}
              className="border border-border p-2.5 rounded-xl text-text bg-background mb-3.5 text-sm"
            />

            <Text className="text-textSecondary text-xs font-semibold mb-1">Notes</Text>
            <TextInput
              value={reminderNotes}
              onChangeText={setReminderNotes}
              placeholder="Additional details..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
              className="border border-border p-2.5 rounded-xl text-text bg-background mb-3.5 text-sm"
              style={{ minHeight: 60 }}
            />

            <Text className="text-textSecondary text-xs font-semibold mb-1">Time (Optional)</Text>
            <TextInput
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="e.g. 10:30 AM"
              placeholderTextColor={colors.textDisabled}
              className="border border-border p-2.5 rounded-xl text-text bg-background mb-5 text-sm"
            />

            <View className="flex-row justify-end space-x-2" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowReminderModal(false)}
                className="border border-border px-4 py-2.5 rounded-xl"
              >
                <Text className="text-textMuted font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => createReminderMutation.mutate()}
                disabled={createReminderMutation.isPending}
                className="bg-primary px-4 py-2.5 rounded-xl"
              >
                {createReminderMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-xs">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Staff Schedule Modal ────────────────────────────────────── */}
      <Modal visible={showStaffModal} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-center p-5">
          <View className="bg-card border border-border rounded-2xl p-5">
            <Text className="text-text font-bold text-lg mb-4">Add Staff Leave/Shift</Text>
            
            <Text className="text-textSecondary text-xs font-semibold mb-1">Select Staff Member *</Text>
            <View className="border border-border rounded-xl bg-background mb-3.5 overflow-hidden">
              <ScrollView style={{ maxHeight: 120 }}>
                {workspaceUsers.map((u: any) => {
                  const isUserSelected = u.id === staffUserId;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      onPress={() => setStaffUserId(u.id)}
                      className="p-3 border-b border-border/40 flex-row justify-between items-center"
                      style={{ backgroundColor: isUserSelected ? `${colors.primary}10` : 'transparent' }}
                    >
                      <Text className="text-text text-sm font-medium">{u.fullName} ({u.role})</Text>
                      {isUserSelected && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
                {workspaceUsers.length === 0 && (
                  <Text className="text-textMuted text-xs p-3">No staff members found.</Text>
                )}
              </ScrollView>
            </View>

            <Text className="text-textSecondary text-xs font-semibold mb-1">Schedule Type *</Text>
            <View className="flex-row border border-border rounded-xl bg-background mb-3.5 p-1">
              {['SHIFT', 'LEAVE', 'HOLIDAY'].map(type => {
                const isActive = staffType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setStaffType(type)}
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: isActive ? colors.primary : 'transparent' }}
                  >
                    <Text className="text-xs font-bold" style={{ color: isActive ? '#fff' : colors.textMuted }}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-textSecondary text-xs font-semibold mb-1">Notes / Timings</Text>
            <TextInput
              value={staffNotes}
              onChangeText={setStaffNotes}
              placeholder="e.g. Full Day, Shift timings: 9 AM - 6 PM"
              placeholderTextColor={colors.textDisabled}
              className="border border-border p-2.5 rounded-xl text-text bg-background mb-5 text-sm"
            />

            <View className="flex-row justify-end space-x-2" style={{ gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowStaffModal(false)}
                className="border border-border px-4 py-2.5 rounded-xl"
              >
                <Text className="text-textMuted font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => createStaffScheduleMutation.mutate()}
                disabled={createStaffScheduleMutation.isPending}
                className="bg-primary px-4 py-2.5 rounded-xl"
              >
                {createStaffScheduleMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-xs">Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
