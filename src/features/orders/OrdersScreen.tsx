import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Animated, StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors, shadows } from '../../theme/colors';
import { offlineCache } from '../../services/offlineCache';
import { StatusBadge } from '../../components/StatusBadge';

interface OrdersScreenProps { navigation: any; }

const FILTERS = ['ALL', 'PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];

function OrderCard({ item, onPress }: { item: any; onPress: () => void }) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const balance = (item.total || 0) - (item.paidAmount || 0);
  const isPaid = balance <= 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 14 }}>
      <TouchableOpacity
        style={s.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Header */}
        <View style={s.cardHeader}>
          <View style={s.orderNumberWrap}>
            <Text style={s.orderNumber}>{item.orderNumber}</Text>
            <StatusBadge status={item.status} size="sm" />
          </View>
          <View style={[s.paymentPill, { backgroundColor: isPaid ? '#10b98115' : '#f43f5e15' }]}>
            <Ionicons name={isPaid ? 'checkmark-circle' : 'alert-circle'} size={12} color={isPaid ? '#10b981' : '#f43f5e'} />
            <Text style={[s.paymentPillText, { color: isPaid ? '#10b981' : '#f43f5e' }]}>
              {isPaid ? 'PAID' : 'DUE'}
            </Text>
          </View>
        </View>

        {/* Customer & Specs */}
        <View style={s.customerRow}>
          <View style={s.avatarSm}>
            <Ionicons name="person-outline" size={12} color="#6366f1" />
          </View>
          <Text style={s.customerName}>{item.customer?.fullName}</Text>
        </View>

        {(item.frameBrand || item.lensType) && (
          <View style={s.specsRow}>
            <Ionicons name="eye-outline" size={13} color="#94a3b8" />
            <Text style={s.specsText} numberOfLines={1}>
              {item.frameBrand ? `${item.frameBrand} ${item.frameModel || ''}` : 'Frame'}
              {item.lensType ? ` • ${item.lensType}` : ''}
            </Text>
          </View>
        )}

        {/* Financial Footer */}
        <View style={s.footer}>
          <View style={s.footerCol}>
            <Text style={s.footerLabel}>Total Amount</Text>
            <Text style={s.footerVal}>₹{item.total?.toLocaleString('en-IN')}</Text>
          </View>
          <View style={s.footerDivider} />
          <View style={s.footerCol}>
            <Text style={s.footerLabel}>Balance Due</Text>
            <Text style={[s.footerVal, { color: isPaid ? '#10b981' : '#f43f5e' }]}>
              ₹{Math.max(balance, 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={s.footerDivider} />
          <View style={s.footerCol}>
            <Text style={s.footerLabel}>Due Date</Text>
            <Text style={[s.footerVal, { color: '#f1f5f9' }]}>
              {item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function OrdersScreen({ navigation }: OrdersScreenProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const { data: orders, isLoading, refetch } = useQuery<any>({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const response = await axiosClient.get(ENDPOINTS.orders.list);
        await offlineCache.setCache('orders', response.data);
        return response.data;
      } catch {
        const cached = await offlineCache.getCache<any>('orders');
        if (cached) return cached;
        throw new Error('Offline');
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filtered = (orders || []).filter((o: any) => {
    const q = search.toLowerCase();
    const matchSearch = o.orderNumber.toLowerCase().includes(q) ||
      (o.customer?.fullName && o.customer.fullName.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <View style={[s.screen, { paddingTop: insets.top > 0 ? insets.top : 0 }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Orders</Text>
            <Text style={s.headerSub}>{filtered.length} matching records</Text>
          </View>
          <TouchableOpacity
            style={s.fabSmall}
            onPress={() => navigation.navigate('AddOrder')}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color="#64748b" />
          <TextInput
            style={s.searchInput}
            placeholder="Search order # or customer..."
            placeholderTextColor="#475569"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersWrap}>
          {FILTERS.map((status) => {
            const isActive = statusFilter === status;
            return (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                style={[s.filterPill, isActive && s.filterPillActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.filterText, isActive && s.filterTextActive]}>
                  {status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {isLoading && !refreshing ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <OrderCard
              item={item}
              onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="receipt-outline" size={36} color="#334155" />
              </View>
              <Text style={s.emptyTitle}>
                {search || statusFilter !== 'ALL' ? 'No matches found' : 'No orders yet'}
              </Text>
              <Text style={s.emptySubtitle}>
                {search || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters'
                  : 'Create your first order to get started'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundSolid },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 14,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.1 },
  headerSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  fabSmall: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.primaryGlow,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
    marginHorizontal: 16, marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filtersWrap: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, backgroundColor: colors.border,
    borderWidth: 1, borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primaryGlow, borderColor: colors.primary,
  },
  filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.primary, fontWeight: '800' },
  list: { padding: 14, paddingBottom: 90 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 13 },

  // ── Card ──────────────────────────────────────
  card: {
    backgroundColor: colors.card,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  orderNumberWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderNumber: { color: colors.text, fontSize: 15, fontWeight: '800' },
  paymentPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100,
  },
  paymentPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 },
  avatarSm: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  customerName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  specsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, marginTop: 8, marginBottom: 4,
  },
  specsText: { color: colors.textSecondary, fontSize: 12 },
  footer: {
    flexDirection: 'row', backgroundColor: colors.surface,
    marginTop: 14, paddingVertical: 12, paddingHorizontal: 16,
  },
  footerCol: { flex: 1 },
  footerLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  footerVal: { color: colors.text, fontSize: 14, fontWeight: '800' },
  footerDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 12 },

  // ── Empty ────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { color: colors.textSecondary, fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
