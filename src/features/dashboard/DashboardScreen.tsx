import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors, shadows } from '../../theme/colors';
import { useNotificationStore } from '../../store/notificationStore';
import { StatusBadge } from '../../components/StatusBadge';
import { offlineCache } from '../../services/offlineCache';

interface DashboardScreenProps { navigation: any; }

// ── Animated Metric Card ───────────────────────────────────────────
function MetricCard({
  label, value, icon, color, bg, delay = 0,
}: {
  label: string; value: number | string; icon: any;
  color: string; bg: string; delay?: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();
  const s = getStyles(colors);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: true, speed: 12, bounciness: 5 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.metricCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      {/* Left accent stripe */}
      <View style={[s.metricStripe, { backgroundColor: color }]} />
      <View style={s.metricBody}>
        <View style={[s.metricIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={s.metricValue}>{value}</Text>
        <Text style={s.metricLabel}>{label}</Text>
      </View>
    </Animated.View>
  );
}

// ── Mini Donut Ring ────────────────────────────────────────────────
function DonutRing({ paid, total, size = 80 }: { paid: number; total: number; size?: number }) {
  const pct = total > 0 ? Math.min(paid / total, 1) : 0;
  const stroke = 8;
  const r = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const colors = useThemeColors();
  // We simulate a donut using nested circles
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: colors.border,
      }} />
      {/* This is a simplified arc using rotation trick */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: 'transparent',
        borderTopColor: pct > 0 ? '#10b981' : 'transparent',
        borderRightColor: pct > 0.25 ? '#10b981' : 'transparent',
        borderBottomColor: pct > 0.5 ? '#10b981' : 'transparent',
        borderLeftColor: pct > 0.75 ? '#10b981' : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 14 }}>
            {Math.round(pct * 100)}%
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: '600' }}>PAID</Text>
        </View>
      </View>
    );
  }

// ── Notification icon helper ───────────────────────────────────────
function getNotifIcon(type: string): { name: any; color: string; bg: string } {
  switch (type) {
    case 'NEW_ORDER':         return { name: 'cart-outline',          color: '#06b6d4', bg: '#06b6d418' };
    case 'NEW_PRESCRIPTION':  return { name: 'eye-outline',           color: '#a78bfa', bg: '#a78bfa18' };
    case 'ORDER_READY':       return { name: 'cube-outline',          color: '#10b981', bg: '#10b98118' };
    case 'LOW_STOCK':         return { name: 'warning-outline',       color: '#f59e0b', bg: '#f59e0b18' };
    case 'TODAY_APPOINTMENT': return { name: 'calendar-outline',      color: '#3b82f6', bg: '#3b82f618' };
    case 'PAYMENT_RECEIVED':  return { name: 'cash-outline',          color: '#10b981', bg: '#10b98118' };
    case 'PENDING_ORDERS_OLD':return { name: 'time-outline',          color: '#f43f5e', bg: '#f43f5e18' };
    case 'CUSTOMER_BIRTHDAY':
    case 'CUSTOMER_REVISIT':  return { name: 'gift-outline',          color: '#ec4899', bg: '#ec489918' };
    default:                  return { name: 'notifications-outline', color: '#94a3b8', bg: '#94a3b818' };
  }
}

