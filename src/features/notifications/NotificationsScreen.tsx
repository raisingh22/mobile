import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useNotificationStore } from '../../store/notificationStore';
import { colors } from '../../theme/colors';

interface NotificationsScreenProps {
  navigation: any;
}

export function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { readIds, markAsRead, markAllAsRead } = useNotificationStore();

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.notifications);
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleMarkAllRead = () => {
    const unreadIds = notifications.map((n) => n.id);
    markAllAsRead(unreadIds);
  };

  const handleNotificationTap = (item: any) => {
    markAsRead(item.id);

    // Deep routing logic based on notification ID format
    const idParts = item.id.split('-');
    const entityId = idParts[idParts.length - 1];

    if (
      item.type === 'NEW_ORDER' ||
      item.type === 'ORDER_READY' ||
      item.type === 'TODAY_APPOINTMENT' ||
      item.type === 'PAYMENT_RECEIVED' ||
      item.type === 'PENDING_ORDERS_OLD'
    ) {
      // Find the order ID from the notification ID.
      // E.g. new-order-cuid, ready-order-cuid, pending-old-cuid, payment-received-cuid
      navigation.navigate('OrderDetails', { orderId: entityId });
    } else if (item.type === 'CUSTOMER_BIRTHDAY' || item.type === 'CUSTOMER_REVISIT') {
      // E.g. revisit-cuid, birthday-cuid-2026
      // For birthday, the format is birthday-customerId-year, so customerId is the second-to-last item
      const customerId = item.type === 'CUSTOMER_BIRTHDAY' ? idParts[1] : entityId;
      navigation.navigate('CustomerDetails', { customerId });
    }
  };

  // Filter list
  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') {
      return !readIds.includes(item.id);
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return { name: 'cart-outline' as const, color: '#6366f1', bg: 'bg-primary/10' };
      case 'NEW_PRESCRIPTION':
        return { name: 'eye-outline' as const, color: '#a78bfa', bg: 'bg-[#a78bfa]/10' };
      case 'ORDER_READY':
        return { name: 'cube-outline' as const, color: '#10b981', bg: 'bg-[#10b981]/10' };
      case 'LOW_STOCK':
        return { name: 'warning-outline' as const, color: '#f59e0b', bg: 'bg-[#f59e0b]/10' };
      case 'TODAY_APPOINTMENT':
        return { name: 'calendar-outline' as const, color: '#3b82f6', bg: 'bg-[#3b82f6]/10' };
      case 'PAYMENT_RECEIVED':
        return { name: 'cash-outline' as const, color: '#10b981', bg: 'bg-[#10b981]/10' };
      case 'PENDING_ORDERS_OLD':
        return { name: 'time-outline' as const, color: '#f43f5e', bg: 'bg-[#f43f5e]/10' };
      case 'CUSTOMER_BIRTHDAY':
      case 'CUSTOMER_REVISIT':
        return { name: 'gift-outline' as const, color: '#ec4899', bg: 'bg-[#ec4899]/10' };
      default:
        return { name: 'notifications-outline' as const, color: '#9ca3af', bg: 'bg-[#9ca3af]/10' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUnread = !readIds.includes(item.id);
    const iconConfig = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        className={`p-4 mb-3 border rounded-xl flex-row items-start ${
          isUnread
            ? 'bg-card border-l-4 border-l-primary border-border'
            : 'bg-card/60 border-border opacity-60'
        }`}
        onPress={() => handleNotificationTap(item)}
      >
        <View className={`w-9 h-9 rounded-full ${iconConfig.bg} items-center justify-center mr-3`}>
          <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-text font-bold text-sm flex-1">{item.title}</Text>
            {isUnread && <View className="w-2.5 h-2.5 rounded-full bg-primary ml-2" />}
          </View>
          <Text className="text-textSecondary text-xs mt-1 leading-4">{item.message}</Text>
          <Text className="text-textMuted text-[10px] mt-2 font-medium">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row justify-between items-center">
        <Text className="text-text text-2xl font-bold">Alerts</Text>
        <TouchableOpacity
          onPress={handleMarkAllRead}
          className="bg-border px-3 py-1.5 rounded-lg border border-border"
        >
          <Text className="text-text text-xs font-semibold">Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row border-b border-border px-4 pt-4">
        <TouchableOpacity
          className="flex-1 items-center pb-2.5"
          style={{ borderBottomWidth: filter === 'all' ? 2 : 0, borderBottomColor: colors.primary }}
          onPress={() => setFilter('all')}
        >
          <Text className={`text-xs font-bold ${filter === 'all' ? 'text-primary' : 'text-textSecondary'}`}>
            All Alerts ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center pb-2.5"
          style={{ borderBottomWidth: filter === 'unread' ? 2 : 0, borderBottomColor: colors.primary }}
          onPress={() => setFilter('unread')}
        >
          <Text className={`text-xs font-bold ${filter === 'unread' ? 'text-primary' : 'text-textSecondary'}`}>
            Unread ({notifications.filter((n) => !readIds.includes(n.id)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerts List */}
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-textMuted text-sm">
                {filter === 'unread' ? 'No unread alerts left!' : 'No merchant alerts generated.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
