import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors, shadows } from '../../theme/colors';

interface PrescriptionsScreenProps {
  navigation: any;
}

function PatientPrescriptionCard({ item, navigation }: { item: any; navigation: any }) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const initials = item.fullName.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 12 }}>
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('CustomerDetails', { customerId: item.id })}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={s.cardBody}>
          <Text style={s.name}>{item.fullName}</Text>
          <View style={s.infoRow}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={s.infoText}>{item.phone}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="eye-outline" size={12} color="#a78bfa" />
            <Text style={s.actionHint}>Tap to view prescription history</Text>
          </View>
        </View>

        {/* Quick Add Prescription Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddPrescription', { customerId: item.id })}
          style={s.addRxBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#06b6d4" />
          <Text style={s.addRxBtnText}>New Rx</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function PrescriptionsScreen({ navigation }: PrescriptionsScreenProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.list, { params: { limit: 100 } });
      return response.data;
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
      c.phone.includes(q)
    );
  });

  return (
    <View style={[s.screen, { paddingTop: insets.top > 0 ? insets.top : 0 }]}>
      {/* Header */}
      <View style={s.header}>
        <View className="flex-row items-center">
          <View style={s.headerIcon}>
            <Ionicons name="eye-outline" size={18} color="#06b6d4" />
          </View>
          <View>
            <Text style={s.headerTitle}>Eye Prescriptions</Text>
            <Text style={s.headerSub}>{customersList.length} patient profiles</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={17} color="#64748b" />
          <TextInput
            style={s.searchInput}
            placeholder="Search patient name or phone..."
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
          <Text style={s.loadingText}>Loading patients...</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) => (
            <PatientPrescriptionCard item={item} navigation={navigation} />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="eye-off-outline" size={36} color="#334155" />
              </View>
              <Text style={s.emptyTitle}>
                {search ? 'No matches found' : 'No patients registered'}
              </Text>
              <Text style={s.emptySubtitle}>
                {search
                  ? 'Try looking up a different patient'
                  : 'Register a customer from the Dashboard to add prescriptions'}
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
  headerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 0.1 },
  headerSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card,
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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.purpleGlow,
    borderWidth: 2, borderColor: colors.purpleGlow,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.purple, fontWeight: '800', fontSize: 14 },
  cardBody: { flex: 1, gap: 3 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  infoText: { color: colors.textSecondary, fontSize: 12 },
  actionHint: { color: colors.textDisabled, fontSize: 11, fontWeight: '500' },
  addRxBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryGlow, borderStyle: 'solid',
    borderWidth: 1.2, borderColor: colors.borderGlow,
    borderRadius: 12, width: 64, height: 48, gap: 2,
  },
  addRxBtnText: { color: colors.primary, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
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
