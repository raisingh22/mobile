import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, RefreshControl, StyleSheet, Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors } from '../../theme/colors';
import { offlineCache } from '../../services/offlineCache';

// Design System Components
import { SearchBar } from '../../components/SearchBar';
import { FilterChips } from '../../components/FilterChips';
import { Card } from '../../components/Card';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { EmptyState } from '../../components/EmptyState';
import { Typography } from '../../components/Typography';

const TAG_COLOR: Record<string, { color: string; bg: string }> = {
  'VIP':          { color: '#eab308', bg: '#eab30820' },
  'Regular':      { color: '#6366f1', bg: '#6366f120' },
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
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Card noPadding style={s.card}>
          <View style={s.cardInner}>
            {/* Avatar */}
            <View style={s.avatar}>
              <Typography variant="body" weight="bold" color={colors.primary}>{initials}</Typography>
              <View style={s.avatarOnline} />
            </View>

            {/* Content */}
            <View style={s.cardBody}>
              <Typography variant="body" weight="bold" color={colors.text}>{item.fullName}</Typography>
              <View style={s.infoRow}>
                <Ionicons name="call-outline" size={12} color={colors.textMuted} style={{ marginRight: 2 }} />
                <Typography variant="caption" color={colors.textSecondary}>{item.phone}</Typography>
                {item.email ? (
                  <>
                    <View style={s.dot} />
                    <Ionicons name="mail-outline" size={12} color={colors.textMuted} style={{ marginRight: 2 }} />
                    <Typography variant="caption" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>{item.email}</Typography>
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
                    <View style={[s.tag, { backgroundColor: colors.backgroundSolid }]}>
                      <Text style={[s.tagText, { color: colors.textMuted }]}>+{item.tags.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}

              {item.notes ? (
                <Typography variant="caption" color={colors.textMuted} style={s.notes} numberOfLines={1}>"{item.notes}"</Typography>
              ) : null}
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function CustomersScreen({ navigation }: CustomersScreenProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
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
    const matchesSearch =
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q));

    const matchesFilter = selectedFilter === 'ALL' || c.tags?.includes(selectedFilter);

    return matchesSearch && matchesFilter;
  });

  const filterOptions = [
    { label: 'All', value: 'ALL', icon: 'people-outline' as const },
    { label: 'VIP', value: 'VIP', icon: 'star-outline' as const },
    { label: 'Regular', value: 'Regular', icon: 'person-outline' as const },
    { label: 'New Patient', value: 'New Patient', icon: 'sparkles-outline' as const },
    { label: 'High Risk', value: 'High Risk', icon: 'warning-outline' as const },
    { label: 'Diabetic', value: 'Diabetic', icon: 'pulse-outline' as const },
    { label: 'Glaucoma', value: 'Glaucoma', icon: 'eye-outline' as const },
    { label: 'Contact Lens', value: 'Contact Lens', icon: 'glasses-outline' as const },
  ];

  return (
    <View style={[s.screen, { paddingTop: insets.top > 0 ? insets.top : 10 }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Typography variant="h2" weight="bold">Customers</Typography>
            <Typography variant="caption" color={colors.textSecondary}>
              {filtered.length} of {customersList.length} profiles
            </Typography>
          </View>
          <TouchableOpacity
            style={s.fabSmall}
            onPress={() => navigation.navigate('AddEditCustomer')}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search bar component */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, phone, email..."
        />
      </View>

      {/* Filter Chips */}
      <View style={s.filterWrapper}>
        <FilterChips
          options={filterOptions}
          selectedValues={selectedFilter}
          onChange={setSelectedFilter}
        />
      </View>

      {/* List */}
      {isLoading && !refreshing ? (
        <View style={s.loadingWrap}>
          {[1, 2, 3, 4, 5].map((key) => (
            <Card key={key} style={{ marginBottom: 10, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonLoader shape="circle" width={46} style={{ marginRight: 12 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonLoader shape="textLine" width="40%" height={16} />
                  <SkeletonLoader shape="textLine" width="60%" height={12} />
                  <SkeletonLoader shape="textLine" width="30%" height={12} />
                </View>
              </View>
            </Card>
          ))}
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
            <EmptyState
              title={search || selectedFilter !== 'ALL' ? 'No matches found' : 'No customers yet'}
              description={
                search || selectedFilter !== 'ALL'
                  ? 'Try adjusting your search or filters'
                  : 'Add your first customer to get started'
              }
              icon="people-outline"
              actionLabel={search || selectedFilter !== 'ALL' ? undefined : 'Add Customer'}
              onAction={() => navigation.navigate('AddEditCustomer')}
            />
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundSolid },
  header: {
    backgroundColor: colors.backgroundSolid,
    paddingHorizontal: 16, paddingBottom: 8, paddingTop: 10,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  fabSmall: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  filterWrapper: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 90 },
  loadingWrap: { paddingHorizontal: 16, paddingTop: 10 },
  // ── Card ──────────────────────────────────────
  card: {
    borderWidth: 1, borderColor: colors.borderLight,
    marginBottom: 0,
  },
  cardInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarOnline: {
    position: 'absolute', bottom: 0, right: 0,
    width: 11, height: 11, borderRadius: 5.5,
    backgroundColor: colors.success, borderWidth: 2, borderColor: colors.card,
  },
  cardBody: { flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border },
  tagsRow: { flexDirection: 'row', gap: 5, marginTop: 7, flexWrap: 'wrap' },
  tag: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 100,
  },
  tagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  notes: { marginTop: 5, fontStyle: 'italic' },
});
