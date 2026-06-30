import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

interface OrdersScreenProps {
  navigation: any;
}

export function OrdersScreen({ navigation }: OrdersScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.orders.list);
      return response.data;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const ordersList = orders || [];

  // Filter orders by search & status
  const filteredOrders = ordersList.filter((order: any) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (order.customer?.fullName && order.customer.fullName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'bg-amber-500/20', text: 'text-amber-500' };
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-500/20', text: 'text-blue-500' };
      case 'READY':
        return { bg: 'bg-purple-500/20', text: 'text-purple-500' };
      case 'DELIVERED':
        return { bg: 'bg-emerald-500/20', text: 'text-emerald-500' };
      case 'CANCELLED':
        return { bg: 'bg-rose-500/20', text: 'text-rose-500' };
      default:
        return { bg: 'bg-zinc-500/20', text: 'text-zinc-500' };
    }
  };

  const getPaymentStyle = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'text-emerald-500';
      case 'PARTIALLY_PAID':
        return 'text-amber-500';
      case 'UNPAID':
        return 'text-rose-500';
      default:
        return 'text-zinc-500';
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const statusStyle = getStatusStyle(item.status);
    const balance = item.total - item.paidAmount;

    return (
      <TouchableOpacity
        className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 mb-3"
        onPress={() => navigation.navigate('OrderDetails', { orderId: item.id })}
      >
        <View className="flex-row justify-between items-start">
          <View>
            <View className="flex-row items-center">
              <Text className="text-white font-bold text-base">{item.orderNumber}</Text>
              <View className={`${statusStyle.bg} px-2.5 py-0.5 rounded-full ml-2 border border-${statusStyle.text}/30`}>
                <Text className={`${statusStyle.text} text-[10px] font-bold`}>{item.status}</Text>
              </View>
            </View>
            <Text className="text-[#a1a1aa] text-sm mt-1.5 font-semibold">👤 {item.customer?.fullName}</Text>
          </View>
          <View className="items-end">
            <Text className="text-white font-bold text-base">₹{item.total}</Text>
            <Text className={`text-[10px] mt-1 font-bold uppercase ${getPaymentStyle(item.paymentStatus)}`}>
              {item.paymentStatus}
            </Text>
          </View>
        </View>

        {/* Item specs summary */}
        {(item.frameBrand || item.lensType) && (
          <View className="mt-3 pt-3 border-t border-[#27272a]">
            <Text className="text-[#a1a1aa] text-xs" numberOfLines={1}>
              👓 {item.frameBrand ? `${item.frameBrand} ${item.frameModel || ''}` : 'Frame'}{' '}
              {item.lensType ? `| ${item.lensType}` : ''}
            </Text>
          </View>
        )}

        {/* Delivery / Financial footer */}
        <View className="mt-2.5 flex-row justify-between items-center bg-[#09090b] px-3 py-2 rounded-lg">
          <Text className="text-[#71717a] text-[10px] font-medium">
            📅 Due: {item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
          </Text>
          {balance > 0 ? (
            <Text className="text-rose-500 text-[10px] font-bold">Due: ₹{balance}</Text>
          ) : (
            <Text className="text-emerald-500 text-[10px] font-bold">Settled ✅</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const statusFilters = ['ALL', 'PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold">Orders</Text>
      </View>

      {/* Search and Status Filters */}
      <View className="px-4 pt-4">
        <View className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 flex-row items-center mb-3">
          <Ionicons name="search" size={18} color="#71717a" className="mr-2" />
          <TextInput
            className="flex-1 text-white text-sm py-0.5"
            placeholder="Search by order number or customer..."
            placeholderTextColor="#71717a"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#a1a1aa" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Horizontal Status Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
          {statusFilters.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              className={`px-4 py-1.5 rounded-full mr-2 border ${
                statusFilter === status
                  ? 'bg-[#6366f1] border-[#6366f1]'
                  : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              <Text className={`text-xs font-semibold ${statusFilter === status ? 'text-white' : 'text-[#a1a1aa]'}`}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-[#71717a] text-sm">
                No orders matching parameters.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Create Order */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-[#6366f1] w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => navigation.navigate('AddOrder')}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
