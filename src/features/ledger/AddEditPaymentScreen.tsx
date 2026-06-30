import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors } from '../../theme/colors';

interface AddEditPaymentScreenProps {
  route: any;
  navigation: any;
}

export function AddEditPaymentScreen({ route, navigation }: AddEditPaymentScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = getStyles(colors);
  const queryClient = useQueryClient();

  const { customerId, customerName, transaction } = route.params;

  // Logging Mode: 'payment' or 'adjustment'
  const [mode, setMode] = useState<'payment' | 'adjustment'>('payment');
  
  // Form states
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('PARTIAL_PAYMENT');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  // Handle switching modes to set appropriate defaults
  const handleModeChange = (newMode: 'payment' | 'adjustment') => {
    setMode(newMode);
    if (newMode === 'payment') {
      setType('PARTIAL_PAYMENT');
    } else {
      setType('ADJUSTMENT');
    }
  };

  const logMutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Please enter a valid amount greater than 0.');
      }

      const payload = {
        customerId,
        amount: parsedAmount,
        type,
        referenceId: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const url = mode === 'payment' ? ENDPOINTS.ledger.addPayment : ENDPOINTS.ledger.addAdjustment;
      return axiosClient.post(url, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', customerId] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      Toast.show({
        type: 'success',
        text1: 'Entry Recorded',
        text2: `Successfully added ${mode === 'payment' ? 'payment' : 'adjustment'} for ${customerName}.`,
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Saving failed';
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: errMsg });
    },
  });

  const handleSubmit = () => {
    if (!amount) {
      Alert.alert('Required Field', 'Please enter a valid amount.');
      return;
    }
    logMutation.mutate();
  };

  const paymentTypes = [
    { key: 'ADVANCE_PAYMENT', label: 'Advance Payment' },
    { key: 'PARTIAL_PAYMENT', label: 'Partial Payment' },
    { key: 'FULL_PAYMENT', label: 'Full Payment' },
  ];

  const adjustmentTypes = [
    { key: 'ADJUSTMENT', label: 'Discount/Adjustment (Credit)' },
    { key: 'DISCOUNT', label: 'Promotional Discount (Credit)' },
    { key: 'RETURN', label: 'Product Return (Credit)' },
    { key: 'REFUND', label: 'Refund Cash Out (Debit)' },
    { key: 'EXCHANGE', label: 'Exchange Difference (Debit)' },
    { key: 'OPENING_BALANCE', label: 'Opening Balance (Debit)' },
  ];

  const currentTypes = mode === 'payment' ? paymentTypes : adjustmentTypes;

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSolid }}>
      {/* Header */}
      <View
        className="bg-card border-b border-border px-5 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 20 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-border items-center justify-center"
        >
          <Ionicons name="close" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Text className="text-text font-bold text-base">New Ledger Entry</Text>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={s.customerHeader}>Customer: <Text style={{ color: colors.text }}>{customerName}</Text></Text>

        {/* Mode selector */}
        <View style={s.modeSelector}>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'payment' && s.modeBtnActive]}
            onPress={() => handleModeChange('payment')}
          >
            <Ionicons name="cash-outline" size={16} color={mode === 'payment' ? '#fff' : colors.textSecondary} />
            <Text style={[s.modeBtnText, mode === 'payment' && s.modeBtnTextActive]}>Record Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'adjustment' && s.modeBtnActive]}
            onPress={() => handleModeChange('adjustment')}
          >
            <Ionicons name="options-outline" size={16} color={mode === 'adjustment' ? '#fff' : colors.textSecondary} />
            <Text style={[s.modeBtnText, mode === 'adjustment' && s.modeBtnTextActive]}>Adjustment</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={s.card}>
          <Text style={s.label}>Amount (₹) *</Text>
          <TextInput
            style={s.input}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#475569"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={s.label}>Transaction Category *</Text>
          <View style={s.optionsGrid}>
            {currentTypes.map((t) => {
              const active = type === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.optionCard, active && s.optionCardActive]}
                  onPress={() => setType(t.key)}
                >
                  <Ionicons
                    name={active ? 'checkbox' : 'square-outline'}
                    size={15}
                    color={active ? colors.primary : '#475569'}
                  />
                  <Text style={[s.optionText, active && s.optionTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>Reference Number / Invoice ID (Optional)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. UPI Ref, Invoice ID"
            placeholderTextColor="#475569"
            value={referenceId}
            onChangeText={setReferenceId}
          />

          <Text style={s.label}>Notes & Remarks (Optional)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            multiline
            numberOfLines={4}
            placeholder="Add payment method, specific details, or reason for adjustment..."
            placeholderTextColor="#475569"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          style={[s.submitBtn, logMutation.isPending && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={logMutation.isPending}
        >
          {logMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={s.submitText}>Save Ledger Entry</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  customerHeader: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 16 },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, padding: 4, marginBottom: 20,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  modeBtnTextActive: { color: '#fff' },
  card: {
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 24,
  },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    color: colors.text, fontSize: 14, marginBottom: 16,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  optionsGrid: { gap: 6, marginBottom: 16 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, padding: 12,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  optionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  optionTextActive: { color: colors.primary, fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 14,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
