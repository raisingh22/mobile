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
import { CustomerLedgerTab } from '../ledger/CustomerLedgerTab';

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

  const { data: customerData, isLoading: isCustLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.details(customerId));
      return response.data;
    },
  });

  const { data: visitsData, isLoading: isVisitsLoading } = useQuery<any[]>({
    queryKey: ['visits', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.visits.list(customerId));
      return response.data;
    },
  });

  const { data: ledgerData } = useQuery<any>({
    queryKey: ['ledger', customerId],
    queryFn: async () => {
      try {
        const response = await axiosClient.get(ENDPOINTS.ledger.details(customerId));
        return response.data;
      } catch {
        return null;
      }
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

  const deleteVisitMutation = useMutation({
    mutationFn: async (visitId: string) => {
      return axiosClient.delete(ENDPOINTS.visits.delete(visitId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['ledger', customerId] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({ type: 'success', text1: 'Visit Deleted', text2: 'Visit history has been updated.' });
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

  const handleConfirmDeleteVisit = (visitId: string) => {
    Alert.alert(
      'Delete Visit Session',
      'Are you sure? This will permanently delete the visit details and any spectacles orders booked in this visit.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Visit', style: 'destructive', onPress: () => deleteVisitMutation.mutate(visitId) },
      ]
    );
  };

  const isLoading = isCustLoading || isVisitsLoading;

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
              <Text className="text-[#06b6d4] font-bold text-lg">{visitsData?.length || 0}</Text>
              <Text className="text-textMuted text-[10px]">Visits</Text>
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
                  <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider ml-1.5">Clinic Notes</Text>
                </View>
                <Text className="text-textSecondary text-sm leading-5">{customer.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Outstanding Balance Due card */}
        {ledgerData?.summary?.currentOutstandingBalance > 0 && (
          <View className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-2xl p-4 mb-4 flex-row justify-between items-center">
            <View>
              <Text className="text-[#ef4444] text-[10px] font-bold uppercase tracking-wider">Outstanding Dues Pending</Text>
              <Text className="text-[#ef4444] text-xl font-black mt-1">₹{ledgerData.summary.currentOutstandingBalance.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddEditPayment', {
                customerId,
                customerName: customer.fullName,
              })}
              className="bg-[#ef4444] px-4 py-2 rounded-xl"
            >
              <Text className="text-white text-xs font-bold">Collect Payment</Text>
            </TouchableOpacity>
          </View>
        )}

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
              {/* Primary member */}
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
              {/* Family members */}
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

        {/* ── Visits & Timeline Cockpit ── */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-text font-extrabold text-base">Visits & History</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('NewVisit', { customerId, customerName: customer.fullName })}
              className="bg-[#06b6d4] px-4 py-2.5 rounded-xl flex-row items-center"
            >
              <Ionicons name="add-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text className="text-white text-xs font-bold">New Visit</Text>
            </TouchableOpacity>
          </View>

          {isVisitsLoading ? (
            <ActivityIndicator size="large" color="#06b6d4" style={{ marginVertical: 30 }} />
          ) : !visitsData || visitsData.length === 0 ? (
            <View className="bg-card border border-border rounded-2xl p-10 items-center">
              <Ionicons name="calendar-outline" size={36} color="#374151" />
              <Text className="text-textMuted text-sm mt-3 text-center">
                No visits recorded yet. Tap "New Visit" to log an encounter.
              </Text>
            </View>
          ) : (
            visitsData.map((visit: any) => {
              const visitDate = new Date(visit.date || visit.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              });
              
              return (
                <View key={visit.id} className="bg-card border border-border rounded-2xl p-4 mb-4">
                  {/* Visit Card Header */}
                  <View className="flex-row justify-between items-start border-b border-border pb-3 mb-3">
                    <View>
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <View className="bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-2 py-0.5 rounded-md">
                          <Text className="text-[#06b6d4] text-[10px] font-extrabold uppercase">{visit.type}</Text>
                        </View>
                        <Text className="text-textMuted text-[10px] font-semibold">{visitDate}</Text>
                      </View>
                      {visit.doctorName && (
                        <Text className="text-textSecondary text-[11px] mt-1">
                          Handled by: <Text className="text-text font-bold">{visit.doctorName}</Text>
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity onPress={() => handleConfirmDeleteVisit(visit.id)}>
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Visit Notes */}
                  {visit.notes && (
                    <Text className="text-textMuted text-xs italic mb-3 bg-[#0f1623] p-2.5 rounded-lg">
                      "{visit.notes}"
                    </Text>
                  )}

                  {/* Prescriptions */}
                  {visit.prescriptions?.map((rx: any) => (
                    <View key={rx.id} className="bg-[#0f1623] border border-border rounded-xl p-3 mb-3">
                      <View className="flex-row items-center mb-2 pb-1.5 border-b border-border" style={{ gap: 8 }}>
                        <Ionicons name="eye-outline" size={13} color="#06b6d4" />
                        <Text className="text-[#06b6d4] text-[11px] font-bold uppercase tracking-wider">Refraction Findings</Text>
                      </View>

                      {/* OD/OS values */}
                      <View className="flex-row justify-between mb-2">
                        <View className="flex-1">
                          <Text className="text-[10px] text-textMuted uppercase font-bold">Right Eye (OD)</Text>
                          <Text className="text-text text-xs mt-0.5">
                            Sph: {rx.rightSphere ?? '0.00'} | Cyl: {rx.rightCylinder ?? '0.00'} | Axis: {rx.rightAxis ?? '0'}°
                          </Text>
                        </View>
                        <View className="flex-1 border-l border-border pl-3">
                          <Text className="text-[10px] text-textMuted uppercase font-bold">Left Eye (OS)</Text>
                          <Text className="text-text text-xs mt-0.5">
                            Sph: {rx.leftSphere ?? '0.00'} | Cyl: {rx.leftCylinder ?? '0.00'} | Axis: {rx.leftAxis ?? '0'}°
                          </Text>
                        </View>
                      </View>

                      {rx.pupillaryDistance && (
                        <Text className="text-textSecondary text-[11px] mt-1">
                          Pupillary Distance (PD): <Text className="text-text font-bold">{rx.pupillaryDistance} mm</Text>
                        </Text>
                      )}
                      {rx.notes && (
                        <Text className="text-textMuted text-[11px] italic mt-1">
                          Rx Notes: "{rx.notes}"
                        </Text>
                      )}
                    </View>
                  ))}

                  {/* Orders / Invoices */}
                  {visit.orders?.map((order: any) => (
                    <View key={order.id} className="bg-[#0f1623] border border-border rounded-xl p-3 mb-3">
                      <View className="flex-row justify-between items-center mb-2 pb-1.5 border-b border-border">
                        <View className="flex-row items-center" style={{ gap: 8 }}>
                          <Ionicons name="cart-outline" size={13} color="#a78bfa" />
                          <Text className="text-[#a78bfa] text-[11px] font-bold uppercase tracking-wider">Specs Order</Text>
                        </View>
                        <View className="bg-[#a78bfa]/10 px-2 py-0.5 rounded-md">
                          <Text className="text-[#a78bfa] text-[9px] font-bold">{order.status}</Text>
                        </View>
                      </View>

                      {/* Product details */}
                      <Text className="text-text font-bold text-xs">
                        {order.frameBrand || ''} {order.frameModel || ''} {order.frameName || 'Custom Spectacles'}
                      </Text>
                      {(order.lensType || order.lensCoating) && (
                        <Text className="text-textSecondary text-[11px] mt-0.5">
                          Lenses: {order.lensType || 'Standard'} ({order.lensCoating || 'Uncoated'})
                        </Text>
                      )}

                      {/* Delivery Date */}
                      {order.expectedDeliveryDate && (
                        <Text className="text-textMuted text-[10px] mt-1.5">
                          Expected Delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                        </Text>
                      )}

                      {/* Pricing */}
                      <View className="flex-row justify-between items-center mt-3 pt-2 border-t border-borderLight">
                        <View>
                          <Text className="text-[9px] text-textMuted uppercase font-bold">Total Cost</Text>
                          <Text className="text-text font-bold text-xs mt-0.5">₹{order.total.toLocaleString()}</Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[9px] text-textMuted uppercase font-bold">Dues Outstanding</Text>
                          <Text className="text-xs font-bold mt-0.5" style={{ color: order.balanceAmount > 0 ? '#ef4444' : '#10b981' }}>
                            ₹{order.balanceAmount.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Transactions logged in visit */}
                  {visit.transactions && visit.transactions.length > 0 && (
                    <View className="mt-1">
                      <Text className="text-[10px] text-textMuted uppercase font-bold mb-1.5">Transactions In Visit</Text>
                      {visit.transactions.map((tx: any) => {
                        const isDebit = tx.debit > 0;
                        return (
                          <View key={tx.id} className="flex-row justify-between items-center py-1">
                            <View className="flex-row items-center" style={{ gap: 6 }}>
                              <Ionicons
                                name={isDebit ? 'arrow-up-circle' : 'arrow-down-circle'}
                                size={12}
                                color={isDebit ? '#ef4444' : '#10b981'}
                              />
                              <Text className="text-textSecondary text-[11px]">{tx.type.replace(/_/g, ' ')}</Text>
                            </View>
                            <Text className="text-xs font-bold" style={{ color: isDebit ? '#ef4444' : '#10b981' }}>
                              {isDebit ? `+₹${tx.debit.toLocaleString()}` : `-₹${tx.credit.toLocaleString()}`}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
