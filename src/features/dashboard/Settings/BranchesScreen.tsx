import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../../api/axiosClient';
import { colors } from '../../../theme/colors';

export function BranchesScreen({ navigation }: any) {
  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings/branches');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axiosClient.delete(`/settings/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      Toast.show({ type: 'success', text1: 'Branch Deleted' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Delete Failed' }),
  });

  const handleDelete = (id: string) => {
    Alert.alert('Delete Branch', 'Are you sure you want to remove this branch?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
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
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#06b6d4" />
          </TouchableOpacity>
          <Text className="text-text text-lg font-bold">Branches & Hours</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AddBranch')}>
          <Ionicons name="add" size={26} color="#06b6d4" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {branches?.length === 0 ? (
          <View className="items-center justify-center py-10 mt-10">
            <Ionicons name="business-outline" size={48} color="#374151" className="mb-4" />
            <Text className="text-textSecondary font-medium text-base">No branches added yet.</Text>
          </View>
        ) : (
          branches?.map((branch: any) => (
            <View key={branch.id} className="bg-card rounded-xl p-5 border border-border mb-4 relative">
              <TouchableOpacity
                onPress={() => handleDelete(branch.id)}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#ef4444]/10 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
              
              <Text className="text-text font-bold text-lg mb-1 pr-10">{branch.name}</Text>
              <View className="flex-row items-start mt-2">
                <Ionicons name="location-outline" size={14} color="#a1a1aa" className="mr-2 mt-0.5" />
                <Text className="text-textSecondary text-sm flex-1">{branch.address}</Text>
              </View>
              {branch.phone && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="call-outline" size={14} color="#a1a1aa" className="mr-2" />
                  <Text className="text-textSecondary text-sm">{branch.phone}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
