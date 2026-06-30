import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';
import { CommunicationService } from '../../services/CommunicationService';
import { PdfService } from '../../services/PdfService';

interface OrderDetailsScreenProps {
  route: any;
  navigation: any;
}

export function OrderDetailsScreen({ route, navigation }: OrderDetailsScreenProps) {
  const { orderId } = route.params;
  const queryClient = useQueryClient();
  const [payAmountInput, setPayAmountInput] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Fetch Workspace Settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings');
      return res.data;
    },
  });

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

  const handleWhatsApp = () => {
    if (!order?.customer?.phone) {
      Toast.show({ type: 'error', text1: 'No Phone', text2: 'Customer has no phone number.' });
      return;
    }
    const msg = `Hi ${order.customer.fullName}, this is an update regarding your order #${order.orderNumber}. The current status is ${order.status}.`;
    CommunicationService.sendWhatsApp(order.customer.phone, msg);
  };

  const handleSMS = () => {
    if (!order?.customer?.phone) {
      Toast.show({ type: 'error', text1: 'No Phone', text2: 'Customer has no phone number.' });
      return;
    }
    const msg = `Update on order #${order.orderNumber}: Status is ${order.status}.`;
    CommunicationService.sendSMS(order.customer.phone, msg);
  };

  const handleEmail = () => {
    if (!order?.customer?.email) {
      Toast.show({ type: 'error', text1: 'No Email', text2: 'Customer has no email address.' });
      return;
    }
    const sub = `Invoice for Order #${order.orderNumber}`;
    const bdy = `Hello ${order.customer.fullName},\n\nAttached is the invoice summary for your recent order.\nOrder Number: ${order.orderNumber}\nTotal: ₹${order.total}\nPaid: ₹${order.paidAmount}\nBalance: ₹${Math.max(0, order.total - order.paidAmount)}\n\nThank you for your business.`;
    CommunicationService.sendEmail(order.customer.email, sub, bdy);
  };

  const handleSharePdf = async () => {
    try {
      setGeneratingPdf(true);
      const uri = await PdfService.generateInvoicePdf(order, settings);
      await PdfService.shareFile(uri, `Invoice_${order.orderNumber}.pdf`);
    } catch (err) {
      // Error handled inside PdfService or console
    } finally {
      setGeneratingPdf(false);
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
        <Text className="text-textSecondary mb-4">Order not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-[#06b6d4] px-4 py-2 rounded-lg">
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
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#06b6d4" />
        </TouchableOpacity>
        <Text className="text-text text-base font-bold">Order Details</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-3"
            onPress={() => navigation.navigate('AddOrder', { order })}
          >
            <Ionicons name="create-outline" size={22} color="#06b6d4" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        {/* Order Status Badge Header */}
        <View className="bg-card border border-border rounded-2xl p-5 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-text font-black text-xl">{order.orderNumber}</Text>
            <Text className="text-textMuted text-[10px] font-bold uppercase mt-1">
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
          className="bg-card border border-border rounded-2xl p-4 mb-6 flex-row justify-between items-center"
        >
          <View>
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Customer Profile</Text>
            <Text className="text-text text-base font-bold">{order.customer?.fullName}</Text>
            <Text className="text-textSecondary text-xs mt-1">📞 {order.customer?.phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#71717a" />
        </TouchableOpacity>

        {/* Linked Prescription Details */}
        {order.prescriptionId && (
          <TouchableOpacity
            onPress={() => navigation.navigate('PrescriptionDetails', { prescriptionId: order.prescriptionId })}
            className="bg-card border border-border rounded-2xl p-4 mb-6 flex-row justify-between items-center"
          >
            <View>
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Attached Prescription</Text>
              <Text className="text-text text-xs font-bold">
                📅 Checked: {new Date(order.prescription?.prescriptionDate).toLocaleDateString()}
              </Text>
              <Text className="text-textSecondary text-[10px] mt-0.5">
                Dr. {order.prescription?.doctorName || 'Not specified'}
              </Text>
            </View>
            <Text className="text-[#06b6d4] text-[10px] font-bold">View Lens Specs</Text>
          </TouchableOpacity>
        )}

        {/* Product Details Specs */}
        <Text className="text-text font-bold text-sm mb-3">Product Specifications</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <View className="mb-4">
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Frame Details</Text>
            {order.frameBrand || order.frameModel || order.frameName ? (
              <Text className="text-text text-sm font-semibold">
                {order.frameBrand || 'Brand N/A'} - {order.frameModel || 'Model N/A'}{' '}
                {order.frameName ? `(${order.frameName})` : ''}
              </Text>
            ) : (
              <Text className="text-textMuted text-sm italic">No frame details specified</Text>
            )}
          </View>

          <View className="pt-4 border-t border-border">
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Lens Details</Text>
            {order.lensType || order.lensCoating ? (
              <Text className="text-text text-sm font-semibold">
                Type: {order.lensType || 'N/A'} | Coating: {order.lensCoating || 'N/A'}
              </Text>
            ) : (
              <Text className="text-textMuted text-sm italic">No lens details specified</Text>
            )}
          </View>
        </View>

        {/* Billing Breakdown */}
        <Text className="text-text font-bold text-sm mb-3">Cost Summary</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-textSecondary text-sm">Subtotal (Qty {order.quantity || 1}):</Text>
            <Text className="text-text text-sm font-medium">₹{order.subtotal}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-textSecondary text-sm">Discount:</Text>
            <Text className="text-rose-500 text-sm font-medium">-₹{order.discount}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-textSecondary text-sm">Tax:</Text>
            <Text className="text-text text-sm font-medium">+₹{order.tax}</Text>
          </View>
          <View className="flex-row justify-between pt-3.5 border-t border-border mb-2.5">
            <Text className="text-text text-sm font-bold">Total Amount:</Text>
            <Text className="text-text text-base font-black">₹{order.total}</Text>
          </View>
          <View className="flex-row justify-between mb-2.5">
            <Text className="text-emerald-500 text-sm font-bold">Amount Paid:</Text>
            <Text className="text-emerald-500 text-sm font-black">₹{order.paidAmount}</Text>
          </View>
          <View className="flex-row justify-between pt-2.5 border-t border-border">
            <Text className="text-textMuted text-xs font-bold uppercase">Balance Due:</Text>
            <Text className={`text-sm font-black ${balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              ₹{balance}
            </Text>
          </View>
        </View>

        {/* Notes & Delivery Date */}
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Expected Delivery</Text>
          <Text className="text-text text-sm font-semibold mb-4">
            📅 {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'Not scheduled'}
          </Text>

          {order.notes && (
            <View className="pt-4 border-t border-border">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Order Notes</Text>
              <Text className="text-textSecondary text-sm leading-5">{order.notes}</Text>
            </View>
          )}
        </View>

        {/* Dynamic Payment Collector Box */}
        {balance > 0 && (
          <View className="bg-card border border-primary/40 rounded-2xl p-5 mb-6">
            <Text className="text-text font-bold text-sm mb-3">Record Partial/Full Payment</Text>
            <View className="flex-row mb-3">
              <TextInput
                value={payAmountInput}
                onChangeText={setPayAmountInput}
                placeholder="Enter paid amount (₹)..."
                placeholderTextColor="#71717a"
                keyboardType="numeric"
                className="bg-background text-text border border-border rounded-lg px-4 py-2 flex-1 mr-3 text-sm"
              />
              <TouchableOpacity
                onPress={handleRecordPayment}
                className="bg-[#06b6d4] px-4 py-2 rounded-lg justify-center items-center"
              >
                <Text className="text-white font-bold text-xs">Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Status Transition Options */}
        <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-3">Update Order Progress</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {statusOptions.map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => statusMutation.mutate(status)}
              className={`px-4 py-2 rounded-lg mr-2.5 border ${
                order.status === status
                  ? 'bg-[#06b6d4] border-[#06b6d4]'
                  : 'bg-card border-border'
              }`}
            >
              <Text className={`text-xs font-semibold ${order.status === status ? 'text-white' : 'text-textSecondary'}`}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Communication Actions */}
        <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-3 mt-6">Customer Communication</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <TouchableOpacity onPress={handleWhatsApp} className="flex-row items-center py-2.5 border-b border-border">
            <Ionicons name="logo-whatsapp" size={20} color="#10b981" className="mr-3" />
            <Text className="text-text text-sm font-medium">Send WhatsApp Update</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSMS} className="flex-row items-center py-2.5 border-b border-border">
            <Ionicons name="chatbubble-outline" size={20} color="#06b6d4" className="mr-3" />
            <Text className="text-text text-sm font-medium">Send SMS Update</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEmail} className="flex-row items-center py-2.5 border-b border-border">
            <Ionicons name="mail-outline" size={20} color="#f43f5e" className="mr-3" />
            <Text className="text-text text-sm font-medium">Email Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSharePdf} disabled={generatingPdf} className="flex-row items-center py-2.5">
            <Ionicons name="share-outline" size={20} color="#eab308" className="mr-3" />
            <Text className="text-text text-sm font-medium">
              {generatingPdf ? 'Generating PDF...' : 'Share PDF Invoice'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
