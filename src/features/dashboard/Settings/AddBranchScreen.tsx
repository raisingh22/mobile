import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../../api/axiosClient';
import { colors } from '../../../theme/colors';

export function AddBranchScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: async (data: any) => axiosClient.post('/settings/branches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      Toast.show({ type: 'success', text1: 'Branch Added' });
      navigation.goBack();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to add branch' }),
  });

  const handleSave = () => {
    if (!name || !address) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name and address are required.' });
      return;
    }
    mutation.mutate({ name, address, phone });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#06b6d4" />
        </TouchableOpacity>
        <Text className="text-text text-lg font-bold">Add Branch</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="bg-card rounded-xl p-5 border border-border">
          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Branch Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Downtown Clinic"
            placeholderTextColor="#475569"
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
          />

          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Full Address *</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. 123 Main St, City"
            placeholderTextColor="#475569"
            multiline
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4 min-h-[80px]"
          />

          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Contact Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +91 99999 88888"
            placeholderTextColor="#475569"
            keyboardType="phone-pad"
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-6"
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={mutation.isPending}
            className="bg-[#06b6d4] rounded-lg py-3 items-center"
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-text font-bold text-base">Create Branch</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
