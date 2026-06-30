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

const TAG_COLOR: Record<string, { color: string; bg: string }> = {
  'VIP':          { color: '#eab308', bg: '#eab30820' },
  'Regular':      { color: '#06b6d4', bg: '#06b6d420' },
  'New Patient':  { color: '#10b981', bg: '#10b98120' },
  'High Risk':    { color: '#ef4444', bg: '#ef444420' },
  'Diabetic':     { color: '#f97316', bg: '#f9731620' },
  'Glaucoma':     { color: '#a78bfa', bg: '#a78bfa20' },
  'Progressive':  { color: '#3b82f6', bg: '#3b82f620' },
  'Contact Lens': { color: '#14b8a6', bg: '#14b8a620' },
};

interface CustomersScreenProps { navigation: any; }

function CustomerCard({ item, onPress }: { item: any; onPress: () => void }) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const initials = item.fullName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

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
          <View style={s.avatarOnline} />
        </View>

        {/* Content */}
        <View style={s.cardBody}>
          <Text style={s.name}>{item.fullName}</Text>
          <View style={s.infoRow}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={s.infoText}>{item.phone}</Text>
            {item.email ? (
              <>
                <View style={s.dot} />
                <Ionicons name="mail-outline" size={12} color="#64748b" />
                <Text style={s.infoText} numberOfLines={1}>{item.email}</Text>
              </>
            ) : null}
          </View>

          {/* Tags */}
          {item.tags?.length > 0 && (
            <View style={s.tagsRow}>
              {item.tags.slice(0, 3).map((tag: string) => {
                const cfg = TAG_COLOR[tag] ?? { color: '#94a3b8', bg: '#94a3b820' };
                return (
                  <View key={tag} style={[s.tag, { backgroundColor: cfg.bg }]}>
                    <Text style={[s.tagText, { color: cfg.color }]}>{tag}</Text>
                  </View>
                );
              })}
              {item.tags.length > 3 && (
                <View style={[s.tag, { backgroundColor: '#1f2937' }]}>
                  <Text style={[s.tagText, { color: '#64748b' }]}>+{item.tags.length - 3}</Text>
                </View>
              )}
            </View>
          )}

          {item.notes ? (
            <Text style={s.notes} numberOfLines={1}>"{item.notes}"</Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color="#334155" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function CustomersScreen({ navigation }: CustomersScreenProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await axiosClient.get(ENDPOINTS.customers.list, { params: { limit: 100 } });
        await offlineCache.setCache('customers', response.data);
        return response.data;
      } catch {
        const cached = await offlineCache.getCache<any>('customers');
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

  const customersList = data?.data || [];
  const filtered = customersList.filter((c: any) => {
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <View style={[s.screen, { paddingTop: insets.top > 0 ? insets.top : 0 }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Customers</Text>
            <Text style={s.headerSub}>
              {filtered.length} of {customersList.length} profiles
            </Text>
          </View>
          <TouchableOpacity
            style={s.fabSmall}
            onPress={() => navigation.navigate('AddEditCustomer')}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color="#64748b" />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, phone, email..."
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
      </View>

      {/* List */}
      {isLoading && !refreshing ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading customers...</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <CustomerCard
              item={item}
              onPress={() => navigation.navigate('CustomerDetails', { customerId: item.id })}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="people-outline" size={36} color="#334155" />
              </View>
              <Text style={s.emptyTitle}>
                {search ? 'No matches found' : 'No customers yet'}
              </Text>
              <Text style={s.emptySubtitle}>
                {search
                  ? 'Try a different search term'
                  : 'Add your first customer to get started'}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => navigation.navigate('AddEditCustomer')}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>Add Customer</Text>
                </TouchableOpacity>
              )}
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
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  list: { padding: 14, paddingBottom: 90 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 13 },
  // ── Card ──────────────────────────────────────
  card: {
    backgroundColor: colors.card,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    ...shadows.cardShadow,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  avatarOnline: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 5.5,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.card,
  },
  cardBody: { flex: 1 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  infoText: { color: colors.textSecondary, fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border },
  tagsRow: { flexDirection: 'row', gap: 5, marginTop: 7, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 100,
  },
  tagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  notes: { color: colors.textMuted, fontSize: 11, marginTop: 5, fontStyle: 'italic' },
  // ── Empty ────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { color: colors.textSecondary, fontSize: 17, fontWeight: '700' },
  emptySubtitle: { color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 20, marginTop: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
