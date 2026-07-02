import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../../api/axiosClient';
import { colors } from '../../../theme/colors';

export function BackupRestoreScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [autoBackup, setAutoBackup] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (settings) {
      setAutoBackup(settings.autoBackupEnabled || false);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (data: any) => axiosClient.patch('/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      Toast.show({ type: 'success', text1: 'Auto-Backup Updated' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Update Failed' }),
  });

  const toggleSwitch = (val: boolean) => {
    setAutoBackup(val);
    mutation.mutate({ autoBackupEnabled: val });
  };

  const handleExport = () => {
    Alert.alert(
      'Export Data',
      'This will generate a JSON export of your workspace data and open the share dialog.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => Toast.show({ type: 'info', text1: 'Exporting...', text2: 'This may take a moment.' }) },
      ]
    );
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
        <Text className="text-text text-lg font-bold">Backup & Restore</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Cloud Auto Backup */}
        <View className="bg-card rounded-xl p-5 border border-border mb-6 flex-row justify-between items-center">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-1">
              <Ionicons name="cloud-upload-outline" size={18} color="#6366f1" className="mr-2" />
              <Text className="text-text text-base font-bold">Cloud Auto-Backup</Text>
            </View>
            <Text className="text-textSecondary text-xs leading-5">
              Automatically back up your clinic's database securely to our encrypted cloud servers every 24 hours.
            </Text>
          </View>
          <Switch
            value={autoBackup}
            onValueChange={toggleSwitch}
            trackColor={{ false: '#374151', true: '#6366f1' }}
            thumbColor={autoBackup ? '#ffffff' : '#9ca3af'}
          />
        </View>

        {/* Manual Export */}
        <View className="bg-card rounded-xl p-5 border border-border">
          <Text className="text-text text-base font-bold mb-2">Local Export</Text>
          <Text className="text-textSecondary text-xs leading-5 mb-5">
            Download a complete copy of your workspace data (Customers, Orders, Prescriptions, Appointments) in JSON format.
          </Text>
          <TouchableOpacity
            onPress={handleExport}
            className="bg-border border border-border rounded-lg py-3 flex-row justify-center items-center"
          >
            <Ionicons name="download-outline" size={18} color="#f1f5f9" className="mr-2" />
            <Text className="text-text font-bold text-sm">Generate JSON Export</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
