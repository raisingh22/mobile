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

  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'NEW_ORDER': return '🆕';
      case 'NEW_PRESCRIPTION': return '👓';
      case 'ORDER_READY': return '📦';
      case 'LOW_STOCK': return '⚠️';
      case 'TODAY_APPOINTMENT': return '📅';
      case 'PAYMENT_RECEIVED': return '💰';
      case 'PENDING_ORDERS_OLD': return '⏰';
      case 'CUSTOMER_BIRTHDAY':
      case 'CUSTOMER_REVISIT': return '🎂';
      default: return '🔔';
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isUnread = !readIds.includes(item.id);

    return (
      <TouchableOpacity
        className={`p-4 mb-3 border rounded-xl flex-row items-start ${
          isUnread
            ? 'bg-[#18181b] border-l-4 border-l-[#6366f1] border-[#27272a]'
            : 'bg-[#18181b]/60 border-[#27272a] opacity-60'
        }`}
        onPress={() => handleNotificationTap(item)}
      >
        <Text className="text-xl mr-3">{getNotificationEmoji(item.type)}</Text>
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="text-white font-bold text-sm flex-1">{item.title}</Text>
            {isUnread && <View className="w-2.5 h-2.5 rounded-full bg-[#6366f1] ml-2" />}
          </View>
          <Text className="text-[#a1a1aa] text-xs mt-1 leading-4">{item.message}</Text>
          <Text className="text-[#71717a] text-[10px] mt-2 font-medium">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4 flex-row justify-between items-center">
        <Text className="text-white text-2xl font-bold">Alerts</Text>
        <TouchableOpacity
          onPress={handleMarkAllRead}
          className="bg-[#27272a] px-3 py-1.5 rounded-lg border border-[#3f3f46]"
        >
          <Text className="text-white text-xs font-semibold">Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row border-b border-[#27272a] px-4 pt-4">
        <TouchableOpacity
          className="flex-1 items-center pb-2.5"
          style={{ borderBottomWidth: filter === 'all' ? 2 : 0, borderBottomColor: colors.primary }}
          onPress={() => setFilter('all')}
        >
          <Text className={`text-xs font-bold ${filter === 'all' ? 'text-[#6366f1]' : 'text-[#a1a1aa]'}`}>
            All Alerts ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center pb-2.5"
          style={{ borderBottomWidth: filter === 'unread' ? 2 : 0, borderBottomColor: colors.primary }}
          onPress={() => setFilter('unread')}
        >
          <Text className={`text-xs font-bold ${filter === 'unread' ? 'text-[#6366f1]' : 'text-[#a1a1aa]'}`}>
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
              <Text className="text-[#71717a] text-sm">
                {filter === 'unread' ? 'No unread alerts left!' : 'No merchant alerts generated.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
