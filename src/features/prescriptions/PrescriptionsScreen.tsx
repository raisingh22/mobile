import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

interface PrescriptionsScreenProps {
  navigation: any;
}

export function PrescriptionsScreen({ navigation }: PrescriptionsScreenProps) {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch customers
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

  const filteredCustomers = customersList.filter((customer: any) => {
    const query = search.toLowerCase();
    return (
      customer.fullName.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  });

  const renderItem = ({ item }: { item: any }) => (
    <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 mb-3 flex-row justify-between items-center">
      <TouchableOpacity
        className="flex-1 mr-2"
        onPress={() => navigation.navigate('CustomerDetails', { customerId: item.id })}
      >
        <Text className="text-white font-bold text-base">{item.fullName}</Text>
        <Text className="text-[#a1a1aa] text-xs mt-1">📞 {item.phone}</Text>
        <Text className="text-[#71717a] text-[11px] mt-1.5 font-medium">
          Tap to view eye prescription history
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('AddPrescription', { customerId: item.id })}
        className="bg-[#27272a] p-2.5 rounded-lg border border-[#3f3f46]"
      >
        <Ionicons name="add" size={16} color="#6366f1" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold">Prescriptions</Text>
      </View>

      {/* Search Bar */}
      <View className="px-4 pt-4 pb-2">
        <View className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 flex-row items-center">
          <Ionicons name="search" size={18} color="#71717a" className="mr-2" />
          <TextInput
            className="flex-1 text-white text-sm py-0.5"
            placeholder="Search customer to view prescriptions..."
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

      {/* List */}
      {isLoading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-[#71717a] text-sm">
                No matching customers found.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
