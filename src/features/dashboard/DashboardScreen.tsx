import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

interface DashboardScreenProps {
  navigation: any;
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { user, clearAuth } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // TanStack Query for Dashboard Data
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.dashboard);
      return response.data;
    },
  });

  // TanStack Query for Notifications Data
  const { data: notificationsData, isLoading: isNotificationsLoading, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.notifications);
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDashboard(), refetchNotifications()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await clearAuth();
  };

  const isLoading = isDashboardLoading || isNotificationsLoading;

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-[#a1a1aa] mt-4 text-base">Loading dashboard...</Text>
      </View>
    );
  }

  const stats = dashboardData?.stats || {
    totalCustomers: 0,
    activeOrders: 0,
    completedOrders: 0,
    todaysOrders: 0,
  };

  const recentCustomers = dashboardData?.recentCustomers || [];
  const recentOrders = dashboardData?.recentOrders || [];
  const notifications = notificationsData || [];
  const recentAlerts = notifications.slice(0, 3); // top 3 alerts

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header Bar */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-white text-lg font-bold">Hello, {user?.fullName}</Text>
          <Text className="text-[#a1a1aa] text-xs mt-0.5">🏢 {user?.workspace?.name}</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-[#27272a] px-3.5 py-1.5 rounded-lg border border-[#3f3f46]"
        >
          <Text className="text-white text-xs font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Internal Alerts Preview */}
        {recentAlerts.length > 0 && (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-white text-lg font-bold">Latest Business Alerts</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Text className="text-[#6366f1] text-xs font-medium">See all</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
              {recentAlerts.map((alert: any, idx: number) => (
                <View
                  key={alert.id}
                  className={`p-4 flex-row items-start ${idx > 0 ? 'border-t border-[#27272a]' : ''}`}
                >
                  <Text className="text-lg mr-3">
                    {alert.type === 'NEW_ORDER' ? '🆕' :
                     alert.type === 'NEW_PRESCRIPTION' ? '👓' :
                     alert.type === 'ORDER_READY' ? '📦' :
                     alert.type === 'LOW_STOCK' ? '⚠️' :
                     alert.type === 'TODAY_APPOINTMENT' ? '📅' :
                     alert.type === 'PAYMENT_RECEIVED' ? '💰' :
                     alert.type === 'PENDING_ORDERS_OLD' ? '⏰' :
                     alert.type === 'CUSTOMER_BIRTHDAY' ? '🎂' :
                     alert.type === 'CUSTOMER_REVISIT' ? '🎂' : '🔔'}
                  </Text>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">{alert.title}</Text>
                    <Text className="text-[#a1a1aa] text-xs mt-1 leading-4">{alert.message}</Text>
                    <Text className="text-[#71717a] text-[10px] mt-1.5 font-medium">
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats Cards Section */}
        <Text className="text-white text-lg font-bold mb-3">Shop Stats</Text>
        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 w-[48%] mb-4">
            <Text className="text-2xl mb-1">👥</Text>
            <Text className="text-white text-xl font-bold">{stats.totalCustomers}</Text>
            <Text className="text-[#a1a1aa] text-xs mt-1">Total Customers</Text>
          </View>

          <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 w-[48%] mb-4">
            <Text className="text-2xl mb-1">📦</Text>
            <Text className="text-white text-xl font-bold">{stats.activeOrders}</Text>
            <Text className="text-[#a1a1aa] text-xs mt-1">Active Orders</Text>
          </View>

          <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 w-[48%] mb-4">
            <Text className="text-2xl mb-1">✅</Text>
            <Text className="text-white text-xl font-bold">{stats.completedOrders}</Text>
            <Text className="text-[#a1a1aa] text-xs mt-1">Completed Orders</Text>
          </View>

          <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 w-[48%] mb-4">
            <Text className="text-2xl mb-1">📅</Text>
            <Text className="text-white text-xl font-bold">{stats.todaysOrders}</Text>
            <Text className="text-[#a1a1aa] text-xs mt-1">Today's Orders</Text>
          </View>
        </View>

        {/* Recent Customers (last 5) */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-lg font-bold">Recent Customers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
              <Text className="text-[#6366f1] text-xs font-medium">View all</Text>
            </TouchableOpacity>
          </View>
          {recentCustomers.length === 0 ? (
            <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 items-center">
              <Text className="text-[#71717a] text-sm">No customers registered yet.</Text>
            </View>
          ) : (
            <View className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
              {recentCustomers.map((cust: any, idx: number) => (
                <View
                  key={cust.id}
                  className={`p-4 flex-row justify-between items-center ${idx > 0 ? 'border-t border-[#27272a]' : ''}`}
                >
                  <View>
                    <Text className="text-white font-bold text-sm">{cust.fullName}</Text>
                    <Text className="text-[#a1a1aa] text-xs mt-1">📞 {cust.phone}</Text>
                  </View>
                  <Text className="text-[#71717a] text-xs">
                    {formatDistanceToNow(new Date(cust.createdAt), { addSuffix: true })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Orders (last 5) */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-lg font-bold">Recent Orders</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text className="text-[#6366f1] text-xs font-medium">View all</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0 ? (
            <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 items-center">
              <Text className="text-[#71717a] text-sm">No orders placed yet.</Text>
            </View>
          ) : (
            <View className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
              {recentOrders.map((order: any, idx: number) => (
                <View
                  key={order.id}
                  className={`p-4 flex-row justify-between items-center ${idx > 0 ? 'border-t border-[#27272a]' : ''}`}
                >
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-white font-bold text-sm">{order.orderNumber}</Text>
                      <View className="bg-[#3f3f46] px-2 py-0.5 rounded ml-2">
                        <Text className="text-white text-[10px] font-bold">{order.status}</Text>
                      </View>
                    </View>
                    <Text className="text-[#a1a1aa] text-xs mt-1">👤 {order.customer?.fullName}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-white font-bold text-sm">₹{order.total}</Text>
                    <Text className="text-[#71717a] text-[10px] mt-1">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
