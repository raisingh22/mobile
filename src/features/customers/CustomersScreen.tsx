import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

interface CustomersScreenProps {
  navigation: any;
}

export function CustomersScreen({ navigation }: CustomersScreenProps) {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch customers limit=100 for robust client-side searching
  const { data, isLoading, refetch } = useQuery({
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

  // Filter customers client-side
  const filteredCustomers = customersList.filter((customer: any) => {
    const query = search.toLowerCase();
    return (
      customer.fullName.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      (customer.email && customer.email.toLowerCase().includes(query))
    );
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 mb-3 flex-row justify-between items-center"
      onPress={() => navigation.navigate('CustomerDetails', { customerId: item.id })}
    >
      <View className="flex-1 mr-3">
        <Text className="text-white font-bold text-base">{item.fullName}</Text>
        <Text className="text-[#a1a1aa] text-xs mt-1">📞 {item.phone}</Text>
        {item.email ? (
          <Text className="text-[#a1a1aa] text-xs mt-0.5">✉️ {item.email}</Text>
        ) : null}
        {item.notes ? (
          <Text className="text-[#71717a] text-xs mt-2 italic" numberOfLines={1}>
            "{item.notes}"
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#71717a" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold">Customers</Text>
      </View>

      {/* Search Input */}
      <View className="px-4 pt-4 pb-2">
        <View className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 flex-row items-center">
          <Ionicons name="search" size={18} color="#71717a" className="mr-2" />
          <TextInput
            className="flex-1 text-white text-sm py-0.5"
            placeholder="Search by name, phone or email..."
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
      </View>

      {/* Main List */}
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-[#71717a] text-sm">
                {search ? 'No matching customers found.' : 'No customers in workspace.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Add Customer */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 bg-[#6366f1] w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => navigation.navigate('AddEditCustomer')}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
