import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  prescriptionId: z.string().optional().nullable(),
  frameName: z.string().optional(),
  frameBrand: z.string().optional(),
  frameModel: z.string().optional(),
  lensType: z.string().optional(),
  lensCoating: z.string().optional(),
  quantity: z.string().transform(v => parseInt(v, 10) || 1),
  subtotal: z.string().transform(v => parseFloat(v) || 0),
  discount: z.string().transform(v => parseFloat(v) || 0),
  tax: z.string().transform(v => parseFloat(v) || 0),
  paidAmount: z.string().transform(v => parseFloat(v) || 0),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED']),
  paymentStatus: z.enum(['UNPAID', 'PARTIALLY_PAID', 'PAID']),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface AddEditOrderScreenProps {
  route: any;
  navigation: any;
}

export function AddEditOrderScreen({ route, navigation }: AddEditOrderScreenProps) {
  const queryClient = useQueryClient();
  const editOrder = route.params?.order;
  const initialCustomerId = route.params?.customerId || editOrder?.customerId || null;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [custSearch, setCustSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Customers list for selection
  const { data: customersData, isLoading: isCustsLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.list, { params: { limit: 100 } });
      return response.data;
    },
    enabled: !selectedCustomerId,
  });

  const customers = customersData?.data || [];
  const filteredCustomers = customers.filter((c: any) =>
    c.fullName.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch)
  );

  // Find customer name if customerId is pre-provided
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const found = customers.find((c: any) => c.id === selectedCustomerId);
      if (found) setSelectedCustomerName(found.fullName);
    } else if (selectedCustomerId && editOrder?.customer) {
      setSelectedCustomerName(editOrder.customer.fullName);
    }
  }, [selectedCustomerId, customers]);

  // Fetch customer prescriptions
  const { data: prescriptions, isLoading: isPrescsLoading } = useQuery({
    queryKey: ['customer-prescriptions', selectedCustomerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.prescriptions(selectedCustomerId!));
      return response.data;
    },
    enabled: !!selectedCustomerId,
  });

  const { control, handleSubmit, setValue, register, formState: { errors } } = useForm<any>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: editOrder?.customerId || initialCustomerId || '',
      prescriptionId: editOrder?.prescriptionId || '',
      frameName: editOrder?.frameName || '',
      frameBrand: editOrder?.frameBrand || '',
      frameModel: editOrder?.frameModel || '',
      lensType: editOrder?.lensType || '',
      lensCoating: editOrder?.lensCoating || '',
      quantity: editOrder?.quantity?.toString() || '1',
      subtotal: editOrder?.subtotal?.toString() || '0',
      discount: editOrder?.discount?.toString() || '0',
      tax: editOrder?.tax?.toString() || '0',
      paidAmount: editOrder?.paidAmount?.toString() || '0',
      status: editOrder?.status || 'PENDING',
      paymentStatus: editOrder?.paymentStatus || 'UNPAID',
      expectedDeliveryDate: editOrder?.expectedDeliveryDate
        ? editOrder.expectedDeliveryDate.split('T')[0]
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 7 days from now
      notes: editOrder?.notes || '',
    },
  });

  // Watch selected prescription
  const activePrescriptionId = useWatch({ control, name: 'prescriptionId' });

  // Watch prices to calculate total dynamically
  const subtotalWatch = useWatch({ control, name: 'subtotal' }) || '0';
  const discountWatch = useWatch({ control, name: 'discount' }) || '0';
  const taxWatch = useWatch({ control, name: 'tax' }) || '0';
  const paidAmountWatch = useWatch({ control, name: 'paidAmount' }) || '0';

  const sub = parseFloat(subtotalWatch) || 0;
  const disc = parseFloat(discountWatch) || 0;
  const tx = parseFloat(taxWatch) || 0;
  const paid = parseFloat(paidAmountWatch) || 0;

  const totalCalculated = Math.max(0, sub - disc + tx);
  const balanceDue = Math.max(0, totalCalculated - paid);

  // Sync calculated payment status based on paid amount
  useEffect(() => {
    if (paid === 0) {
      setValue('paymentStatus', 'UNPAID');
    } else if (paid >= totalCalculated) {
      setValue('paymentStatus', 'PAID');
    } else {
      setValue('paymentStatus', 'PARTIALLY_PAID');
    }
  }, [paid, totalCalculated]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        total: totalCalculated,
      };
      if (editOrder) {
        return axiosClient.patch(ENDPOINTS.orders.update(editOrder.id), payload);
      } else {
        return axiosClient.post(ENDPOINTS.orders.create, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (selectedCustomerId) {
        queryClient.invalidateQueries({ queryKey: ['customer-orders', selectedCustomerId] });
      }
      if (editOrder) {
        queryClient.invalidateQueries({ queryKey: ['order', editOrder.id] });
      }
      Toast.show({
        type: 'success',
        text1: editOrder ? 'Order Updated' : 'Order Placed',
        text2: editOrder ? 'Order has been modified successfully.' : 'New order recorded successfully.',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Request failed';
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: errMsg,
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: OrderFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomerId(cust.id);
    setSelectedCustomerName(cust.fullName);
    setValue('customerId', cust.id);
  };

  // 1. Customer Selection view
  if (!selectedCustomerId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row justify-between items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-primary text-sm font-semibold">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-text text-base font-bold">Select Customer</Text>
          <View style={{ width: 50 }} />
        </View>

        <View className="p-4">
          <View className="bg-card border border-border rounded-lg px-3 py-2 flex-row items-center mb-4">
            <Ionicons name="search" size={18} color="#71717a" className="mr-2" />
            <TextInput
              className="flex-1 text-text text-sm py-0.5"
              placeholder="Search customer by name or phone..."
              placeholderTextColor="#71717a"
              value={custSearch}
              onChangeText={setCustSearch}
            />
          </View>

          {isCustsLoading ? (
            <ActivityIndicator size="large" color={colors.primary} className="mt-8" />
          ) : (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectCustomer(item)}
                  className="bg-card border border-border rounded-xl p-4 mb-3 flex-row justify-between items-center"
                >
                  <View>
                    <Text className="text-text font-bold text-base">{item.fullName}</Text>
                    <Text className="text-textSecondary text-xs mt-1">📞 {item.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#71717a" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Text className="text-textMuted text-sm">No customers found.</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('AddEditCustomer')}
                    className="bg-primary px-4 py-2 rounded-lg mt-4"
                  >
                    <Text className="text-white font-bold text-xs">Add New Customer</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      </View>
    );
  }

  // 2. Order Form View
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      className="bg-background"
    >
      {/* Header Bar */}
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-primary text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-text text-base font-bold">{editOrder ? 'Edit Order' : 'New Order'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 45 }}>
        {/* Customer Header */}
        <View className="bg-card border border-border rounded-2xl p-4 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider">Order For</Text>
            <Text className="text-text text-lg font-bold mt-0.5">{selectedCustomerName}</Text>
          </View>
          {!editOrder && (
            <TouchableOpacity
              onPress={() => setSelectedCustomerId(null)}
              className="bg-border px-3 py-1.5 rounded-lg border border-border"
            >
              <Text className="text-text text-xs font-semibold">Change</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Prescription Selection */}
        <Text className="text-text font-bold text-sm mb-3">Link Customer Prescription</Text>
        <View className="bg-card border border-border rounded-2xl p-4 mb-6">
          {isPrescsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : !prescriptions || prescriptions.length === 0 ? (
            <View className="items-center py-4">
              <Text className="text-textMuted text-xs">No saved prescriptions for this customer.</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddPrescription', { customerId: selectedCustomerId })}
                className="bg-border px-3 py-1.5 rounded-lg border border-border mt-3"
              >
                <Text className="text-primary text-xs font-bold">Add Prescription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-textSecondary text-xs mb-3">Select a prescription log to attach to this glass order:</Text>
              
              {/* Select Option: None */}
              <TouchableOpacity
                onPress={() => setValue('prescriptionId', '')}
                className={`p-3 rounded-lg border mb-2 flex-row justify-between items-center ${
                  !activePrescriptionId ? 'bg-primary/10 border-primary' : 'bg-background border-border'
                }`}
              >
                <Text className="text-text text-xs font-semibold">No Prescription (Custom/Plano)</Text>
                {!activePrescriptionId && <Ionicons name="checkmark-circle" size={16} color="#6366f1" />}
              </TouchableOpacity>

              {/* Prescriptions List */}
              {prescriptions.map((presc: any) => (
                <TouchableOpacity
                  key={presc.id}
                  onPress={() => setValue('prescriptionId', presc.id)}
                  className={`p-3 rounded-lg border mb-2 flex-row justify-between items-center ${
                    activePrescriptionId === presc.id ? 'bg-primary/10 border-primary' : 'bg-background border-border'
                  }`}
                >
                  <View>
                    <Text className="text-text text-xs font-bold">
                      📅 {new Date(presc.prescriptionDate).toLocaleDateString()}
                    </Text>
                    <Text className="text-textSecondary text-[10px] mt-0.5">
                      Doctor: {presc.doctorName || 'Not specified'}
                    </Text>
                  </View>
                  {activePrescriptionId === presc.id && <Ionicons name="checkmark-circle" size={16} color="#6366f1" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Frame Specifications */}
        <Text className="text-text font-bold text-sm mb-3">Frame Details</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <Text className="text-textSecondary text-xs mb-1.5">Brand</Text>
          <Controller
            control={control}
            name="frameBrand"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2 mb-3 text-sm"
                placeholder="Ray-Ban"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <View className="flex-row justify-between">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Model</Text>
              <Controller
                control={control}
                name="frameModel"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Aviator"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Name/Color</Text>
              <Controller
                control={control}
                name="frameName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Gold RB3025"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
          </View>
        </View>

        {/* Lens Specifications */}
        <Text className="text-text font-bold text-sm mb-3">Lens Details</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <View className="flex-row justify-between">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Lens Type</Text>
              <Controller
                control={control}
                name="lensType"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Single Vision / Progressive"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Coating</Text>
              <Controller
                control={control}
                name="lensCoating"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm"
                    placeholder="Blue Cut / Anti-Glare"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
            </View>
          </View>
        </View>

        {/* Costing Calculations */}
        <Text className="text-text font-bold text-sm mb-3">Pricing & Payments</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <View className="flex-row justify-between mb-4">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Subtotal (₹)</Text>
              <Controller
                control={control}
                name="subtotal"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm text-center font-bold"
                    placeholder="5000"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Quantity</Text>
              <Controller
                control={control}
                name="quantity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm text-center"
                    placeholder="1"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
          </View>

          <View className="flex-row justify-between mb-4">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Discount (₹)</Text>
              <Controller
                control={control}
                name="discount"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm text-center"
                    placeholder="0"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Tax (₹)</Text>
              <Controller
                control={control}
                name="tax"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2 text-sm text-center"
                    placeholder="0"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="numeric"
                  />
                )}
              />
            </View>
          </View>

          {/* Dynamic Math Total Output Box */}
          <View className="bg-background rounded-xl p-4 border border-border mb-4 flex-row justify-between items-center">
            <Text className="text-text font-bold text-sm">Grand Total:</Text>
            <Text className="text-primary font-black text-lg">₹{totalCalculated.toFixed(2)}</Text>
          </View>

          <Text className="text-textSecondary text-xs mb-1.5">Amount Paid (₹)</Text>
          <Controller
            control={control}
            name="paidAmount"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2.5 mb-3 text-sm text-center font-bold"
                placeholder="0"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                keyboardType="numeric"
              />
            )}
          />

          <View className="flex-row justify-between items-center mt-1">
            <Text className="text-textMuted text-xs">Balance Due:</Text>
            <Text className={`text-xs font-bold ${balanceDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {balanceDue > 0 ? `₹${balanceDue.toFixed(2)}` : 'Full Settlement ✅'}
            </Text>
          </View>
        </View>

        {/* Metadata & Delivery Details */}
        <Text className="text-text font-bold text-sm mb-3">Delivery & Schedule</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <Text className="text-textSecondary text-sm font-medium mb-2">Expected Delivery Date (YYYY-MM-DD)</Text>
          <Controller
            control={control}
            name="expectedDeliveryDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2.5 mb-4 text-sm"
                placeholder="2026-07-05"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.expectedDeliveryDate?.message && (
            <Text className="text-[#ef4444] text-xs mb-3">{errors.expectedDeliveryDate.message as string}</Text>
          )}

          <Text className="text-textSecondary text-sm font-medium mb-2">Notes</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2.5 text-sm h-20"
                placeholder="Additional instructions e.g. express delivery"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
              />
            )}
          />
        </View>

        <TouchableOpacity
          className="bg-primary rounded-lg py-3.5 items-center flex-row justify-center"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" className="mr-2" />
          ) : null}
          <Text className="text-text text-base font-bold">{editOrder ? 'Save Changes' : 'Place Order'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
