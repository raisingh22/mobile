import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';
import { StatusBadge } from '../../components/StatusBadge';

// ── Tag definitions ────────────────────────────────────────────────
const TAG_CONFIG: Record<string, { color: string; bg: string }> = {
  'VIP':          { color: '#eab308', bg: '#eab30818' },
  'Regular':      { color: '#06b6d4', bg: '#06b6d418' },
  'New Patient':  { color: '#10b981', bg: '#10b98118' },
  'High Risk':    { color: '#ef4444', bg: '#ef444418' },
  'Diabetic':     { color: '#f97316', bg: '#f9731618' },
  'Glaucoma':     { color: '#a78bfa', bg: '#a78bfa18' },
  'Progressive':  { color: '#3b82f6', bg: '#3b82f618' },
  'Contact Lens': { color: '#14b8a6', bg: '#14b8a618' },
};

function TagBadge({ tag }: { tag: string }) {
  const cfg = TAG_CONFIG[tag] ?? { color: '#a1a1aa', bg: '#a1a1aa18' };
  return (
    <View
      className="flex-row items-center px-2.5 py-1 rounded-full mr-1.5 mb-1.5"
      style={{ backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.color + '55' }}
    >
      <Ionicons name="pricetag" size={10} color={cfg.color} style={{ marginRight: 4 }} />
      <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
        {tag}
      </Text>
    </View>
  );
}

// ── Visit Timeline ─────────────────────────────────────────────────
type TimelineItem =
  | { kind: 'prescription'; id: string; date: string; doctorName?: string; rightSphere?: number; leftSphere?: number }
  | { kind: 'order'; id: string; date: string; orderNumber: string; status: string; total: number; paymentStatus: string };

