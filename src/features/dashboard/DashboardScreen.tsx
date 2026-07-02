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
import { useThemeColors } from '../../theme/colors';
import { useNotificationStore } from '../../store/notificationStore';
import { StatusBadge } from '../../components/StatusBadge';
import { offlineCache } from '../../services/offlineCache';

// Design System Components
import { Card } from '../../components/Card';
import { Typography } from '../../components/Typography';
import { ChartCard } from '../../components/ChartCard';

interface DashboardScreenProps { navigation: any; }

// ── Smooth Animated Counter for Numbers ──
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    if (start === end) {
      setDisplayVal(end);
      return;
    }

    const duration = 800; // ms
    const incrementTime = 30; // ms
    const stepsCount = Math.floor(duration / incrementTime);
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentVal = Math.round((end * step) / stepsCount);
      if (step >= stepsCount) {
        clearInterval(timer);
        setDisplayVal(end);
      } else {
        setDisplayVal(currentVal);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <Text>{prefix}{displayVal.toLocaleString('en-IN')}{suffix}</Text>;
}

// ── Animated Metric Card ───────────────────────────────────────────
function MetricCard({
  label, value, icon, color, bg, delay = 0,
}: {
  label: string; value: number; icon: any;
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
      <Card noPadding style={s.metricCardInner}>
        {/* Left accent stripe */}
        <View style={[s.metricStripe, { backgroundColor: color }]} />
        <View style={s.metricBody}>
          <View style={[s.metricIcon, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text style={s.metricValue}>
            <AnimatedCounter value={value} />
          </Text>
          <Text style={s.metricLabel}>{label}</Text>
        </View>
      </Card>
    </Animated.View>
  );
}

// ── Notification icon helper ───────────────────────────────────────
function getNotifIcon(type: string): { name: any; color: string; bg: string } {
  switch (type) {
    case 'NEW_ORDER':         return { name: 'cart-outline',          color: '#6366f1', bg: '#6366f118' };
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
          <Ionicons name="eye-outline" size={28} color={colors.primary} />
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

  const METRICS = [
    { label: 'Customers', value: stats.totalCustomers, icon: 'people-outline', color: colors.primary, bg: colors.primaryGlow, delay: 0 },
    { label: 'Active Orders', value: stats.activeOrders, icon: 'cube-outline', color: '#a78bfa', bg: '#a78bfa18', delay: 60 },
    { label: 'Completed', value: stats.completedOrders, icon: 'checkmark-circle-outline', color: '#10b981', bg: '#10b98118', delay: 120 },
    { label: "Today's Orders", value: stats.todaysOrders, icon: 'today-outline', color: '#f59e0b', bg: '#f59e0b18', delay: 180 },
  ];

  // Dynamic progress parameters for ChartCard
  const progressChartData = [
    { label: 'Collections Ratio', value: Math.max(0, (stats.totalRevenue || 0) - (stats.totalOutstanding || 0)), secondaryValue: stats.totalRevenue || 1, color: '#10b981' },
    { label: 'Order Fulfillment', value: stats.completedOrders || 0, secondaryValue: (stats.activeOrders || 0) + (stats.completedOrders || 0) || 1, color: colors.primary },
    { label: 'Target Completion', value: stats.completedOrders || 0, secondaryValue: 25, color: '#fbbf24' }
  ];

  const netProfit = (stats.totalRevenue ?? 0) - (stats.totalExpenses ?? 0);

  return (
    <View style={s.screen}>
      {/* ── Header ── */}
      <Animated.View
        style={[s.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 20, opacity: headerFade }]}
      >
        <View style={s.heroStrip}>
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
                <Ionicons name="business-outline" size={11} color={colors.textMuted} />
                <Text style={s.workspaceName} numberOfLines={1}>{user?.workspace?.name}</Text>
              </View>
            </View>
            <View style={s.headerActions}>
              <TouchableOpacity
                style={s.notifBtn}
                onPress={() => navigation.navigate('Notifications')}
              >
                <Ionicons name="notifications-outline" size={19} color={colors.textSecondary} />
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
          <Text style={s.sectionTitle}>Business Command Center</Text>
        </View>
        <View style={s.metricsGrid}>
          {METRICS.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </View>

        {/* ── Financial Overview (Interactive Counters) ── */}
        <Card style={s.revenuePanel}>
          <View style={s.revenueLeft}>
            <Text style={s.revenueTitle}>Net Profit Yield</Text>
            <Text style={s.revenueTotal}>
              <AnimatedCounter value={netProfit} prefix="₹" />
            </Text>
            <View style={s.revenueRow}>
              <View style={[s.revDot, { backgroundColor: '#10b981' }]} />
              <Text style={s.revLabel}>Total Revenue: <AnimatedCounter value={stats.totalRevenue ?? 0} prefix="₹" /></Text>
            </View>
            <View style={s.revenueRow}>
              <View style={[s.revDot, { backgroundColor: '#ef4444' }]} />
              <Text style={s.revLabel}>Logged Expenses: <AnimatedCounter value={stats.totalExpenses ?? 0} prefix="₹" /></Text>
            </View>
            <View style={s.revenueRow}>
              <View style={[s.revDot, { backgroundColor: '#f43f5e' }]} />
              <Text style={[s.revLabel, { color: '#f43f5e', fontWeight: 'bold' }]}>Outstanding Dues: <AnimatedCounter value={stats.totalOutstanding ?? 0} prefix="₹" /></Text>
            </View>
          </View>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderGlow }}>
            <Ionicons name="stats-chart" size={32} color={colors.primary} />
          </View>
        </Card>

        {/* ── Live Key Targets Graph Card ── */}
        <ChartCard
          title="Fulfillment & collections"
          subtitle="Real-time KPI progress metrics"
          type="progress"
          data={progressChartData}
          style={{ marginBottom: 16 }}
        />

        {/* ── Alerts ── */}
        {recentAlerts.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>System Intelligence Alerts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <Card noPadding style={{ overflow: 'hidden' }}>
              {recentAlerts.map((alert: any, idx: number) => {
                const cfg = getNotifIcon(alert.type);
                const isUnread = !readIds.includes(alert.id);
                return (
                  <View key={alert.id} style={[s.alertRow, idx > 0 && s.alertBorder]}>
                    {isUnread && <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />}
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
            </Card>
          </View>
        )}

        {/* ── Quick Actions Grid ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Refraction Console Actions</Text>
          <View style={s.quickGrid}>
            {[
              { label: 'Add Cust',         icon: 'person-add-outline', color: colors.primary, screen: 'AddEditCustomer', params: {} },
              { label: 'New Order',        icon: 'cart-outline',        color: '#a78bfa', screen: 'AddOrder',        params: {} },
              { label: 'Ledger Statement', icon: 'wallet-outline',      color: colors.info, screen: 'Ledger',          params: {} },
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
            <Text style={s.sectionTitle}>Recent Profiles</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
              <Text style={s.seeAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentCustomers.length === 0 ? (
            <Card style={s.emptyState}>
              <Ionicons name="people-outline" size={28} color={colors.textDisabled} />
              <Text style={s.emptyText}>No customers logged</Text>
            </Card>
          ) : (
            <Card noPadding style={{ overflow: 'hidden' }}>
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
                      <Ionicons name="call-outline" size={11} color={colors.textMuted} style={{ marginRight: 2 }} />
                      <Text style={s.infoText}>{cust.phone}</Text>
                    </View>
                  </View>
                  <Text style={s.timeAgo}>
                    {formatDistanceToNow(new Date(cust.createdAt), { addSuffix: true })}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
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
            <Card style={s.emptyState}>
              <Ionicons name="receipt-outline" size={28} color={colors.textDisabled} />
              <Text style={s.emptyText}>No orders registered</Text>
            </Card>
          ) : (
            <Card noPadding style={{ overflow: 'hidden' }}>
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
                      <Ionicons name="person-outline" size={11} color={colors.textMuted} style={{ marginRight: 2 }} />
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
            </Card>
          )}
        </View>

        {/* ── Top Debtors ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Top Debtors</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Ledger')}>
              <Text style={s.seeAll}>View all dues →</Text>
            </TouchableOpacity>
          </View>
          {!dashboardData?.topDebtors || dashboardData.topDebtors.length === 0 ? (
            <Card style={s.emptyState}>
              <Ionicons name="wallet-outline" size={28} color={colors.textDisabled} />
              <Text style={s.emptyText}>No outstanding client balances</Text>
            </Card>
          ) : (
            <Card noPadding style={{ overflow: 'hidden' }}>
              {dashboardData.topDebtors.map((debtor: any, idx: number) => (
                <TouchableOpacity
                  key={debtor.id}
                  style={[s.listRow, idx > 0 && s.listBorder]}
                  onPress={() => navigation.navigate('CustomerDetails', { customerId: debtor.customerId })}
                  activeOpacity={0.75}
                >
                  <View style={[s.custAvatar, { backgroundColor: colors.dangerGlow, borderColor: colors.danger + '30' }]}>
                    <Text style={[s.custAvatarText, { color: colors.danger }]}>
                      {debtor.customerName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                    </Text>
                  </View>
                  <View style={s.listContent}>
                    <Text style={s.listName}>{debtor.customerName}</Text>
                    <View style={s.infoRow}>
                      <Ionicons name="call-outline" size={11} color={colors.textMuted} style={{ marginRight: 2 }} />
                      <Text style={s.infoText}>{debtor.phone}</Text>
                    </View>
                  </View>
                  <Text style={[s.orderAmount, { color: colors.danger, fontWeight: '800' }]}>
                    ₹{debtor.outstandingAmount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
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
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryGlow, borderWidth: 1.5, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  heroTextBlock: { flex: 1 },
  greetingText: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  workspaceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  workspaceName: { color: colors.textSecondary, fontSize: 11 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.cardHover, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderLight, position: 'relative',
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: colors.primary, minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  dateLabel: { color: colors.textMuted, fontSize: 11, marginTop: 14, fontWeight: '600' },

  // ── Metrics Grid ──────────────────────────────
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: { width: '48.5%' },
  metricCardInner: { flex: 1, borderWidth: 1, borderColor: colors.borderLight },
  metricStripe: { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  metricBody: { padding: 14, paddingLeft: 18 },
  metricIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  metricLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', marginTop: 2 },

  // ── Financial Panel ────────────────────────────
  revenuePanel: {
    padding: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  revenueLeft: { flex: 1 },
  revenueTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.2 },
  revenueTotal: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 4, marginBottom: 8 },
  revenueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  revDot: { width: 6, height: 6, borderRadius: 3 },
  revLabel: { color: colors.textSecondary, fontSize: 11 },

  // ── Sections ───────────────────────────────────
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
  seeAll: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: colors.borderLight },
  emptyState: { paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 12, marginTop: 8 },

  // ── Alert Row ──────────────────────────────────
  alertRow: { flexDirection: 'row', padding: 12, alignItems: 'center', position: 'relative' },
  alertBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  unreadDot: { position: 'absolute', left: 8, top: '50%', marginTop: -3, width: 6, height: 6, borderRadius: 3 },
  alertIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  alertContent: { flex: 1 },
  alertTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  alertMsg: { color: colors.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 15 },
  alertTime: { color: colors.textMuted, fontSize: 9, marginTop: 4, fontWeight: '600' },

  // ── Quick Actions ──────────────────────────────
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickBtn: { flex: 1, alignItems: 'center' },
  quickIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 1.2, borderColor: colors.borderLight,
  },
  quickLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', textAlign: 'center' },

  // ── List Row (Customers & Orders) ──────────────
  listRow: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  listBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  custAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.borderGlow,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  custAvatarText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  listContent: { flex: 1 },
  listName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  infoText: { color: colors.textSecondary, fontSize: 11 },
  timeAgo: { color: colors.textMuted, fontSize: 9, fontWeight: '600' },

  orderIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#a78bfa18', alignItems: 'center', justifyContent: 'center', marginRight: 12,
    borderWidth: 1, borderColor: '#a78bfa25',
  },
  orderTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderAmountCol: { alignItems: 'flex-end' },
  orderAmount: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
