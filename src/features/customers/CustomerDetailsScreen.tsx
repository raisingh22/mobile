import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors, shadows } from '../../theme/colors';
import { StatusBadge } from '../../components/StatusBadge';
import { CustomerLedgerTab } from '../ledger/CustomerLedgerTab';
import { Card } from '../../components/Card';
import { Typography } from '../../components/Typography';

const TAG_CONFIG: Record<string, { color: string; bg: string }> = {
  'VIP':          { color: '#eab308', bg: '#eab30818' },
  'Regular':      { color: '#6366f1', bg: '#6366f118' },
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

// ── Info Row ───────────────────────────────────────────────────────
function InfoRow({ icon, iconColor, label, value }: { icon: any; iconColor: string; label: string; value: string }) {
  const themeColors = useThemeColors();
  return (
    <View className="flex-row items-start mt-3">
      <View style={{ backgroundColor: themeColors.backgroundSolid }} className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5">
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>
      <View className="flex-1">
        <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase' }}>{label}</Typography>
        <Typography variant="body" weight="medium" style={{ marginTop: 2 }}>{value}</Typography>
      </View>
    </View>
  );
}

export function CustomerDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = getStyles(colors);
  const { customerId } = route.params;
  const queryClient = useQueryClient();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'orders' | 'ledger'>('overview');

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

  // Extract all orders across visits for the dedicated Orders Tab
  const allOrders = useMemo(() => {
    if (!visitsData) return [];
    const ordersList: any[] = [];
    visitsData.forEach((visit: any) => {
      if (visit.orders) {
        visit.orders.forEach((order: any) => {
          ordersList.push({
            ...order,
            visitDate: visit.date || visit.createdAt,
            doctorName: visit.doctorName,
          });
        });
      }
    });
    return ordersList;
  }, [visitsData]);

  const isLoading = isCustLoading || isVisitsLoading;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.backgroundSolid }} className="justify-center items-center">
        <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
          <Ionicons name="person-outline" size={30} color={colors.primary} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const customer = customerData;
  const initials = customer.fullName.trim().split(/\s+/)
    .slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSolid }}>
      {/* Header */}
      <View
        className="bg-card border-b border-border px-5 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 20 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-borderLight items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Text className="text-text font-bold text-base">Customer Profile</Text>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-borderLight items-center justify-center mr-2"
            onPress={() => navigation.navigate('AddEditCustomer', { customer })}
          >
            <Ionicons name="create-outline" size={19} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 items-center justify-center"
            onPress={handleDeletePress}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Tab Bar */}
      <View style={s.tabBar}>
        <TouchableOpacity style={[s.tabButton, activeTab === 'overview' && s.tabActive]} onPress={() => setActiveTab('overview')}>
          <Ionicons name="person-outline" size={15} color={activeTab === 'overview' ? colors.primary : colors.textMuted} />
          <Text style={[s.tabText, activeTab === 'overview' && s.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabButton, activeTab === 'visits' && s.tabActive]} onPress={() => setActiveTab('visits')}>
          <Ionicons name="medical-outline" size={15} color={activeTab === 'visits' ? colors.primary : colors.textMuted} />
          <Text style={[s.tabText, activeTab === 'visits' && s.tabTextActive]}>Visits & Rx</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabButton, activeTab === 'orders' && s.tabActive]} onPress={() => setActiveTab('orders')}>
          <Ionicons name="glasses-outline" size={15} color={activeTab === 'orders' ? colors.primary : colors.textMuted} />
          <Text style={[s.tabText, activeTab === 'orders' && s.tabTextActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabButton, activeTab === 'ledger' && s.tabActive]} onPress={() => setActiveTab('ledger')}>
          <Ionicons name="wallet-outline" size={15} color={activeTab === 'ledger' ? colors.primary : colors.textMuted} />
          <Text style={[s.tabText, activeTab === 'ledger' && s.tabTextActive]}>Ledger</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {activeTab === 'overview' && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
            {/* ── Outstanding Dues CRED style banner ── */}
            {ledgerData?.summary?.currentOutstandingBalance > 0 && (
              <Card variant="glow" style={s.balanceCard}>
                <View>
                  <Typography variant="muted" weight="bold" color={colors.danger} style={{ textTransform: 'uppercase' }}>Outstanding Balance</Typography>
                  <Typography variant="h2" weight="bold" color={colors.danger} style={{ marginTop: 2 }}>₹{ledgerData.summary.currentOutstandingBalance.toLocaleString()}</Typography>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddEditPayment', {
                    customerId,
                    customerName: customer.fullName,
                  })}
                  style={s.balanceBtn}
                >
                  <Typography variant="caption" weight="bold" color="#fff">Collect</Typography>
                </TouchableOpacity>
              </Card>
            )}

            {/* ── Profile hero card ── */}
            <Card style={{ padding: 16 }}>
              <View className="flex-row items-center">
                <View style={{ borderColor: colors.borderGlow }} className="w-14 h-14 rounded-full bg-primary/10 border-2 items-center justify-center mr-4">
                  <Text className="text-primary font-bold text-xl">{initials}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-text font-bold text-lg">{customer.fullName}</Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name="call-outline" size={12} color={colors.primary} />
                    <Text className="text-textSecondary text-xs ml-1.5">{customer.phone}</Text>
                  </View>
                </View>
                <View className="items-end bg-primaryGlow px-3 py-1.5 rounded-xl">
                  <Text className="text-primary font-bold text-base">{visitsData?.length || 0}</Text>
                  <Text className="text-primary text-[9px] font-bold uppercase tracking-wide">Visits</Text>
                </View>
              </View>

              {/* Tags row */}
              {customer.tags?.length > 0 && (
                <View className="mt-4 pt-3 border-t border-borderLight flex-row flex-wrap">
                  {customer.tags.map((tag: string) => <TagBadge key={tag} tag={tag} />)}
                </View>
              )}

              {/* Info rows */}
              <View className="mt-2 pt-1 border-t border-borderLight">
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
                  <InfoRow icon="person-outline" iconColor="#6366f1" label="Gender" value={customer.gender} />
                )}
                {customer.address && (
                  <InfoRow icon="location-outline" iconColor="#f59e0b" label="Address" value={customer.address} />
                )}
                {customer.notes && (
                  <View className="mt-4 pt-4 border-t border-borderLight">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="document-text-outline" size={13} color={colors.textSecondary} />
                      <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider ml-1.5">Clinic Notes</Text>
                    </View>
                    <Text className="text-textSecondary text-sm leading-5">{customer.notes}</Text>
                  </View>
                )}
              </View>
            </Card>

            {/* ── Family Members ── */}
            {(customer.familyMembers?.length > 0 || customer.primaryMember) && (
              <Card noPadding style={{ marginTop: 16 }}>
                <View style={{ backgroundColor: colors.cardHover }} className="px-4 py-3 flex-row items-center border-b border-borderLight">
                  <Ionicons name="people-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text className="text-text font-bold text-sm">Household</Text>
                </View>
                <View className="p-3">
                  {/* Primary member */}
                  {customer.primaryMember && (
                    <TouchableOpacity
                      className="flex-row items-center bg-card border border-borderLight rounded-xl px-4 py-3 mb-2"
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
                        <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  )}
                  {/* Family members */}
                  {customer.familyMembers?.map((member: any) => (
                    <TouchableOpacity
                      key={member.id}
                      className="flex-row items-center bg-card border border-borderLight rounded-xl px-4 py-3 mb-2"
                      onPress={() => navigation.push('CustomerDetails', { customerId: member.id })}
                    >
                      <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 items-center justify-center mr-3">
                        <Text className="text-primary font-bold text-xs">
                          {member.fullName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-text font-semibold text-sm">{member.fullName}</Text>
                        <Text className="text-textMuted text-xs mt-0.5">{member.phone}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-primary text-[10px] font-bold uppercase">
                          {member.relationType || 'Member'}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.textDisabled} style={{ marginTop: 2 }} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            )}
          </ScrollView>
        )}

        {activeTab === 'visits' && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
            <View className="flex-row justify-between items-center mb-4">
              <Typography variant="h3" weight="bold">Visits Timeline</Typography>
              <TouchableOpacity
                onPress={() => navigation.navigate('NewVisit', { customerId, customerName: customer.fullName })}
                style={s.headerBtn}
              >
                <Ionicons name="add-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Typography variant="caption" weight="bold" color="#fff">New Visit</Typography>
              </TouchableOpacity>
            </View>

            {!visitsData || visitsData.length === 0 ? (
              <Card style={{ padding: 32, alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary }} className="text-sm mt-3 text-center">
                  No visits recorded yet. Tap "New Visit" to log an encounter.
                </Text>
              </Card>
            ) : (
              visitsData.map((visit: any, index: number) => {
                const visitDate = new Date(visit.date || visit.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric'
                });

                return (
                  <View key={visit.id} style={{ flexDirection: 'row' }}>
                    {/* Timeline bullet & track */}
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={[s.bullet, { backgroundColor: colors.primary }]} />
                      {index < visitsData.length - 1 && <View style={[s.track, { backgroundColor: colors.borderLight }]} />}
                    </View>

                    {/* Card container */}
                    <Card style={{ flex: 1, padding: 14, marginBottom: 16 }}>
                      {/* Visit Header */}
                      <View className="flex-row justify-between items-start border-b border-borderLight pb-3 mb-3">
                        <View>
                          <View className="flex-row items-center" style={{ gap: 8 }}>
                            <View className="bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-md">
                              <Text className="text-primary text-[10px] font-extrabold uppercase">{visit.type}</Text>
                            </View>
                            <Typography variant="muted" weight="bold">{visitDate}</Typography>
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

                      {/* Notes */}
                      {visit.notes && (
                        <Text style={{ backgroundColor: colors.backgroundSolid, color: colors.textSecondary }} className="text-xs italic mb-3 p-2.5 rounded-lg">
                          "{visit.notes}"
                        </Text>
                      )}

                      {/* Prescriptions */}
                      {visit.prescriptions?.map((rx: any) => (
                        <View key={rx.id} style={{ backgroundColor: colors.backgroundSolid, borderColor: colors.borderLight }} className="border rounded-xl p-3 mb-3">
                          <View className="flex-row items-center mb-2 pb-1.5 border-b border-borderLight" style={{ gap: 8 }}>
                            <Ionicons name="eye-outline" size={13} color={colors.primary} />
                            <Text className="text-primary text-[11px] font-bold uppercase tracking-wider">Refraction Findings</Text>
                          </View>

                          <View className="flex-row justify-between mb-2">
                            <View className="flex-1">
                              <Typography variant="muted" weight="bold">Right Eye (OD)</Typography>
                              <Text className="text-text text-xs mt-0.5">
                                Sph: {rx.rightSphere ?? '0.00'} | Cyl: {rx.rightCylinder ?? '0.00'} | Axis: {rx.rightAxis ?? '0'}°
                              </Text>
                            </View>
                            <View style={{ borderColor: colors.borderLight }} className="flex-1 border-l pl-3">
                              <Typography variant="muted" weight="bold">Left Eye (OS)</Typography>
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
                              Notes: "{rx.notes}"
                            </Text>
                          )}
                        </View>
                      ))}

                      {/* Order quick link list */}
                      {visit.orders?.length > 0 && (
                        <View className="mt-2 pt-2 border-t border-borderLight">
                          <Text className="text-[10px] text-textMuted uppercase font-bold mb-1.5">Linked Orders</Text>
                          {visit.orders.map((ord: any) => (
                            <TouchableOpacity
                              key={ord.id}
                              onPress={() => navigation.navigate('OrderDetails', { orderId: ord.id })}
                              className="flex-row justify-between items-center py-1.5"
                            >
                              <View className="flex-row items-center" style={{ gap: 6 }}>
                                <Ionicons name="cube-outline" size={13} color={colors.primary} />
                                <Text className="text-textSecondary text-xs">{ord.orderNumber}</Text>
                              </View>
                              <StatusBadge status={ord.status} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </Card>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {activeTab === 'orders' && (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
            <Typography variant="h3" weight="bold" style={{ marginBottom: 16 }}>Spectacles Orders</Typography>

            {allOrders.length === 0 ? (
              <Card style={{ padding: 32, alignItems: 'center' }}>
                <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary }} className="text-sm mt-3 text-center">
                  No specs orders booked for this customer.
                </Text>
              </Card>
            ) : (
              allOrders.map((order: any) => {
                const dateLabel = new Date(order.visitDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric'
                });

                return (
                  <Card key={order.id} noPadding style={{ marginBottom: 16 }}>
                    <View className="p-4">
                      {/* Header */}
                      <View className="flex-row justify-between items-center mb-3">
                        <View>
                          <Typography variant="body" weight="bold">{order.orderNumber}</Typography>
                          <Typography variant="muted">{dateLabel} · Dr. {order.doctorName || 'General'}</Typography>
                        </View>
                        <StatusBadge status={order.status} />
                      </View>

                      {/* Product Details */}
                      <Text className="text-text font-bold text-sm">
                        {order.frameBrand || ''} {order.frameModel || ''} {order.frameName || 'Custom Spectacles'}
                      </Text>
                      {(order.lensType || order.lensCoating) && (
                        <Text className="text-textSecondary text-xs mt-1">
                          Lenses: {order.lensType || 'Standard'} ({order.lensCoating || 'Uncoated'})
                        </Text>
                      )}

                      {order.expectedDeliveryDate && (
                        <View className="flex-row items-center mt-2.5 bg-primary/5 px-2.5 py-1.5 rounded-lg" style={{ alignSelf: 'flex-start' }}>
                          <Ionicons name="time-outline" size={12} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text className="text-primary text-[11px] font-semibold">
                            Est. Delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                          </Text>
                        </View>
                      )}

                      {/* Pricing summary */}
                      <View style={{ borderColor: colors.borderLight }} className="flex-row justify-between items-center mt-4 pt-3 border-t">
                        <View>
                          <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase' }}>Total Price</Typography>
                          <Text className="text-text font-black text-sm mt-0.5">₹{order.total.toLocaleString()}</Text>
                        </View>
                        <View className="items-end">
                          <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase' }}>Dues Outstanding</Typography>
                          <Text className="text-sm font-black mt-0.5" style={{ color: order.balanceAmount > 0 ? colors.danger : colors.success }}>
                            ₹{order.balanceAmount.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Action */}
                      <TouchableOpacity
                        onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                        style={{ borderColor: colors.borderLight }}
                        className="flex-row items-center justify-center mt-4 pt-3 border-t"
                      >
                        <Text className="text-primary text-xs font-bold">View Full Order Details</Text>
                        <Ionicons name="chevron-forward" size={13} color={colors.primary} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>
        )}

        {activeTab === 'ledger' && (
          <View style={{ flex: 1 }}>
            <CustomerLedgerTab customerId={customerId} navigation={navigation} />
          </View>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1.2,
    borderBottomColor: colors.borderLight,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  // Outstanding Due
  balanceCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderColor: colors.dangerGlow,
  },
  balanceBtn: {
    backgroundColor: colors.danger,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  headerBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  // Timeline path
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 22,
    zIndex: 2,
  },
  track: {
    width: 1.5,
    flex: 1,
    marginVertical: 4,
    zIndex: 1,
  },
});
