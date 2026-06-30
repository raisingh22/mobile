import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors, shadows } from '../../theme/colors';
import { offlineCache } from '../../services/offlineCache';

interface LedgerScreenProps { navigation: any; }

function LedgerCard({ item, onPress }: { item: any; onPress: () => void }) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const initials = item.customerName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const isOutstanding = item.currentBalance > 0;
  const statusColor = isOutstanding ? colors.danger : colors.success;
  const statusBg = isOutstanding ? colors.dangerGlow : colors.successGlow;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 10 }}>
      <TouchableOpacity
        style={s.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>

        {/* Content */}
        <View style={s.cardBody}>
          <Text style={s.name}>{item.customerName}</Text>
          <View style={s.infoRow}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={s.infoText}>{item.phone}</Text>
            <View style={s.dot} />
            <Ionicons name="receipt-outline" size={12} color="#64748b" />
            <Text style={s.infoText}>{item.totalOrders} orders</Text>
          </View>

          {/* Money summary */}
          <View style={s.moneyRow}>
            <View>
              <Text style={s.moneyLabel}>Billed</Text>
              <Text style={s.moneyValue}>₹{item.totalPurchase.toLocaleString()}</Text>
            </View>
            <View>
              <Text style={s.moneyLabel}>Paid</Text>
              <Text style={[s.moneyValue, { color: colors.success }]}>₹{item.totalPaid.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.moneyLabel}>Due</Text>
              <Text style={[s.moneyValue, { color: statusColor, fontWeight: '800' }]}>₹{item.currentBalance.toLocaleString()}</Text>
            </View>
          </View>

          {item.lastPaymentDate ? (
            <Text style={s.lastPaymentText}>
              Last payment: {new Date(item.lastPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          ) : (
            <Text style={s.lastPaymentText}>No payments recorded</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color="#334155" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function LedgerSkeleton() {
  const colors = useThemeColors();
  const s = getStyles(colors);
  return (
    <View style={s.cardSkeleton}>
      <View style={s.avatarSkeleton} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={s.lineSkeletonShort} />
        <View style={s.lineSkeletonMedium} />
        <View style={s.lineSkeletonLong} />
      </View>
    </View>
  );
}

export function LedgerScreen({ navigation }: LedgerScreenProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'outstanding' | 'paid'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['ledgers', activeFilter, search],
    queryFn: async () => {
      try {
        const response = await axiosClient.get(ENDPOINTS.ledger.list, {
          params: { search, filter: activeFilter, limit: 100 }
        });
        if (activeFilter === 'all' && !search) {
          await offlineCache.setCache('ledgers_all', response.data);
        }
        return response.data;
      } catch {
        const cached = await offlineCache.getCache<any>('ledgers_all');
        if (cached) return cached;
        throw new Error('Offline');
      }
    },
  });

  const { data: reportData } = useQuery<any>({
    queryKey: ['ledger-report'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.ledger.report);
      return response.data;
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const ledgersList = data?.data || [];
  const stats = reportData?.summary || { totalOutstanding: 0, todayCollections: 0, monthCollections: 0 };

  return (
    <View style={[s.screen, { paddingTop: insets.top > 0 ? insets.top : 0 }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Financial Ledger</Text>
            <Text style={s.headerSub}>
              Manage customer outstanding dues
            </Text>
          </View>
          <TouchableOpacity
            style={s.reportBtn}
            onPress={() => {
              // Open reports or quick overview
              alert('Ledger Aging Summary:\n\n0-30 Days: ₹' + (reportData?.aging?.days0_30?.toLocaleString() || '0') +
                    '\n31-60 Days: ₹' + (reportData?.aging?.days31_60?.toLocaleString() || '0') +
                    '\n61-90 Days: ₹' + (reportData?.aging?.days61_90?.toLocaleString() || '0') +
                    '\n90+ Days: ₹' + (reportData?.aging?.days91_plus?.toLocaleString() || '0'));
            }}
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={s.summaryBox}>
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>Outstanding Dues</Text>
            <Text style={[s.summaryVal, { color: colors.danger }]}>₹{stats.totalOutstanding.toLocaleString()}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryCol}>
            <Text style={s.summaryLabel}>Today's Collections</Text>
            <Text style={[s.summaryVal, { color: colors.success }]}>₹{stats.todayCollections.toLocaleString()}</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color="#64748b" />
          <TextInput
            style={s.searchInput}
            placeholder="Search customer name or mobile..."
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

        {/* Filters tab row */}
        <View style={s.filterRow}>
          {[
            { key: 'all', label: 'All Ledgers' },
            { key: 'outstanding', label: 'Dues Pending' },
            { key: 'paid', label: 'Fully Paid' }
          ].map((f) => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterTab, active && s.filterTabActive]}
                onPress={() => setActiveFilter(f.key as any)}
              >
                <Text style={[s.filterText, active && s.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      {isLoading && !refreshing ? (
        <View style={{ flex: 1, padding: 14 }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <LedgerSkeleton key={idx} />
          ))}
        </View>
      ) : (
        <FlashList
          data={ledgersList}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <LedgerCard
              item={item}
              onPress={() => navigation.navigate('CustomerDetails', { customerId: item.customerId })}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="wallet-outline" size={36} color="#334155" />
              </View>
              <Text style={s.emptyTitle}>
                {search ? 'No matches found' : 'No ledger records'}
              </Text>
              <Text style={s.emptySubtitle}>
                {search
                  ? 'Try a different search term'
                  : 'Customer accounts will appear here once financial transactions occur.'}
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
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 16,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.1 },
  headerSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  reportBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderGlow,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, padding: 14, marginBottom: 14,
    alignItems: 'center',
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  summaryVal: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  summaryDivider: { width: 1.5, height: 36, backgroundColor: colors.border },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10, gap: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  filterTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primaryGlow,
    borderColor: colors.primary,
  },
  filterText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: colors.primary, fontWeight: '700' },
  list: { padding: 14, paddingBottom: 90 },
  // ── Card ──────────────────────────────────────
  card: {
    backgroundColor: colors.card,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    ...shadows.cardShadow,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  cardBody: { flex: 1 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  infoText: { color: colors.textSecondary, fontSize: 11 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border },
  moneyRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight,
    paddingTop: 8,
  },
  moneyLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase', fontWeight: '600' },
  moneyValue: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
  lastPaymentText: { color: colors.textMuted, fontSize: 10, marginTop: 10, fontStyle: 'italic' },
  // ── Skeletons ─────────────────────────────────
  cardSkeleton: {
    backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    padding: 14, flexDirection: 'row', gap: 12, marginBottom: 10, height: 110, alignItems: 'center',
    opacity: 0.6,
  },
  avatarSkeleton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
  lineSkeletonShort: { width: '40%', height: 14, borderRadius: 4, backgroundColor: colors.border },
  lineSkeletonMedium: { width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border },
  lineSkeletonLong: { width: '80%', height: 10, borderRadius: 4, backgroundColor: colors.border },
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
