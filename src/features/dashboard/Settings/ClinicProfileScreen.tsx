import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../../api/axiosClient';
import { colors } from '../../../theme/colors';

export function ClinicProfileScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (settings) {
      setEmail(settings.clinicEmail || '');
      setPhone(settings.clinicPhone || '');
      setWebsite(settings.clinicWebsite || '');
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: any) => axiosClient.patch('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Clinic profile updated successfully.' });
      navigation.goBack();
    },
    onError: () => Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save profile.' }),
  });

  const handleSave = () => {
    mutation.mutate({ clinicEmail: email, clinicPhone: phone, clinicWebsite: website });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#06b6d4" />
        </TouchableOpacity>
        <Text className="text-text text-lg font-bold">Clinic Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="bg-card rounded-xl p-5 border border-border">
          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Support Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. contact@optiflow.com"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
          />

          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Support Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +91 9876543210"
            placeholderTextColor="#475569"
            keyboardType="phone-pad"
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
          />

          <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Website URL</Text>
          <TextInput
            value={website}
            onChangeText={setWebsite}
            placeholder="e.g. https://www.myclinic.com"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={mutation.isPending}
            className="bg-[#06b6d4] rounded-lg py-3 mt-4 items-center"
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-text font-bold text-base">Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
