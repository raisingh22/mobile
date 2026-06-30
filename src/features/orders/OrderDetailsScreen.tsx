import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

interface OrderDetailsScreenProps {
  route: any;
  navigation: any;
}

export function OrderDetailsScreen({ route, navigation }: OrderDetailsScreenProps) {
  const { orderId } = route.params;
  const queryClient = useQueryClient();
  const [payAmountInput, setPayAmountInput] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Fetch Order details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.orders.details(orderId));
      return response.data;
    },
  });

  // Mutate Order Status
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return axiosClient.patch(ENDPOINTS.orders.update(orderId), { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: 'Order status changed successfully.',
      });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Status change failed';
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: errMsg,
      });
    },
  });

  // Mutate Paid Amount
  const paymentMutation = useMutation({
    mutationFn: async (additionalPaid: number) => {
      const newPaidAmount = (order?.paidAmount || 0) + additionalPaid;
      // Recalculate status based on paid amount
      let newPaymentStatus = 'UNPAID';
      if (newPaidAmount >= (order?.total || 0)) {
        newPaymentStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'PARTIALLY_PAID';
      }
      return axiosClient.patch(ENDPOINTS.orders.update(orderId), {
        paidAmount: newPaidAmount,
        paymentStatus: newPaymentStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setPayAmountInput('');
      setIsPaying(false);
      Toast.show({
        type: 'success',
        text1: 'Payment Recorded',
        text2: 'Paid amount updated successfully.',
      });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Payment update failed';
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: errMsg,
      });
    },
  });

  // Delete Order
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.delete(ENDPOINTS.orders.delete(orderId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({
        type: 'success',
        text1: 'Order Deleted',
        text2: 'Order record removed successfully.',
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
      'Delete Order',
      'Are you sure you want to permanently delete this order?',
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

  const handleRecordPayment = () => {
    const amt = parseFloat(payAmountInput);
    if (isNaN(amt) || amt <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a positive numeric value.',
      });
      return;
    }
    paymentMutation.mutate(amt);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-amber-500 bg-amber-500/20 border-amber-500/30';
      case 'IN_PROGRESS':
        return 'text-blue-500 bg-blue-500/20 border-blue-500/30';
      case 'READY':
        return 'text-purple-500 bg-purple-500/20 border-purple-500/30';
      case 'DELIVERED':
        return 'text-emerald-500 bg-emerald-500/20 border-emerald-500/30';
      case 'CANCELLED':
        return 'text-rose-500 bg-rose-500/20 border-rose-500/30';
      default:
        return 'text-zinc-500 bg-zinc-500/20 border-zinc-500/30';
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center p-6">
        <Text className="text-[#a1a1aa] mb-4">Order not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-[#6366f1] px-4 py-2 rounded-lg">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const balance = Math.max(0, order.total - order.paidAmount);
  const statusColor = getStatusColor(order.status);
  const statusOptions = ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED'];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header Bar */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Order Details</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-3"
            onPress={() => navigation.navigate('AddOrder', { order })}
          >
            <Ionicons name="create-outline" size={22} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        {/* Order Status Badge Header */}
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-white font-black text-xl">{order.orderNumber}</Text>
            <Text className="text-[#71717a] text-[10px] font-bold uppercase mt-1">
              Placed: {new Date(order.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View className={`${statusColor} px-3 py-1 rounded-full border`}>
            <Text className="text-xs font-black uppercase tracking-wider">{order.status}</Text>
          </View>
        </View>

        {/* Customer Block */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CustomerDetails', { customerId: order.customerId })}
          className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 mb-6 flex-row justify-between items-center"
        >
          <View>
            <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Customer Profile</Text>
            <Text className="text-white text-base font-bold">{order.customer?.fullName}</Text>
            <Text className="text-[#a1a1aa] text-xs mt-1">📞 {order.customer?.phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#71717a" />
        </TouchableOpacity>

        {/* Linked Prescription Details */}
        {order.prescriptionId && (
          <TouchableOpacity
            onPress={() => navigation.navigate('PrescriptionDetails', { prescriptionId: order.prescriptionId })}
            className="bg-[#18181b] border border-[#27272a] rounded-2xl p-4 mb-6 flex-row justify-between items-center"
          >
            <View>
              <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Attached Prescription</Text>
              <Text className="text-white text-xs font-bold">
                📅 Checked: {new Date(order.prescription?.prescriptionDate).toLocaleDateString()}
              </Text>
              <Text className="text-[#a1a1aa] text-[10px] mt-0.5">
                Dr. {order.prescription?.doctorName || 'Not specified'}
              </Text>
            </View>
            <Text className="text-[#6366f1] text-[10px] font-bold">View Lens Specs</Text>
          </TouchableOpacity>
        )}

        {/* Product Details Specs */}
        <Text className="text-white font-bold text-sm mb-3">Product Specifications</Text>
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 mb-6">
          <View className="mb-4">
            <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Frame Details</Text>
            {order.frameBrand || order.frameModel || order.frameName ? (
              <Text className="text-white text-sm font-semibold">
                {order.frameBrand || 'Brand N/A'} - {order.frameModel || 'Model N/A'}{' '}
                {order.frameName ? `(${order.frameName})` : ''}
              </Text>
            ) : (
              <Text className="text-[#71717a] text-sm italic">No frame details specified</Text>
            )}
          </View>

          <View className="pt-4 border-t border-[#27272a]">
            <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Lens Details</Text>
            {order.lensType || order.lensCoating ? (
              <Text className="text-white text-sm font-semibold">
                Type: {order.lensType || 'N/A'} | Coating: {order.lensCoating || 'N/A'}
              </Text>
            ) : (
              <Text className="text-[#71717a] text-sm italic">No lens details specified</Text>
            )}
          </View>
        </View>

        {/* Billing Breakdown */}
        <Text className="text-white font-bold text-sm mb-3">Cost Summary</Text>
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 mb-6">
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-[#a1a1aa] text-sm">Subtotal (Qty {order.quantity || 1}):</Text>
            <Text className="text-white text-sm font-medium">₹{order.subtotal}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-[#a1a1aa] text-sm">Discount:</Text>
            <Text className="text-rose-500 text-sm font-medium">-₹{order.discount}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-[#a1a1aa] text-sm">Tax:</Text>
            <Text className="text-white text-sm font-medium">+₹{order.tax}</Text>
          </View>
          <View className="flex-row justify-between pt-3.5 border-t border-[#27272a] mb-2.5">
            <Text className="text-white text-sm font-bold">Total Amount:</Text>
            <Text className="text-white text-base font-black">₹{order.total}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-emerald-500 text-sm font-bold">Amount Paid:</Text>
            <Text className="text-emerald-500 text-sm font-black">₹{order.paidAmount}</Text>
          </View>
          <View className="flex-row justify-between pt-2.5 border-t border-[#27272a]">
            <Text className="text-[#71717a] text-xs font-bold uppercase">Balance Due:</Text>
            <Text className={`text-sm font-black ${balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              ₹{balance}
            </Text>
          </View>
        </View>

        {/* Notes & Delivery Date */}
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 mb-6">
          <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Expected Delivery</Text>
          <Text className="text-white text-sm font-semibold mb-4">
            📅 {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'Not scheduled'}
          </Text>

          {order.notes && (
            <View className="pt-4 border-t border-[#27272a]">
              <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Order Notes</Text>
              <Text className="text-[#a1a1aa] text-sm leading-5">{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Dynamic Payment Collector Box */}
        {balance > 0 && (
          <View className="bg-[#18181b] border border-[#6366f1]/40 rounded-2xl p-5 mb-6">
            <Text className="text-white font-bold text-sm mb-3">Record Partial/Full Payment</Text>
            <View className="flex-row mb-3">
              <TextInput
                value={payAmountInput}
                onChangeText={setPayAmountInput}
                placeholder="Enter paid amount (₹)..."
                placeholderTextColor="#71717a"
                keyboardType="numeric"
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2 flex-1 mr-3 text-sm"
              />
              <TouchableOpacity
                onPress={handleRecordPayment}
                className="bg-[#6366f1] px-4 py-2 rounded-lg justify-center items-center"
              >
                <Text className="text-white font-bold text-xs">Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status Transition Options */}
        <Text className="text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-3">Update Order Progress</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => statusMutation.mutate(status)}
              className={`px-4 py-2 rounded-lg mr-2.5 border ${
                order.status === status
                  ? 'bg-[#6366f1] border-[#6366f1]'
                  : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              <Text className={`text-xs font-semibold ${order.status === status ? 'text-white' : 'text-[#a1a1aa]'}`}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

      </ScrollView>
    </View>
  );
}
