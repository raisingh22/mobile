import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, Linking, RefreshControl, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors, shadows } from '../../theme/colors';
import { PdfService } from '../../services/PdfService';

interface CustomerLedgerTabProps {
  customerId: string;
  navigation: any;
}

export function CustomerLedgerTab({ customerId, navigation }: CustomerLedgerTabProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch customer ledger details
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ['ledger', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.ledger.details(customerId));
      return response.data;
    },
  });

  // Fetch workspace settings for PDF generation
  const { data: settings } = useQuery<any>({
    queryKey: ['settings-tax'], // matches typical workspace tax settings key
    queryFn: async () => {
      try {
        const response = await axiosClient.get('/settings/tax');
        return response.data;
      } catch {
        return null;
      }
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      return axiosClient.delete(ENDPOINTS.ledger.deleteTransaction(transactionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', customerId] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      Toast.show({ type: 'success', text1: 'Entry Removed', text2: 'Ledger has been recalculated.' });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Delete failed';
      Toast.show({ type: 'error', text1: 'Delete Failed', text2: errMsg });
    },
  });

  const handleDelete = (tx: any) => {
    if (tx.type === 'INVOICE_CREATED' && tx.referenceId) {
      Alert.alert('Cannot Delete', 'This invoice is linked directly to a specs order. Please delete or modify the order instead.');
      return;
    }

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this payment or adjustment? Dues will be recalculated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(tx.id),
        },
      ]
    );
  };

  // Helper for generating PDF Statement
  const generatePdf = async () => {
    if (!data) return null;
    try {
      const txs = [...data.transactions].reverse(); // reverse to pass chronological to PDF
      const pdfUri = await PdfService.generateLedgerPdf(data.summary, txs, settings);
      return pdfUri;
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Export Failed', text2: e.message });
      return null;
    }
  };

  // Actions
  const handlePrint = async () => {
    const uri = await generatePdf();
    if (uri) {
      try {
        await Print.printAsync({ uri });
      } catch (err: any) {
        // If user cancels printing, it throws "Printing did not complete". We should ignore cancellations.
        if (err.message && err.message.includes('complete')) {
          console.log('Printing cancelled or incomplete');
        } else {
          Toast.show({ type: 'error', text1: 'Printing Failed', text2: err.message });
        }
      }
    }
  };

  const handleSharePdf = async () => {
    const uri = await generatePdf();
    if (uri) {
      await PdfService.shareFile(uri, `${data.summary.customerName}_ledger_statement.pdf`);
    }
  };

  const handleWhatsAppReminder = () => {
    if (!data) return;
    const summary = data.summary;
    const cleanPhone = summary.phone.replace(/[^0-9]/g, '');
    const reminderMsg = `Hello ${summary.customerName},\n\nThis is a payment reminder from our clinic. Your current outstanding balance is ₹${summary.currentOutstandingBalance.toLocaleString()}.\n\nKindly clear the dues at your earliest convenience.\n\nThank you!`;
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(reminderMsg)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderMsg)}`);
        }
      })
      .catch(() => {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not launch WhatsApp.' });
      });
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading ledger statement...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Failed to retrieve ledger data.</Text>
      </View>
    );
  }

  const { summary, transactions } = data;
  const isDue = summary.currentOutstandingBalance > 0;
  const balanceColor = isDue ? colors.danger : colors.success;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Outstanding balance sticky card */}
      <View style={[s.balanceCard, { borderColor: isDue ? colors.dangerGlow : colors.successGlow }]}>
        <View style={s.balanceInfo}>
          <Text style={s.balanceLabel}>Current Outstanding Dues</Text>
          <Text style={[s.balanceValue, { color: balanceColor }]}>₹{summary.currentOutstandingBalance.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddEditPayment', {
            customerId,
            customerName: summary.customerName,
          })}
        >
          <Ionicons name="add-circle" size={16} color="#fff" />
          <Text style={s.addBtnText}>Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Analytics stats */}
      <View style={s.statsGrid}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Total Billed</Text>
          <Text style={s.statVal}>₹{summary.totalPurchase.toLocaleString()}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Total Received</Text>
          <Text style={[s.statVal, { color: colors.success }]}>₹{summary.totalPaid.toLocaleString()}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Avg Bill</Text>
          <Text style={s.statVal}>₹{Math.round(summary.averagePurchase).toLocaleString()}</Text>
        </View>
      </View>

      {/* Quick Action Bar */}
      <View style={s.actionBar}>
        <TouchableOpacity style={s.actionBtn} onPress={handlePrint}>
          <Ionicons name="print-outline" size={16} color={colors.primary} />
          <Text style={s.actionBtnText}>Print Statement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={handleSharePdf}>
          <Ionicons name="share-social-outline" size={16} color={colors.primary} />
          <Text style={s.actionBtnText}>Share PDF</Text>
        </TouchableOpacity>
        {isDue && (
          <TouchableOpacity style={[s.actionBtn, s.reminderBtn]} onPress={handleWhatsAppReminder}>
            <Ionicons name="logo-whatsapp" size={16} color="#10b981" />
            <Text style={[s.actionBtnText, { color: '#10b981' }]}>WhatsApp Reminder</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ledger History List */}
      <View style={{ marginTop: 20 }}>
        <Text style={s.historyTitle}>Ledger Timeline</Text>
        {transactions.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="file-tray-outline" size={28} color={colors.textMuted} />
            <Text style={s.emptyText}>No financial transactions recorded.</Text>
          </View>
        ) : (
          transactions.map((tx: any, idx: number) => {
            const isDebit = tx.debit > 0;
            const txDate = new Date(tx.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const formatType = tx.type.replace(/_/g, ' ');

            return (
              <View key={tx.id} style={s.timelineRow}>
                {/* Visual timeline track */}
                <View style={s.timelineTrack}>
                  <View style={[s.timelineBullet, { backgroundColor: isDebit ? colors.danger : colors.success }]} />
                  {idx < transactions.length - 1 && <View style={s.timelineLine} />}
                </View>

                {/* Transaction Details Box */}
                <View style={s.timelineCard}>
                  <View style={s.timelineHeader}>
                    <Text style={s.timelineDate}>{txDate}</Text>
                    <TouchableOpacity onPress={() => handleDelete(tx)}>
                      <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[s.timelineType, { color: isDebit ? colors.danger : colors.success }]}>
                    {formatType}
                  </Text>
                  
                  {tx.notes && <Text style={s.timelineNotes}>"{tx.notes}"</Text>}
                  {tx.referenceId && <Text style={s.timelineRef}>Ref: {tx.referenceId}</Text>}

                  {/* Financial Flow */}
                  <View style={s.timelineFinancials}>
                    <View>
                      <Text style={s.moneyLabel}>{isDebit ? 'Charged (Debit)' : 'Paid (Credit)'}</Text>
                      <Text style={[s.moneyValText, { color: isDebit ? colors.danger : colors.success }]}>
                        {isDebit ? `+₹${tx.debit.toLocaleString()}` : `-₹${tx.credit.toLocaleString()}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.moneyLabel}>Running Balance</Text>
                      <Text style={s.balanceValText}>₹{tx.balance.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  center: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.textSecondary, marginTop: 12, fontSize: 13 },
  errorText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  balanceCard: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...shadows.cardShadow,
    marginBottom: 16,
  },
  balanceInfo: { flex: 1 },
  balanceLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  balanceValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 12, alignItems: 'center',
  },
  statLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  statVal: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 },
  actionBar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  actionBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  reminderBtn: { borderColor: '#10b98130', backgroundColor: '#10b98108' },
  historyTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 16, letterSpacing: 0.1 },
  emptyState: { alignItems: 'center', padding: 30, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  emptyText: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  // ── Timeline ──────────────────────────────────
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineTrack: { width: 14, alignItems: 'center' },
  timelineBullet: { width: 8, height: 8, borderRadius: 4, marginTop: 22 },
  timelineLine: { flex: 1, width: 1.5, backgroundColor: colors.border, marginVertical: 4 },
  timelineCard: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, padding: 14, marginBottom: 12,
    ...shadows.cardShadow,
  },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  timelineDate: { color: colors.textMuted, fontSize: 10, fontWeight: '500' },
  timelineType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  timelineNotes: { color: colors.text, fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  timelineRef: { color: colors.textMuted, fontSize: 10, fontFamily: 'monospace', marginBottom: 8 },
  timelineFinancials: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 8, marginTop: 4,
  },
  moneyLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase', fontWeight: '600' },
  moneyValText: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  balanceValText: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 2 },
});
