import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

interface CustomerDetailsScreenProps {
  route: any;
  navigation: any;
}

export function CustomerDetailsScreen({ route, navigation }: CustomerDetailsScreenProps) {
  const { customerId } = route.params;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'orders'>('prescriptions');

  // Fetch Customer Profile
  const { data: customerData, isLoading: isCustLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.details(customerId));
      return response.data;
    },
  });

  // Fetch Customer Prescriptions
  const { data: prescriptionsData, isLoading: isPrescLoading } = useQuery({
    queryKey: ['customer-prescriptions', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.prescriptions(customerId));
      return response.data;
    },
  });

  // Fetch Customer Orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.orders(customerId));
      return response.data;
    },
  });

  // Delete Customer Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.delete(ENDPOINTS.customers.delete(customerId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({
        type: 'success',
        text1: 'Customer Deleted',
        text2: 'Profile removed successfully.',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Delete failed';
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: errMsg,
      });
    },
  });

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer? This action is irreversible and might affect their orders and prescriptions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const isLoading = isCustLoading || isPrescLoading || isOrdersLoading;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const customer = customerData;
  const prescriptions = prescriptionsData || [];
  const orders = ordersData || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header Bar */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Customer Details</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-3"
            onPress={() => navigation.navigate('AddEditCustomer', { customer })}
          >
            <Ionicons name="create-outline" size={22} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Profile Card */}
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 mb-6">
          <Text className="text-white text-xl font-bold">{customer.fullName}</Text>
          
          <View className="mt-4 flex-row items-center">
            <Text className="text-[#a1a1aa] text-sm w-20">Phone:</Text>
            <Text className="text-white text-sm font-semibold">{customer.phone}</Text>
          </View>
          
          {customer.email && (
            <View className="mt-2.5 flex-row items-center">
              <Text className="text-[#a1a1aa] text-sm w-20">Email:</Text>
              <Text className="text-white text-sm">{customer.email}</Text>
            </View>
          )}

          {customer.dateOfBirth && (
            <View className="mt-2.5 flex-row items-center">
              <Text className="text-[#a1a1aa] text-sm w-20">DOB:</Text>
              <Text className="text-white text-sm">
                {new Date(customer.dateOfBirth).toLocaleDateString()}
              </Text>
            </View>
          )}

          {customer.gender && (
            <View className="mt-2.5 flex-row items-center">
              <Text className="text-[#a1a1aa] text-sm w-20">Gender:</Text>
              <Text className="text-white text-sm">{customer.gender}</Text>
            </View>
          )}

          {customer.address && (
            <View className="mt-2.5 flex-row items-start">
              <Text className="text-[#a1a1aa] text-sm w-20">Address:</Text>
              <Text className="text-white text-sm flex-1">{customer.address}</Text>
            </View>
          )}

          {customer.notes && (
            <View className="mt-4 pt-4 border-t border-[#27272a]">
              <Text className="text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-1">Notes</Text>
              <Text className="text-[#a1a1aa] text-sm leading-5">{customer.notes}</Text>
            </View>
          )}
        </View>

        {/* Tab Selection */}
        <View className="flex-row border-b border-[#27272a] mb-5">
          <TouchableOpacity
            className="flex-1 items-center pb-2.5"
            style={{ borderBottomWidth: activeTab === 'prescriptions' ? 2 : 0, borderBottomColor: colors.primary }}
            onPress={() => setActiveTab('prescriptions')}
          >
            <Text className={`text-sm ${activeTab === 'prescriptions' ? 'text-[#6366f1] font-bold' : 'text-[#a1a1aa] font-medium'}`}>
              Prescriptions ({prescriptions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center pb-2.5"
            style={{ borderBottomWidth: activeTab === 'orders' ? 2 : 0, borderBottomColor: colors.primary }}
            onPress={() => setActiveTab('orders')}
          >
            <Text className={`text-sm ${activeTab === 'orders' ? 'text-[#6366f1] font-bold' : 'text-[#a1a1aa] font-medium'}`}>
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        {activeTab === 'prescriptions' ? (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-base font-bold">Prescription History</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddPrescription', { customerId })}
                className="bg-[#27272a] px-3 py-1.5 rounded-lg border border-[#3f3f46] flex-row items-center"
              >
                <Ionicons name="add" size={14} color="#ffffff" className="mr-1" />
                <Text className="text-white text-xs font-semibold">Add New</Text>
              </TouchableOpacity>
            </View>

            {prescriptions.length === 0 ? (
              <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 items-center">
                <Text className="text-[#71717a] text-sm">No prescriptions registered yet.</Text>
              </View>
            ) : (
              prescriptions.map((presc: any) => (
                <TouchableOpacity
                  key={presc.id}
                  className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 mb-3"
                  onPress={() => navigation.navigate('PrescriptionDetails', { prescriptionId: presc.id })}
                >
                  <View className="flex-row justify-between items-center pb-2 border-b border-[#27272a] mb-2.5">
                    <Text className="text-[#a1a1aa] text-xs font-medium">
                      📅 {new Date(presc.prescriptionDate).toLocaleDateString()}
                    </Text>
                    {presc.doctorName ? (
                      <Text className="text-[#a1a1aa] text-xs font-semibold">Dr. {presc.doctorName}</Text>
                    ) : null}
                  </View>
                  <View className="flex-row justify-between">
                    <View className="w-[48%]">
                      <Text className="text-[#71717a] text-[10px] font-bold uppercase mb-0.5">Right Eye (OD)</Text>
                      <Text className="text-white text-xs">Sph: {presc.rightSphere ?? '0.00'} | Cyl: {presc.rightCylinder ?? '0.00'}</Text>
                    </View>
                    <View className="w-[48%]">
                      <Text className="text-[#71717a] text-[10px] font-bold uppercase mb-0.5">Left Eye (OS)</Text>
                      <Text className="text-white text-xs">Sph: {presc.leftSphere ?? '0.00'} | Cyl: {presc.leftCylinder ?? '0.00'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-base font-bold">Order History</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddOrder', { customerId })}
                className="bg-[#27272a] px-3 py-1.5 rounded-lg border border-[#3f3f46] flex-row items-center"
              >
                <Ionicons name="add" size={14} color="#ffffff" className="mr-1" />
                <Text className="text-white text-xs font-semibold">New Order</Text>
              </TouchableOpacity>
            </View>

            {orders.length === 0 ? (
              <View className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 items-center">
                <Text className="text-[#71717a] text-sm">No orders placed yet.</Text>
              </View>
            ) : (
              orders.map((order: any) => (
                <TouchableOpacity
                  key={order.id}
                  className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 mb-3 flex-row justify-between items-center"
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                >
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-white font-bold text-sm">{order.orderNumber}</Text>
                      <View className="bg-[#3f3f46] px-2 py-0.5 rounded ml-2">
                        <Text className="text-white text-[10px] font-bold">{order.status}</Text>
                      </View>
                    </View>
                    <Text className="text-[#a1a1aa] text-xs mt-1.5">
                      📅 {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-white font-bold text-sm">₹{order.total}</Text>
                    <Text className="text-[#71717a] text-[10px] mt-1.5">
                      Paid: ₹{order.paidAmount}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
