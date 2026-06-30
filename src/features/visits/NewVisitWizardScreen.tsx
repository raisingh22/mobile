import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors } from '../../theme/colors';

interface NewVisitWizardScreenProps {
  route: any;
  navigation: any;
}

export function NewVisitWizardScreen({ route, navigation }: NewVisitWizardScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = getStyles(colors);
  const queryClient = useQueryClient();

  const { customerId, customerName } = route.params;

  // Collapsible step states
  const [activeStep, setActiveStep] = useState<number>(1);
  const [performExam, setPerformExam] = useState(false);
  const [recordOrder, setRecordOrder] = useState(false);

  // Step 1: Visit Details
  const [visitType, setVisitType] = useState('Full Exam');
  const [doctorName, setDoctorName] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  // Step 2: Prescription Form
  const [odSph, setOdSph] = useState('');
  const [odCyl, setOdCyl] = useState('');
  const [odAxis, setOdAxis] = useState('');
  const [odAdd, setOdAdd] = useState('');
  const [osSph, setOsSph] = useState('');
  const [osCyl, setOsCyl] = useState('');
  const [osAxis, setOsAxis] = useState('');
  const [osAdd, setOsAdd] = useState('');
  const [pd, setPd] = useState('');
  const [rxNotes, setRxNotes] = useState('');

  // Step 3: Specs Order Details
  const [frameName, setFrameName] = useState('');
  const [frameBrand, setFrameBrand] = useState('');
  const [frameModel, setFrameModel] = useState('');
  const [lensType, setLensType] = useState('');
  const [lensCoating, setLensCoating] = useState('');
  const [qty, setQty] = useState('1');
  const [subtotal, setSubtotal] = useState('');
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [orderNotes, setOrderNotes] = useState('');

  // Step 4: Billing
  const [paidAmount, setPaidAmount] = useState('');

  // Fetch previous prescriptions to show side-by-side
  const { data: previousRxList } = useQuery<any[]>({
    queryKey: ['customer-prescriptions', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.prescriptions(customerId));
      return response.data;
    },
    enabled: performExam,
  });

  const latestRx = previousRxList && previousRxList.length > 0 ? previousRxList[0] : null;

  // Copy previous prescription values
  const handleCopyPreviousRx = () => {
    if (!latestRx) return;
    setOdSph(latestRx.rightSphere?.toString() || '');
    setOdCyl(latestRx.rightCylinder?.toString() || '');
    setOdAxis(latestRx.rightAxis?.toString() || '');
    setOdAdd(latestRx.rightAdd?.toString() || '');
    setOsSph(latestRx.leftSphere?.toString() || '');
    setOsCyl(latestRx.leftCylinder?.toString() || '');
    setOsAxis(latestRx.leftAxis?.toString() || '');
    setOsAdd(latestRx.leftAdd?.toString() || '');
    setPd(latestRx.pupillaryDistance?.toString() || '');
    setRxNotes(latestRx.notes || '');
    Toast.show({ type: 'info', text1: 'Rx Values Copied', text2: 'Loaded previous optical parameters.' });
  };

  // Math helper
  const sub = parseFloat(subtotal) || 0;
  const disc = parseFloat(discount) || 0;
  const tx = parseFloat(tax) || 0;
  const total = Math.max(0, sub - disc + tx);
  const paid = parseFloat(paidAmount) || 0;
  const due = Math.max(0, total - paid);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        customerId,
        type: visitType,
        doctorName: doctorName || undefined,
        notes: visitNotes || undefined,
      };

      if (performExam) {
        payload.prescription = {
          rightSphere: odSph ? parseFloat(odSph) : undefined,
          rightCylinder: odCyl ? parseFloat(odCyl) : undefined,
          rightAxis: odAxis ? parseInt(odAxis, 10) : undefined,
          rightAdd: odAdd ? parseFloat(odAdd) : undefined,
          leftSphere: osSph ? parseFloat(osSph) : undefined,
          leftCylinder: osCyl ? parseFloat(osCyl) : undefined,
          leftAxis: osAxis ? parseInt(osAxis, 10) : undefined,
          leftAdd: osAdd ? parseFloat(osAdd) : undefined,
          pupillaryDistance: pd ? parseFloat(pd) : undefined,
          notes: rxNotes || undefined,
        };
      }

      if (recordOrder) {
        payload.order = {
          frameName: frameName || undefined,
          frameBrand: frameBrand || undefined,
          frameModel: frameModel || undefined,
          lensType: lensType || undefined,
          lensCoating: lensCoating || undefined,
          quantity: parseInt(qty, 10) || 1,
          subtotal: sub,
          discount: disc || undefined,
          tax: tx || undefined,
          paidAmount: paid || 0,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          notes: orderNotes || undefined,
        };
      }

      return axiosClient.post(ENDPOINTS.visits.create, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['ledger', customerId] });
      queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({
        type: 'success',
        text1: 'Visit Encounter Completed',
        text2: `Successfully completed visit logs for ${customerName}.`,
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Saving failed';
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: errMsg });
    },
  });

  const handleSave = () => {
    if (recordOrder && isNaN(sub)) {
      Alert.alert('Required Value', 'Please enter a valid order subtotal.');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSolid }}>
      {/* Header */}
      <View
        style={[s.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 20 }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </TouchableOpacity>

        <Text style={s.headerTitle}>New Visit Encounter</Text>

        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.container}>
          <Text style={s.customerSub}>Patient: <Text style={{ color: colors.text }}>{customerName}</Text></Text>

          {/* STEP 1: Visit purpose & details */}
          <View style={s.stepCard}>
            <TouchableOpacity style={s.stepHeader} onPress={() => setActiveStep(1)}>
              <View style={[s.stepNum, activeStep === 1 && s.stepNumActive]}>
                <Text style={[s.stepNumText, activeStep === 1 && s.stepNumTextActive]}>1</Text>
              </View>
              <Text style={s.stepTitle}>Visit Settings</Text>
              <Ionicons
                name={activeStep === 1 ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {activeStep === 1 && (
              <View style={s.stepBody}>
                <Text style={s.label}>Visit Type *</Text>
                <View style={s.typeGrid}>
                  {['Full Exam', 'Fitting', 'Follow-up', 'Quick Buy'].map((type) => {
                    const selected = visitType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[s.typeBtn, selected && s.typeBtnActive]}
                        onPress={() => setVisitType(type)}
                      >
                        <Text style={[s.typeText, selected && s.typeTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.label}>Assign Doctor / Staff</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Dr. Verma, Optometrist Staff"
                  placeholderTextColor="#475569"
                  value={doctorName}
                  onChangeText={setDoctorName}
                />

                <Text style={s.label}>Encounter Notes</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  multiline
                  placeholder="Reason for visit, general complaints, or customer notes..."
                  placeholderTextColor="#475569"
                  value={visitNotes}
                  onChangeText={setVisitNotes}
                />
              </View>
            )}
          </View>

          {/* STEP 2: Eye Refraction Test */}
          <View style={s.stepCard}>
            <View style={s.stepHeaderWithSwitch}>
              <View style={s.stepHeaderLeft}>
                <View style={[s.stepNum, performExam && s.stepNumActive]}>
                  <Text style={[s.stepNumText, performExam && s.stepNumTextActive]}>2</Text>
                </View>
                <Text style={s.stepTitle}>Clinical Eye Exam</Text>
              </View>
              <Switch
                value={performExam}
                onValueChange={(val) => {
                  setPerformExam(val);
                  if (val) setActiveStep(2);
                }}
                trackColor={{ false: '#374151', true: colors.primary }}
              />
            </View>

            {performExam && activeStep === 2 && (
              <View style={s.stepBody}>
                {/* Previous Refraction side-by-side indicator */}
                {latestRx ? (
                  <View style={s.prevRxPanel}>
                    <View style={s.prevRxHeader}>
                      <Ionicons name="eye-outline" size={14} color={colors.primary} />
                      <Text style={s.prevRxTitle}>Previous Exam (Dated: {new Date(latestRx.prescriptionDate || latestRx.createdAt).toLocaleDateString('en-IN')})</Text>
                    </View>
                    <Text style={s.prevRxText}>
                      OD: Sph {latestRx.rightSphere || '0'}, Cyl {latestRx.rightCylinder || '0'}, Axis {latestRx.rightAxis || '0'}
                    </Text>
                    <Text style={s.prevRxText}>
                      OS: Sph {latestRx.leftSphere || '0'}, Cyl {latestRx.leftCylinder || '0'}, Axis {latestRx.leftAxis || '0'}
                    </Text>
                    <TouchableOpacity style={s.copyBtn} onPress={handleCopyPreviousRx}>
                      <Ionicons name="copy-outline" size={12} color="#fff" />
                      <Text style={s.copyBtnText}>Copy Values to Form</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={s.noPrevText}>No previous prescriptions found for this patient.</Text>
                )}

                {/* Sph/Cyl Grid */}
                <Text style={s.sectionHeaderText}>Right Eye (OD)</Text>
                <View style={s.refRow}>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Sph</Text>
                    <TextInput style={s.inputCompact} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#475569" value={odSph} onChangeText={setOdSph} />
                  </View>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Cyl</Text>
                    <TextInput style={s.inputCompact} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#475569" value={odCyl} onChangeText={setOdCyl} />
                  </View>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Axis</Text>
                    <TextInput style={s.inputCompact} keyboardType="number-pad" placeholder="0" placeholderTextColor="#475569" value={odAxis} onChangeText={setOdAxis} />
                  </View>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Add</Text>
                    <TextInput style={s.inputCompact} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#475569" value={odAdd} onChangeText={setOdAdd} />
                  </View>
                </View>

                <Text style={s.sectionHeaderText}>Left Eye (OS)</Text>
                <View style={s.refRow}>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Sph</Text>
                    <TextInput style={s.inputCompact} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#475569" value={osSph} onChangeText={setOsSph} />
                  </View>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Cyl</Text>
                    <TextInput style={s.inputCompact} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#475569" value={osCyl} onChangeText={setOsCyl} />
                  </View>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Axis</Text>
                    <TextInput style={s.inputCompact} keyboardType="number-pad" placeholder="0" placeholderTextColor="#475569" value={osAxis} onChangeText={setOsAxis} />
                  </View>
                  <View style={s.col}>
                    <Text style={s.gridLabel}>Add</Text>
                    <TextInput style={s.inputCompact} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#475569" value={osAdd} onChangeText={setOsAdd} />
                  </View>
                </View>

                <Text style={s.label}>Pupillary Distance (PD)</Text>
                <TextInput
                  style={s.input}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 62"
                  placeholderTextColor="#475569"
                  value={pd}
                  onChangeText={setPd}
                />

                <Text style={s.label}>Clinical Findings / Lab Remarks</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  multiline
                  placeholder="Additional observations, recommended lens structure, or Glaucoma notes..."
                  placeholderTextColor="#475569"
                  value={rxNotes}
                  onChangeText={setRxNotes}
                />
              </View>
            )}
          </View>

          {/* STEP 3: Frame / Lenses Order */}
          <View style={s.stepCard}>
            <View style={s.stepHeaderWithSwitch}>
              <View style={s.stepHeaderLeft}>
                <View style={[s.stepNum, recordOrder && s.stepNumActive]}>
                  <Text style={[s.stepNumText, recordOrder && s.stepNumTextActive]}>3</Text>
                </View>
                <Text style={s.stepTitle}>Purchase Specs Order</Text>
              </View>
              <Switch
                value={recordOrder}
                onValueChange={(val) => {
                  setRecordOrder(val);
                  if (val) setActiveStep(3);
                }}
                trackColor={{ false: '#374151', true: colors.primary }}
              />
            </View>

            {recordOrder && activeStep === 3 && (
              <View style={s.stepBody}>
                <Text style={s.label}>Frame Details</Text>
                <TextInput
                  style={s.input}
                  placeholder="Frame Brand (e.g. Ray-Ban)"
                  placeholderTextColor="#475569"
                  value={frameBrand}
                  onChangeText={setFrameBrand}
                />
                <TextInput
                  style={s.input}
                  placeholder="Frame Model (e.g. RB5154)"
                  placeholderTextColor="#475569"
                  value={frameModel}
                  onChangeText={setFrameModel}
                />
                <TextInput
                  style={s.input}
                  placeholder="Frame Size/Name"
                  placeholderTextColor="#475569"
                  value={frameName}
                  onChangeText={setFrameName}
                />

                <Text style={s.label}>Lens Specifications</Text>
                <TextInput
                  style={s.input}
                  placeholder="Lens Type (e.g. Progressive, Single Vision)"
                  placeholderTextColor="#475569"
                  value={lensType}
                  onChangeText={setLensType}
                />
                <TextInput
                  style={s.input}
                  placeholder="Lens Coating (e.g. Crizal Blue Cut, Anti-Glare)"
                  placeholderTextColor="#475569"
                  value={lensCoating}
                  onChangeText={setLensCoating}
                />

                <Text style={s.label}>Pricing (₹) *</Text>
                <TextInput
                  style={s.input}
                  keyboardType="decimal-pad"
                  placeholder="Order Subtotal (Subtotal)"
                  placeholderTextColor="#475569"
                  value={subtotal}
                  onChangeText={setSubtotal}
                />
                <TextInput
                  style={s.input}
                  keyboardType="decimal-pad"
                  placeholder="Discounts (Credit)"
                  placeholderTextColor="#475569"
                  value={discount}
                  onChangeText={setDiscount}
                />
                <TextInput
                  style={s.input}
                  keyboardType="decimal-pad"
                  placeholder="Tax Amount (Tax)"
                  placeholderTextColor="#475569"
                  value={tax}
                  onChangeText={setTax}
                />

                <Text style={s.label}>Expected Delivery Date</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#475569"
                  value={expectedDeliveryDate}
                  onChangeText={setExpectedDeliveryDate}
                />

                <Text style={s.label}>Order Fit Notes</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  multiline
                  placeholder="Specify bifocal height, progressive lens details, or delivery instructions..."
                  placeholderTextColor="#475569"
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                />
              </View>
            )}
          </View>

          {/* STEP 4: Billing Summary & Payment */}
          {recordOrder && (
            <View style={s.stepCard}>
              <TouchableOpacity style={s.stepHeader} onPress={() => setActiveStep(4)}>
                <View style={[s.stepNum, activeStep === 4 && s.stepNumActive]}>
                  <Text style={[s.stepNumText, activeStep === 4 && s.stepNumTextActive]}>4</Text>
                </View>
                <Text style={s.stepTitle}>Billing & Receipt Log</Text>
                <Ionicons
                  name={activeStep === 4 ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {activeStep === 4 && (
                <View style={s.stepBody}>
                  <View style={s.billingItem}>
                    <Text style={s.billingLabel}>Order Subtotal</Text>
                    <Text style={s.billingVal}>₹{sub.toLocaleString()}</Text>
                  </View>
                  <View style={s.billingItem}>
                    <Text style={s.billingLabel}>Applied Discount</Text>
                    <Text style={[s.billingVal, { color: colors.danger }]}>-₹{disc.toLocaleString()}</Text>
                  </View>
                  <View style={s.billingItem}>
                    <Text style={s.billingLabel}>Tax</Text>
                    <Text style={s.billingVal}>+₹{tx.toLocaleString()}</Text>
                  </View>
                  <View style={[s.billingItem, s.billingTotalRow]}>
                    <Text style={s.billingTotalLabel}>Total Order Cost</Text>
                    <Text style={s.billingTotalVal}>₹{total.toLocaleString()}</Text>
                  </View>

                  <Text style={[s.label, { marginTop: 14 }]}>Log Deposit Payment (₹)</Text>
                  <TextInput
                    style={s.input}
                    keyboardType="decimal-pad"
                    placeholder="Advance or Full Payment"
                    placeholderTextColor="#475569"
                    value={paidAmount}
                    onChangeText={setPaidAmount}
                  />

                  <View style={[s.billingItem, { borderTopWidth: 0, paddingVertical: 4 }]}>
                    <Text style={s.billingLabel}>Current Outstanding Dues</Text>
                    <Text style={[s.billingTotalVal, { color: due > 0 ? colors.danger : colors.success }]}>
                      ₹{due.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, submitMutation.isPending && s.submitDisabled]}
            onPress={handleSave}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={s.submitText}>Save Visit Session</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: 16, paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  container: { padding: 14, paddingBottom: 60 },
  customerSub: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 14 },
  stepCard: {
    backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 16, marginBottom: 12, overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 10,
  },
  stepHeaderWithSwitch: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  stepHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumActive: { backgroundColor: colors.primary },
  stepNumText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  stepNumTextActive: { color: '#fff' },
  stepTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  stepBody: { padding: 14, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 12 },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 13,
  },
  inputCompact: {
    backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 8,
    color: colors.text, fontSize: 12, textAlign: 'center',
  },
  textarea: { height: 70, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', gap: 6 },
  typeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  typeBtnActive: { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
  typeText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  typeTextActive: { color: colors.primary, fontWeight: '700' },
  // ── Previous Rx ──────────────────────────────────
  prevRxPanel: {
    backgroundColor: colors.primaryGlow,
    borderWidth: 1, borderColor: colors.primary + '30',
    borderRadius: 12, padding: 10, marginBottom: 12, gap: 4,
  },
  prevRxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  prevRxTitle: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  prevRxText: { color: colors.textSecondary, fontSize: 11 },
  noPrevText: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic', marginBottom: 10 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start', marginTop: 8,
  },
  copyBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  // ── Refraction ────────────────────────────────────
  sectionHeaderText: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 6 },
  refRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  col: { flex: 1 },
  gridLabel: { color: colors.textMuted, fontSize: 9, alignSelf: 'center', marginBottom: 2 },
  // ── Billing ───────────────────────────────────────
  billingItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billingLabel: { color: colors.textSecondary, fontSize: 12 },
  billingVal: { color: colors.text, fontSize: 12, fontWeight: '600' },
  billingTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  billingTotalLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  billingTotalVal: { color: colors.text, fontSize: 15, fontWeight: '800' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 14, marginTop: 16,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
