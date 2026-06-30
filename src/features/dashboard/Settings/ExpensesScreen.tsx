import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../../api/axiosClient';
import { colors } from '../../../theme/colors';

const CATEGORIES = ['RENT', 'UTILITIES', 'SALARY', 'STOCK', 'OTHER'];
const CATEGORY_COLORS: Record<string, string> = {
  RENT: '#ef4444',
  UTILITIES: '#3b82f6',
  SALARY: '#10b981',
  STOCK: '#f59e0b',
  OTHER: '#6b7280',
};

export function ExpensesScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('UTILITIES');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await axiosClient.get('/expenses');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => axiosClient.post('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      Toast.show({ type: 'success', text1: 'Expense Logged' });
      setModalVisible(false);
      setDescription('');
      setAmount('');
    },
    onError: () => Toast.show({ type: 'error', text1: 'Logging Failed' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axiosClient.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      Toast.show({ type: 'success', text1: 'Expense Deleted' });
    },
  });

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!description || isNaN(amt) || amt <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter description and valid amount.' });
      return;
    }
    createMutation.mutate({ description, amount: amt, category });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Expense', 'Are you sure you want to remove this expense record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const totalExpense = expenses.reduce((acc: number, cur: any) => acc + cur.amount, 0);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="bg-card border-b border-border px-6 pt-14 pb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#06b6d4" />
          </TouchableOpacity>
          <Text className="text-text text-lg font-bold">Expense Tracker</Text>
        </View>
        <TouchableOpacity onPress={() => setModalVisible(true)} className="bg-[#06b6d4] w-9 h-9 rounded-full items-center justify-center">
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Total stats card */}
        <View className="bg-card rounded-xl p-5 border border-border mb-6">
          <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-1">Total Operational Outlay</Text>
          <Text className="text-text text-3xl font-extrabold">₹{totalExpense.toLocaleString('en-IN')}</Text>
        </View>

        {/* Expenses List */}
        <Text className="text-textSecondary text-xs font-bold uppercase tracking-wider mb-3">Logged Expenses</Text>
        {expenses.length === 0 ? (
          <View className="items-center py-10">
            <Ionicons name="receipt-outline" size={44} color="#374151" className="mb-3" />
            <Text className="text-textSecondary">No expenses logged this period.</Text>
          </View>
        ) : (
          expenses.map((expense: any) => (
            <View key={expense.id} className="bg-card rounded-xl p-4 border border-border mb-3 flex-row justify-between items-center">
              <View className="flex-1 mr-4">
                <View className="flex-row items-center mb-1">
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLORS[expense.category] || '#fff', marginRight: 8 }} />
                  <Text className="text-text font-bold text-base">{expense.description}</Text>
                </View>
                <Text className="text-textSecondary text-xs uppercase">{expense.category} · {new Date(expense.date).toLocaleDateString('en-IN')}</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-text font-extrabold text-base mr-3">₹{expense.amount}</Text>
                <TouchableOpacity onPress={() => handleDelete(expense.id)} className="w-8 h-8 rounded-full bg-[#ef4444]/10 items-center justify-center">
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Log Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-card border-t border-border rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-text text-lg font-bold">Log New Expense</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Electricity Bill"
              placeholderTextColor="#475569"
              className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
            />

            <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Amount (₹)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 4500"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              className="bg-background text-text border border-border rounded-lg px-4 py-3 mb-4"
            />

            <Text className="text-textSecondary text-xs font-bold uppercase mb-2">Category</Text>
            <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={{
                    backgroundColor: category === cat ? CATEGORY_COLORS[cat] : '#090d16',
                    borderColor: '#1f2937',
                    borderWidth: 1,
                  }}
                  className="px-3.5 py-2 rounded-full"
                >
                  <Text className="text-text font-bold text-xs">{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={createMutation.isPending}
              className="bg-[#06b6d4] rounded-lg py-3 items-center"
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-text font-bold text-base">Submit Log</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