function getInitials(name?: string) {
  if (!name) return 'OP';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── Main Dashboard ─────────────────────────────────────────────────
export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { readIds } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const headerFade = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();
  const s = getStyles(colors);

  useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const response = await axiosClient.get(ENDPOINTS.dashboard);
        await offlineCache.setCache('dashboard', response.data);
        return response.data;
      } catch {
        const cached = await offlineCache.getCache<any>('dashboard');
        if (cached) return cached;
        throw new Error('Offline');
      }
    },
  });

  const { data: notificationsData, isLoading: isNotificationsLoading, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const response = await axiosClient.get(ENDPOINTS.notifications);
        await offlineCache.setCache('notifications', response.data);
        return response.data;
      } catch {
        const cached = await offlineCache.getCache<any>('notifications');
        if (cached) return cached;
        throw new Error('Offline');
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDashboard(), refetchNotifications()]);
    setRefreshing(false);
  };

  if ((isDashboardLoading || isNotificationsLoading) && !refreshing) {
    return (
      <View style={[s.screen, s.center]}>
        <View style={s.loadingOrb}>
          <Ionicons name="eye-outline" size={28} color="#06b6d4" />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
        <Text style={s.loadingText}>Loading your workspace...</Text>
      </View>
    );
  }

  const stats = dashboardData?.stats || { totalCustomers: 0, activeOrders: 0, completedOrders: 0, todaysOrders: 0 };
  const recentCustomers = dashboardData?.recentCustomers || [];
  const recentOrders = dashboardData?.recentOrders || [];
  const notifications = notificationsData || [];
  const unreadCount = notifications.filter((n: any) => !readIds.includes(n.id)).length;
  const recentAlerts = notifications.slice(0, 3);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

  // Revenue ring data from orders
  const totalRevenue = recentOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
  const paidRevenue = recentOrders.reduce((s: number, o: any) => s + (o.paidAmount || 0), 0);

  const METRICS = [
    { label: 'Customers', value: stats.totalCustomers, icon: 'people-outline', color: '#06b6d4', bg: '#06b6d418', delay: 0 },
    { label: 'Active Orders', value: stats.activeOrders, icon: 'cube-outline', color: '#a78bfa', bg: '#a78bfa18', delay: 60 },
    { label: 'Completed', value: stats.completedOrders, icon: 'checkmark-circle-outline', color: '#10b981', bg: '#10b98118', delay: 120 },
    { label: "Today's Orders", value: stats.todaysOrders, icon: 'today-outline', color: '#f59e0b', bg: '#f59e0b18', delay: 180 },
  ];

  return (
    <View style={s.screen}>
      {/* ── Header ── */}
      <Animated.View
        style={[s.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 20, opacity: headerFade }]}
      >
        {/* Hero greeting strip */}
        <View style={s.heroStrip}>
          <View style={s.heroBg1} />
          <View style={s.heroBg2} />

          <View style={s.heroRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{getInitials(user?.fullName)}</Text>
              </View>
            </TouchableOpacity>
            <View style={s.heroTextBlock}>
              <Text style={s.greetingText}>{greeting} 👋</Text>
              <Text style={s.heroName} numberOfLines={1}>{user?.fullName}</Text>
              <View style={s.workspaceRow}>
                <Ionicons name="business-outline" size={11} color="#64748b" />
                <Text style={s.workspaceName} numberOfLines={1}>{user?.workspace?.name}</Text>
              </View>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity
                style={s.notifBtn}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={19} color="#94a3b8" />
                {unreadCount > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.dateLabel}>{dateLabel}</Text>
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Metrics Grid ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Business Overview</Text>
        </View>
        <View style={s.metricsGrid}>
          {METRICS.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </View>

        {/* ── Financial Overview ── */}
        <View style={s.revenuePanel}>
          <View style={s.revenueBg} />
          <View style={s.revenueLeft}>
            <Text style={s.revenueTitle}>Financial Overview</Text>
            <Text style={s.revenueTotal}>₹{((stats.totalRevenue ?? 0) - (stats.totalExpenses ?? 0)).toLocaleString('en-IN')}</Text>
            <View style={s.revenueRow}>
              <View style={[s.revDot, { backgroundColor: '#10b981' }]} />
              <Text style={s.revLabel}>Total Revenue: ₹{(stats.totalRevenue ?? 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.revenueRow}>
              <View style={[s.revDot, { backgroundColor: '#ef4444' }]} />
              <Text style={s.revLabel}>Logged Expenses: ₹{(stats.totalExpenses ?? 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.revenueRow}>
              <View style={[s.revDot, { backgroundColor: '#06b6d4' }]} />
              <Text style={[s.revLabel, { color: '#06b6d4', fontWeight: 'bold' }]}>Net Profit: ₹{(stats.netProfit ?? 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#06b6d418', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#06b6d430' }}>
            <Ionicons name="wallet-outline" size={36} color="#06b6d4" />
          </View>
        </View>

        {/* ── Alerts ── */}
        {recentAlerts.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Alerts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              {recentAlerts.map((alert: any, idx: number) => {
                const cfg = getNotifIcon(alert.type);
                const isUnread = !readIds.includes(alert.id);
                return (
                  <View key={alert.id} style={[s.alertRow, idx > 0 && s.alertBorder]}>
                    {isUnread && <View style={s.unreadDot} />}
                    <View style={[s.alertIcon, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.name} size={17} color={cfg.color} />
                    </View>
                    <View style={s.alertContent}>
                      <Text style={s.alertTitle}>{alert.title}</Text>
                      <Text style={s.alertMsg} numberOfLines={2}>{alert.message}</Text>
                      <Text style={s.alertTime}>
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Quick Actions</Text>
          <View style={s.quickGrid}>
            {[
              { label: 'New Customer',     icon: 'person-add-outline', color: '#06b6d4', screen: 'AddEditCustomer', params: {} },
              { label: 'New Order',        icon: 'cart-outline',        color: '#a78bfa', screen: 'AddOrder',        params: {} },
              { label: 'Book Appt',        icon: 'calendar-outline',    color: '#10b981', screen: 'AddEditAppointment', params: {} },
              { label: 'Receipt Pad',      icon: 'document-text-outline', color: '#f59e0b', screen: 'ReceiptPad',      params: {} },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={s.quickBtn}
                onPress={() => navigation.navigate(action.screen, action.params)}
                activeOpacity={0.75}
              >
                <View style={[s.quickIcon, { backgroundColor: action.color + '18' }]}>
                  <Ionicons name={action.icon as any} size={22} color={action.color} />
                </View>
                <Text style={s.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Customers ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Customers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
              <Text style={s.seeAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentCustomers.length === 0 ? (
            <View style={[s.card, s.emptyState]}>
              <Ionicons name="people-outline" size={28} color="#334155" />
              <Text style={s.emptyText}>No customers yet</Text>
            </View>
          ) : (
            <View style={s.card}>
              {recentCustomers.map((cust: any, idx: number) => (
                <TouchableOpacity
                  key={cust.id}
                  style={[s.listRow, idx > 0 && s.listBorder]}
                  onPress={() => navigation.navigate('CustomerDetails', { customerId: cust.id })}
                  activeOpacity={0.75}
                >
                  <View style={s.custAvatar}>
                    <Text style={s.custAvatarText}>
                      {cust.fullName.split(' ').slice(0,2).map((w: string) => w[0]).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.listContent}>
                    <Text style={s.listName}>{cust.fullName}</Text>
                    <View style={s.infoRow}>
                      <Ionicons name="call-outline" size={11} color="#64748b" />
                      <Text style={s.infoText}>{cust.phone}</Text>
                    </View>
                  </View>
                  <Text style={s.timeAgo}>
                    {formatDistanceToNow(new Date(cust.createdAt), { addSuffix: true })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Recent Orders ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={s.seeAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0 ? (
            <View style={[s.card, s.emptyState]}>
              <Ionicons name="receipt-outline" size={28} color="#334155" />
              <Text style={s.emptyText}>No orders yet</Text>
            </View>
          ) : (
            <View style={s.card}>
              {recentOrders.map((order: any, idx: number) => (
                <TouchableOpacity
                  key={order.id}
                  style={[s.listRow, idx > 0 && s.listBorder]}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                  activeOpacity={0.75}
                >
                  <View style={s.orderIcon}>
                    <Ionicons name="receipt-outline" size={16} color="#a78bfa" />
                  </View>
                  <View style={s.listContent}>
                    <View style={s.orderTopRow}>
                      <Text style={s.listName}>{order.orderNumber}</Text>
                      <StatusBadge status={order.status} size="sm" />
                    </View>
                    <View style={s.infoRow}>
                      <Ionicons name="person-outline" size={11} color="#64748b" />
                      <Text style={s.infoText}>{order.customer?.fullName}</Text>
                    </View>
                  </View>
                  <View style={s.orderAmountCol}>
                    <Text style={s.orderAmount}>₹{order.total?.toLocaleString('en-IN')}</Text>
                    <Text style={s.timeAgo}>
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundSolid },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 48 },

  // ── Loading ────────────────────────────────────
  loadingOrb: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryGlow, borderWidth: 2, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 14 },

  // ── Header / Hero ──────────────────────────────
  header: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  heroStrip: { paddingHorizontal: 20, paddingBottom: 18, overflow: 'hidden' },
  heroBg1: {
    position: 'absolute', top: -40, right: -20,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.primary, opacity: 0.06,
  },
  heroBg2: {
    position: 'absolute', bottom: -60, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.info, opacity: 0.05,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
  heroTextBlock: { flex: 1 },
  greetingText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 1 },
  heroName: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  workspaceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  workspaceName: { color: colors.textSecondary, fontSize: 11 },
  headerActions: { alignItems: 'flex-end' },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: colors.primary,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.card,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  dateLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },

  // ── Section ────────────────────────────────────
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
  seeAll: { color: colors.primary, fontSize: 12, fontWeight: '600' },

  // ── Metrics ────────────────────────────────────
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginTop: 12,
  },
  metricCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', flexDirection: 'row',
    ...shadows.cardShadow,
  },
  metricStripe: { width: 4, alignSelf: 'stretch' },
  metricBody: { flex: 1, padding: 14 },
  metricIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  metricValue: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 },

  // ── Revenue Panel ──────────────────────────────
  revenuePanel: {
    marginTop: 20, backgroundColor: colors.card,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', overflow: 'hidden',
    ...shadows.cardShadow,
  },
  revenueBg: {
    position: 'absolute', top: -30, right: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: colors.success, opacity: 0.06,
  },
  revenueLeft: { flex: 1, marginRight: 16 },
  revenueTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  revenueTotal: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  revDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  revLabel: { color: colors.textSecondary, fontSize: 12 },

  // ── Alerts ─────────────────────────────────────
  card: {
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', ...shadows.cardShadow,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  alertBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  unreadDot: {
    position: 'absolute', top: 18, left: 6,
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary,
  },
  alertIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  alertContent: { flex: 1 },
  alertTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  alertMsg: { color: colors.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 },
  alertTime: { color: colors.textMuted, fontSize: 10, marginTop: 4, fontWeight: '500' },

  // ── Quick Actions ──────────────────────────────
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 14, alignItems: 'center',
    ...shadows.cardShadow,
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  quickLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  // ── List rows ──────────────────────────────────
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  listBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  custAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primaryGlow, borderWidth: 1.5, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  custAvatarText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  orderIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.purpleGlow, borderWidth: 1.5, borderColor: colors.purpleGlow,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  listContent: { flex: 1 },
  listName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  infoText: { color: colors.textSecondary, fontSize: 12 },
  orderTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderAmountCol: { alignItems: 'flex-end' },
  orderAmount: { color: colors.text, fontWeight: '700', fontSize: 14 },
  timeAgo: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  emptyState: { alignItems: 'center', padding: 30 },
  emptyText: { color: colors.textMuted, fontSize: 13, marginTop: 10 },
});
