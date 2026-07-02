import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../../api/axiosClient';
import { colors } from '../../../theme/colors';

export function TaxSettingsScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [taxRate, setTaxRate] = useState('');
  const [taxId, setTaxId] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (settings) {
      setTaxRate(settings.taxRate?.toString() || '0');
      setTaxId(settings.taxIdNumber || '');
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: any) => axiosClient.patch('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Tax configuration updated.' });
      navigation.goBack();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update tax settings.' }),
  });

  const handleSave = () => {
    mutation.mutate({ taxRate: parseFloat(taxRate) || 0, taxIdNumber: taxId });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text className="text-text text-lg font-bold">Tax Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="bg-card rounded-xl p-5 border border-border">
          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Default Tax Rate (%)</Text>
          <TextInput
            value={taxRate}
            onChangeText={setTaxRate}
            placeholder="e.g. 18"
            placeholderTextColor="#475569"
            keyboardType="decimal-pad"
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
          />

          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Tax ID Number (GSTIN/VAT)</Text>
          <TextInput
            value={taxId}
            onChangeText={setTaxId}
            placeholder="e.g. 27AADCB2230M1Z2"
            placeholderTextColor="#475569"
            autoCapitalize="characters"
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-6"
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={mutation.isPending}
            className="bg-primary rounded-lg py-3 items-center"
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-text font-bold text-base">Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
