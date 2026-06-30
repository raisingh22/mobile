import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';

const customerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional().or(z.literal('')),
  gender: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddEditCustomerScreenProps {
  route: any;
  navigation: any;
}

export function AddEditCustomerScreen({ route, navigation }: AddEditCustomerScreenProps) {
  const customer = route.params?.customer;
  const isEdit = !!customer;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: customer?.fullName || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      dateOfBirth: customer?.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
      gender: customer?.gender || '',
      address: customer?.address || '',
      notes: customer?.notes || '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      // Clean up empty fields before sending to API
      const payload = { ...data };
      if (!payload.email) delete payload.email;
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      
      if (isEdit) {
        return axiosClient.patch(ENDPOINTS.customers.update(customer.id), payload);
      } else {
        return axiosClient.post(ENDPOINTS.customers.create, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
      }
      Toast.show({
        type: 'success',
        text1: isEdit ? 'Customer Updated' : 'Customer Added',
        text2: isEdit ? 'Profile details saved successfully.' : 'New profile created successfully.',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Request failed';
      Toast.show({
        type: 'error',
        text1: 'Request Failed',
        text2: errMsg,
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      className="bg-[#09090b]"
    >
      {/* Header Bar */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-[#6366f1] text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">{isEdit ? 'Edit Customer' : 'Add Customer'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 45 }}>
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
          
          <Text className="text-[#a1a1aa] text-sm font-medium mb-2">Full Name *</Text>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2.5 mb-1 text-sm"
                placeholder="John Doe"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.fullName && (
            <Text className="text-[#ef4444] text-xs mb-3">{errors.fullName.message}</Text>
          )}

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2 mt-2">Phone Number *</Text>
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2.5 mb-1 text-sm"
                placeholder="9876543210"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                keyboardType="phone-pad"
              />
            )}
          />
          {errors.phone && (
            <Text className="text-[#ef4444] text-xs mb-3">{errors.phone.message}</Text>
          )}

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2 mt-2">Email (Optional)</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2.5 mb-1 text-sm"
                placeholder="john@example.com"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            )}
          />
          {errors.email && (
            <Text className="text-[#ef4444] text-xs mb-3">{errors.email.message}</Text>
          )}

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2 mt-2">Date of Birth (Optional, YYYY-MM-DD)</Text>
          <Controller
            control={control}
            name="dateOfBirth"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2.5 mb-1 text-sm"
                placeholder="1990-04-15"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.dateOfBirth && (
            <Text className="text-[#ef4444] text-xs mb-3">{errors.dateOfBirth.message}</Text>
          )}

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2 mt-2">Gender (Optional)</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2.5 mb-1 text-sm"
                placeholder="Male / Female / Other"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2 mt-2">Address (Optional)</Text>
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2.5 mb-1 text-sm"
                placeholder="MG Road, Pune"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <Text className="text-[#a1a1aa] text-sm font-medium mb-2 mt-2">Notes (Optional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-[#09090b] text-white border border-[#27272a] rounded-lg px-4 py-2.5 mb-1 text-sm h-20 text-start"
                placeholder="Prefers lightweight frames"
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

          <TouchableOpacity
            className="bg-[#6366f1] rounded-lg py-3.5 items-center mt-6 flex-row justify-center"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" className="mr-2" />
            ) : null}
            <Text className="text-white text-base font-bold">{isEdit ? 'Save Changes' : 'Create Customer'}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