function TimelineCard({ item, onPress }: { item: TimelineItem; onPress: () => void }) {
  const isPrescription = item.kind === 'prescription';
  const iconName = isPrescription ? 'eye-outline' : 'receipt-outline';
  const iconColor = isPrescription ? '#06b6d4' : '#10b981';
  const iconBg = isPrescription ? '#06b6d415' : '#10b98115';
  const dateLabel = new Date(item.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <View className="flex-row mb-4">
      {/* Timeline track */}
      <View className="items-center mr-3" style={{ width: 36 }}>
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={iconName} size={16} color={iconColor} />
        </View>
        <View className="flex-1 mt-1" style={{ width: 1.5, backgroundColor: '#1f2937' }} />
      </View>

      {/* Card */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        className="flex-1 bg-card border border-border rounded-xl p-3 mb-1"
        style={{ alignSelf: 'flex-start' }}
      >
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">
            {isPrescription ? 'Prescription' : 'Order'}
          </Text>
          <Text className="text-textMuted text-[10px]">{dateLabel}</Text>
        </View>

        {isPrescription ? (
          <>
            {item.doctorName ? (
              <View className="flex-row items-center mb-1">
                <Ionicons name="medical-outline" size={11} color="#a78bfa" />
                <Text className="text-textSecondary text-xs ml-1">Dr. {item.doctorName}</Text>
              </View>
            ) : null}
            <View className="flex-row">
              <Text className="text-text text-xs font-mono">
                OD: {item.rightSphere != null ? (item.rightSphere >= 0 ? `+${item.rightSphere}` : `${item.rightSphere}`) : '—'} D
              </Text>
              <Text className="text-[#374151] text-xs mx-2">·</Text>
              <Text className="text-text text-xs font-mono">
                OS: {item.leftSphere != null ? (item.leftSphere >= 0 ? `+${item.leftSphere}` : `${item.leftSphere}`) : '—'} D
              </Text>
            </View>
          </>
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-text font-bold text-sm">{item.orderNumber}</Text>
              <StatusBadge status={item.status} />
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-textSecondary text-xs">₹{item.total.toLocaleString()}</Text>
              <Text
                className="text-[10px] font-semibold"
                style={{ color: item.paymentStatus === 'PAID' ? '#10b981' : '#f59e0b' }}
              >
                {item.paymentStatus === 'PAID' ? 'Paid' :
                 item.paymentStatus === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}
              </Text>
            </View>
          </>
        )}

        <View className="flex-row items-center mt-2 pt-2 border-t border-border">
          <Text className="text-[#06b6d4] text-[10px] font-semibold">View Details</Text>
          <Ionicons name="chevron-forward" size={10} color="#06b6d4" style={{ marginLeft: 2 }} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Info Row ───────────────────────────────────────────────────────
function InfoRow({ icon, iconColor, label, value }: { icon: any; iconColor: string; label: string; value: string }) {
  return (
    <View className="flex-row items-start mt-3">
      <View className="w-7 h-7 rounded-full bg-border items-center justify-center mr-3 mt-0.5">
        <Ionicons name={icon} size={13} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">{label}</Text>
        <Text className="text-text text-sm font-medium mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────
interface CustomerDetailsScreenProps {
  route: any;
  navigation: any;
}

export function CustomerDetailsScreen({ route, navigation }: CustomerDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'timeline' | 'prescriptions' | 'orders'>('timeline');

  const { data: customerData, isLoading: isCustLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.details(customerId));
      return response.data;
    },
  });

  const { data: prescriptionsData, isLoading: isPrescLoading } = useQuery({
    queryKey: ['customer-prescriptions', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.prescriptions(customerId));
      return response.data;
    },
  });

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.orders(customerId));
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.delete(ENDPOINTS.customers.delete(customerId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({ type: 'success', text1: 'Customer Deleted', text2: 'Profile removed successfully.' });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Delete failed';
      Toast.show({ type: 'error', text1: 'Delete Failed', text2: errMsg });
    },
  });

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Customer',
      'This will permanently remove the customer and all linked data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  // Merge prescriptions + orders into a unified timeline sorted by date desc
  const timeline = useMemo<TimelineItem[]>(() => {
    const prescriptions: TimelineItem[] = (prescriptionsData || []).map((p: any) => ({
      kind: 'prescription' as const,
      id: p.id,
      date: p.prescriptionDate,
      doctorName: p.doctorName,
      rightSphere: p.rightSphere,
      leftSphere: p.leftSphere,
    }));
    const orders: TimelineItem[] = (ordersData || []).map((o: any) => ({
      kind: 'order' as const,
      id: o.id,
      date: o.createdAt,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      paymentStatus: o.paymentStatus,
    }));
    return [...prescriptions, ...orders].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [prescriptionsData, ordersData]);

  const isLoading = isCustLoading || isPrescLoading || isOrdersLoading;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <View className="w-16 h-16 rounded-full bg-[#06b6d4]/10 items-center justify-center mb-4">
          <Ionicons name="person-outline" size={30} color="#06b6d4" />
        </View>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const customer = customerData;
  const prescriptions = prescriptionsData || [];
  const orders = ordersData || [];

  const initials = customer.fullName.trim().split(/\s+/)
    .slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

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

        <Text className="text-text font-bold text-base">Customer Profile</Text>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-border items-center justify-center mr-2"
            onPress={() => navigation.navigate('AddEditCustomer', { customer })}
          >
            <Ionicons name="create-outline" size={19} color="#06b6d4" />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 items-center justify-center"
            onPress={handleDeletePress}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* ── Profile hero card ── */}
        <View className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
          {/* Avatar strip */}
          <View className="bg-card px-5 pt-5 pb-4 flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-[#06b6d4]/10 border-2 border-primary/40 items-center justify-center mr-4">
              <Text className="text-[#06b6d4] font-bold text-xl">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text font-bold text-lg">{customer.fullName}</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="call-outline" size={12} color="#06b6d4" />
                <Text className="text-textSecondary text-xs ml-1.5">{customer.phone}</Text>
              </View>
            </View>
            {/* Quick stats */}
            <View className="items-end">
              <Text className="text-[#06b6d4] font-bold text-lg">{prescriptions.length}</Text>
              <Text className="text-textMuted text-[10px]">Rx</Text>
              <Text className="text-[#10b981] font-bold text-lg mt-0.5">{orders.length}</Text>
              <Text className="text-textMuted text-[10px]">Orders</Text>
            </View>
          </View>

          {/* Tags row */}
          {customer.tags?.length > 0 && (
            <View className="px-5 pb-3 pt-2 border-t border-border flex-row flex-wrap">
              {customer.tags.map((tag: string) => <TagBadge key={tag} tag={tag} />)}
            </View>
          )}

          {/* Info rows */}
          <View className="px-5 pb-5 pt-2 border-t border-border">
            <InfoRow icon="star-outline" iconColor="#fbbf24" label="Loyalty Status" value={`${customer.loyaltyPoints || 0} pts (${customer.membershipTier || 'Bronze'})`} />
            {customer.email && (
              <InfoRow icon="mail-outline" iconColor="#a78bfa" label="Email" value={customer.email} />
            )}
            {customer.dateOfBirth && (
              <InfoRow icon="calendar-outline" iconColor="#10b981" label="Date of Birth"
                value={new Date(customer.dateOfBirth).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              />
            )}
            {customer.gender && (
              <InfoRow icon="person-outline" iconColor="#06b6d4" label="Gender" value={customer.gender} />
            )}
            {customer.address && (
              <InfoRow icon="location-outline" iconColor="#f59e0b" label="Address" value={customer.address} />
            )}
            {customer.notes && (
              <View className="mt-4 pt-4 border-t border-border">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="document-text-outline" size={13} color="#71717a" />
                  <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider ml-1.5">Clinical Notes</Text>
                </View>
                <Text className="text-textSecondary text-sm leading-5">{customer.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Family Members ── */}
        {(customer.familyMembers?.length > 0 || customer.primaryMember) && (
          <View className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
            <View className="px-4 py-3 flex-row items-center border-b border-border" style={{ backgroundColor: '#0f1623' }}>
              <View className="w-7 h-7 rounded-full bg-[#a78bfa]/10 items-center justify-center mr-2">
                <Ionicons name="people-outline" size={14} color="#a78bfa" />
              </View>
              <Text className="text-text font-bold text-sm">Household</Text>
            </View>
            <View className="p-4">
              {/* Primary member (this person's parent/primary) */}
              {customer.primaryMember && (
                <TouchableOpacity
                  className="flex-row items-center bg-card border border-border rounded-xl px-4 py-3 mb-2"
                  onPress={() => navigation.push('CustomerDetails', { customerId: customer.primaryMember.id })}
                >
                  <View className="w-9 h-9 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/30 items-center justify-center mr-3">
                    <Text className="text-[#a78bfa] font-bold text-xs">
                      {customer.primaryMember.fullName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-text font-semibold text-sm">{customer.primaryMember.fullName}</Text>
                    <Text className="text-textMuted text-xs mt-0.5">{customer.primaryMember.phone}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[#a78bfa] text-[10px] font-bold uppercase">
                      {customer.relationType || 'Family'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#71717a" style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              )}
              {/* Family members under this person */}
              {customer.familyMembers?.map((member: any) => (
                <TouchableOpacity
                  key={member.id}
                  className="flex-row items-center bg-card border border-border rounded-xl px-4 py-3 mb-2"
                  onPress={() => navigation.push('CustomerDetails', { customerId: member.id })}
                >
                  <View className="w-9 h-9 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 items-center justify-center mr-3">
                    <Text className="text-[#06b6d4] font-bold text-xs">
                      {member.fullName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-text font-semibold text-sm">{member.fullName}</Text>
                    <Text className="text-textMuted text-xs mt-0.5">{member.phone}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[#06b6d4] text-[10px] font-bold uppercase">
                      {member.relationType || 'Member'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#71717a" style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Tabs ── */}
        <View className="flex-row bg-card border border-border rounded-xl overflow-hidden mb-4">
          {([
            { key: 'timeline', label: 'Timeline', icon: 'time-outline', count: timeline.length },
            { key: 'prescriptions', label: 'Rx', icon: 'eye-outline', count: prescriptions.length },
            { key: 'orders', label: 'Orders', icon: 'receipt-outline', count: orders.length },
          ] as const).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                className="flex-1 items-center py-3"
                style={{ backgroundColor: active ? '#06b6d415' : 'transparent' }}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={15} color={active ? '#06b6d4' : '#6b7280'} />
                <Text className="text-[10px] font-bold mt-1" style={{ color: active ? '#06b6d4' : '#6b7280' }}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View
                    className="absolute top-1 right-4 w-4 h-4 rounded-full items-center justify-center"
                    style={{ backgroundColor: active ? '#06b6d4' : '#374151' }}
                  >
                    <Text className="text-[9px] font-bold text-text">{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Tab Contents ── */}
        {activeTab === 'timeline' && (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text font-bold text-sm">Visit History</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddPrescription', { customerId })}
                className="bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-3 py-1.5 rounded-lg flex-row items-center"
              >
                <Ionicons name="add" size={14} color="#06b6d4" />
                <Text className="text-[#06b6d4] text-xs font-semibold ml-1">New Rx</Text>
              </TouchableOpacity>
            </View>
            {timeline.length === 0 ? (
              <View className="bg-card border border-border rounded-xl p-10 items-center">
                <Ionicons name="time-outline" size={32} color="#374151" />
                <Text className="text-textMuted text-sm mt-3">No visits recorded yet.</Text>
              </View>
            ) : (
              timeline.map((item) => (
                <TimelineCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onPress={() => {
                    if (item.kind === 'prescription') {
                      navigation.navigate('PrescriptionDetails', { prescriptionId: item.id });
                    } else {
                      navigation.navigate('OrderDetails', { orderId: item.id });
                    }
                  }}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'prescriptions' && (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text font-bold text-sm">Prescription History</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddPrescription', { customerId })}
                className="bg-border px-3 py-1.5 rounded-lg border border-border flex-row items-center"
              >
                <Ionicons name="add" size={14} color="#ffffff" />
                <Text className="text-text text-xs font-semibold ml-1">Add New</Text>
              </TouchableOpacity>
            </View>
            {prescriptions.length === 0 ? (
              <View className="bg-card border border-border rounded-xl p-10 items-center">
                <Ionicons name="eye-off-outline" size={32} color="#374151" />
                <Text className="text-textMuted text-sm mt-3">No prescriptions yet.</Text>
              </View>
            ) : (
              prescriptions.map((presc: any) => (
                <TouchableOpacity
                  key={presc.id}
                  className="bg-card border border-border rounded-xl p-4 mb-3"
                  onPress={() => navigation.navigate('PrescriptionDetails', { prescriptionId: presc.id })}
                >
                  <View className="flex-row justify-between items-center pb-2 border-b border-border mb-2.5">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={12} color="#10b981" />
                      <Text className="text-textSecondary text-xs font-medium ml-1.5">
                        {new Date(presc.prescriptionDate).toLocaleDateString()}
                      </Text>
                    </View>
                    {presc.doctorName ? (
                      <View className="flex-row items-center">
                        <Ionicons name="medical-outline" size={11} color="#a78bfa" />
                        <Text className="text-textSecondary text-xs font-semibold ml-1">Dr. {presc.doctorName}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View className="flex-row justify-between">
                    <View className="w-[48%]">
                      <Text className="text-textMuted text-[10px] font-bold uppercase mb-0.5">Right Eye (OD)</Text>
                      <Text className="text-text text-xs font-mono">
                        Sph: {presc.rightSphere ?? '0.00'} | Cyl: {presc.rightCylinder ?? '0.00'}
                      </Text>
                    </View>
                    <View className="w-[48%]">
                      <Text className="text-textMuted text-[10px] font-bold uppercase mb-0.5">Left Eye (OS)</Text>
                      <Text className="text-text text-xs font-mono">
                        Sph: {presc.leftSphere ?? '0.00'} | Cyl: {presc.leftCylinder ?? '0.00'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'orders' && (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text font-bold text-sm">Order History</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddOrder', { customerId })}
                className="bg-border px-3 py-1.5 rounded-lg border border-border flex-row items-center"
              >
                <Ionicons name="add" size={14} color="#ffffff" />
                <Text className="text-text text-xs font-semibold ml-1">New Order</Text>
              </TouchableOpacity>
            </View>
            {orders.length === 0 ? (
              <View className="bg-card border border-border rounded-xl p-10 items-center">
                <Ionicons name="receipt-outline" size={32} color="#374151" />
                <Text className="text-textMuted text-sm mt-3">No orders placed yet.</Text>
              </View>
            ) : (
              orders.map((order: any) => (
                <TouchableOpacity
                  key={order.id}
                  className="bg-card border border-border rounded-xl p-4 mb-3 flex-row justify-between items-center"
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                >
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-text font-bold text-sm">{order.orderNumber}</Text>
                      <StatusBadge status={order.status} className="ml-2" />
                    </View>
                    <View className="flex-row items-center mt-1.5">
                      <Ionicons name="calendar-outline" size={11} color="#71717a" />
                      <Text className="text-textSecondary text-xs ml-1.5">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-text font-bold text-sm">₹{order.total.toLocaleString()}</Text>
                    <Text className="text-textMuted text-[10px] mt-1.5">
                      Paid ₹{order.paidAmount.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
