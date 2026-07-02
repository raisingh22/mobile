import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../../api/axiosClient';
import { colors } from '../../../theme/colors';

export function SuppliersScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await axiosClient.get('/suppliers');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => axiosClient.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      Toast.show({ type: 'success', text1: 'Supplier Added' });
      setModalVisible(false);
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to add supplier' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axiosClient.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      Toast.show({ type: 'success', text1: 'Supplier Removed' });
    },
  });

  const handleSave = () => {
    if (!name) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Supplier Name is required.' });
      return;
    }
    createMutation.mutate({ name, contactPerson, phone, email, address });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Supplier', 'Are you sure you want to delete this supplier contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (emailAddress: string) => {
    Linking.openURL(`mailto:${emailAddress}`);
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
      {/* Header */}
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#6366f1" />
          </TouchableOpacity>
          <Text className="text-text text-lg font-bold">Supplier Directory</Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} className="bg-primary w-9 h-9 rounded-full items-center justify-center">
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {suppliers.length === 0 ? (
          <View className="items-center justify-center py-10 mt-10">
            <Ionicons name="people-outline" size={48} color="#374151" className="mb-4" />
            <Text className="text-textSecondary">No supplier contacts found.</Text>
          </View>
        ) : (
          suppliers.map((supplier: any) => (
            <View key={supplier.id} className="bg-card rounded-xl p-5 border border-border mb-4 relative">
              <TouchableOpacity
                onPress={() => handleDelete(supplier.id)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#ef4444]/10 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
              </TouchableOpacity>

              <Text className="text-text font-extrabold text-lg mb-1">{supplier.name}</Text>
              {supplier.contactPerson && (
                <Text className="text-textSecondary text-sm mb-3">Contact: {supplier.contactPerson}</Text>
              )}

              {/* Action Rows */}
              <View className="flex-row border-t border-border pt-3 mt-1" style={{ gap: 12 }}>
                {supplier.phone && (
                  <TouchableOpacity onPress={() => handleCall(supplier.phone)} className="flex-row items-center bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                    <Ionicons name="call-outline" size={14} color="#6366f1" className="mr-1.5" />
                    <Text className="text-primary text-xs font-bold">Call</Text>
                  </TouchableOpacity>
                )}
                {supplier.email && (
                  <TouchableOpacity onPress={() => handleEmail(supplier.email)} className="flex-row items-center bg-[#a78bfa]/10 px-3 py-1.5 rounded-lg border border-[#a78bfa]/20">
                    <Ionicons name="mail-outline" size={14} color="#a78bfa" className="mr-1.5" />
                    <Text className="text-[#a78bfa] text-xs font-bold">Email</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Supplier Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-card border-t border-border rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-text text-lg font-bold">Add Supplier Contact</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Company/Supplier Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Zeiss Premium Optics"
              placeholderTextColor="#475569"
              className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
            />

            <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Contact Person</Text>
            <TextInput
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#475569"
              className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
            />

            <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +91 98888 77777"
              placeholderTextColor="#475569"
              keyboardType="phone-pad"
              className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
            />

            <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. orders@zeiss.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-6"
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={createMutation.isPending}
              className="bg-primary rounded-lg py-3 items-center"
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-text font-bold text-base">Save Contact</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
