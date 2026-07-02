import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Alert, Switch, KeyboardAvoidingView, Platform, Animated, Dimensions, Vibration
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors } from '../../theme/colors';

// Design System Components
import { Card } from '../../components/Card';
import { Typography } from '../../components/Typography';

interface NewVisitWizardScreenProps {
  route: any;
  navigation: any;
}

// Helper for haptics using react-native Vibration
const triggerHaptic = () => {
  try {
    Vibration.vibrate(10);
  } catch (e) {
    // ignore
  }
};

// ── Smooth Animated Counter for Numbers ──
function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    if (start === end) {
      setDisplayVal(end);
      return;
    }

    const duration = 800; // ms
    const incrementTime = 30; // ms
    const stepsCount = Math.floor(duration / incrementTime);
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentVal = Math.round((end * step) / stepsCount);
      if (step >= stepsCount) {
        clearInterval(timer);
        setDisplayVal(end);
      } else {
        setDisplayVal(currentVal);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <Text>{prefix}{displayVal.toLocaleString('en-IN')}{suffix}</Text>;
}

// ── Tactile Jog-Dial Wheel ──
interface JogDialWheelProps {
  value: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}

function JogDialWheel({ value, onChange, min = -12, max = 12, step = 0.25, label }: JogDialWheelProps) {
  const colors = useThemeColors();
  const current = parseFloat(value) || 0;
  const s = getStyles(colors);

  const handleIncrement = () => {
    const next = Math.min(max, current + step);
    triggerHaptic();
    onChange(next > 0 ? `+${next.toFixed(2)}` : next.toFixed(2));
  };

  const handleDecrement = () => {
    const next = Math.max(min, current - step);
    triggerHaptic();
    onChange(next > 0 ? `+${next.toFixed(2)}` : next.toFixed(2));
  };

  const ticksCount = 11;
  const wheelOffset = (current % 1) * 35;

  return (
    <View style={s.dialContainer}>
      <View className="flex-row justify-between items-center px-2 mb-1.5">
        <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase' }}>{label}</Typography>
        <Typography variant="body" weight="bold" color={colors.primary} style={{ fontFamily: 'monospace' }}>
          {current >= 0 ? `+${current.toFixed(2)}` : current.toFixed(2)} D
        </Typography>
      </View>

      <View style={s.wheelWrapper}>
        <TouchableOpacity onPress={handleDecrement} style={s.wheelBtn} activeOpacity={0.7}>
          <Ionicons name="remove" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={s.wheelTrack} className="bg-card">
          <Animated.View style={[s.wheelTrackInner, { transform: [{ translateX: wheelOffset }] }]}>
            {Array.from({ length: ticksCount }).map((_, idx) => {
              const centerIdx = Math.floor(ticksCount / 2);
              const isCenter = idx === centerIdx;
              return (
                <View
                  key={idx}
                  style={[
                    s.wheelTickLine,
                    {
                      height: isCenter ? 24 : 14,
                      backgroundColor: isCenter ? colors.primary : colors.border,
                      opacity: isCenter ? 1 : 0.4,
                    },
                  ]}
                />
              );
            })}
          </Animated.View>
          <View style={[s.wheelIndicatorPin, { backgroundColor: colors.primary }]} />
        </View>

        <TouchableOpacity onPress={handleIncrement} style={s.wheelBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Interactive Axis Dial ──
interface AxisSelectorProps {
  value: string;
  onChange: (val: string) => void;
}

function AxisSelector({ value, onChange }: AxisSelectorProps) {
  const colors = useThemeColors();
  const currentAxis = parseInt(value, 10) || 0;
  const s = getStyles(colors);

  const handleTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const cx = 90;
    const cy = 90;
    const dx = locationX - cx;
    const dy = locationY - cy;

    const angleRad = Math.atan2(-dy, dx);
    let angleDeg = angleRad * (180 / Math.PI);
    if (angleDeg < 0) angleDeg += 360;

    const finalAxis = Math.round(angleDeg % 180);
    triggerHaptic();
    onChange(finalAxis.toString());
  };

  const needleRotation = `${currentAxis}deg` as any;

  return (
    <View style={s.axisContainer}>
      <View className="flex-row justify-between items-center mb-3">
        <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase' }}>Axis Gauge</Typography>
        <Typography variant="body" weight="bold" color={colors.primary} style={{ fontFamily: 'monospace' }}>
          {currentAxis}°
        </Typography>
      </View>

      <View style={s.axisRimContainer}>
        <View
          style={[s.axisRim, { borderColor: colors.borderLight }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
        >
          {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const r = 70;
            const tx = 90 + r * Math.cos(rad) - 8;
            const ty = 90 - r * Math.sin(rad) - 8;
            return (
              <View key={deg} style={[s.axisDegTextWrapper, { left: tx, top: ty }]}>
                <Text style={s.axisDegText}>{deg}</Text>
              </View>
            );
          })}
          <View style={[s.axisHub, { backgroundColor: colors.border }]} />
          <View
            style={[
              s.axisNeedle,
              {
                backgroundColor: colors.primary,
                transform: [{ rotate: needleRotation }],
                shadowColor: colors.primary,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

// ── Lens Thickness Profile Visualizer ──
function LensThicknessVisualizer({ sph }: { sph: string }) {
  const colors = useThemeColors();
  const sphNum = parseFloat(sph) || 0;
  const s = getStyles(colors);

  const baseThickness = 12;
  const delta = Math.abs(sphNum) * 2.8;

  const leftEdgeHeight = sphNum < 0 ? baseThickness + delta : baseThickness;
  const centerHeight = sphNum > 0 ? baseThickness + delta : baseThickness;
  const rightEdgeHeight = sphNum < 0 ? baseThickness + delta : baseThickness;

  return (
    <View style={s.thicknessContainer}>
      <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 6 }}>Lens Profile</Typography>
      <View style={s.thicknessProfileWrapper} className="bg-card">
        <View style={[s.thicknessBlock, { height: leftEdgeHeight, backgroundColor: colors.primary + '30', borderColor: colors.primary, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
        <View style={[s.thicknessBlockCenter, { height: centerHeight, backgroundColor: colors.primary + '50', borderColor: colors.primary }]} />
        <View style={[s.thicknessBlock, { height: rightEdgeHeight, backgroundColor: colors.primary + '30', borderColor: colors.primary, borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
      </View>
      <Text style={[s.thicknessLabel, { color: colors.textSecondary }]}>
        {sphNum === 0 ? 'Plano Flat' : sphNum > 0 ? 'Convex (+)' : 'Concave (-)'}
      </Text>
    </View>
  );
}

// ── Interactive PD Ruler Slider ──
interface PdSliderProps {
  value: string;
  onChange: (val: string) => void;
}

function PdInteractiveRuler({ value, onChange }: PdSliderProps) {
  const colors = useThemeColors();
  const currentPd = parseFloat(value) || 62;
  const s = getStyles(colors);

  const handleTouch = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderWidth = Dimensions.get('window').width - 70;
    const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
    const finalPd = Math.round(50 + percentage * 30);
    triggerHaptic();
    onChange(finalPd.toString());
  };

  const percentage = (currentPd - 50) / 30;
  const knobLeft = `${percentage * 100}%` as any;

  return (
    <View style={s.pdContainer} className="bg-card border border-borderLight rounded-2xl p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase' }}>Pupillary Distance (PD)</Typography>
        <Typography variant="body" weight="bold" color={colors.primary} style={{ fontFamily: 'monospace' }}>
          {currentPd} mm
        </Typography>
      </View>

      <View
        style={s.rulerTrack}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        {Array.from({ length: 31 }).map((_, idx) => {
          const isMajor = idx % 5 === 0;
          return (
            <View
              key={idx}
              style={[
                s.rulerTick,
                {
                  height: isMajor ? 12 : 6,
                  backgroundColor: isMajor ? colors.textSecondary : colors.border,
                },
              ]}
            />
          );
        })}

        <View style={[s.rulerKnob, { left: knobLeft, backgroundColor: colors.primary }]}>
          <View style={s.rulerKnobPin} />
        </View>
      </View>
    </View>
  );
}

// ── Anatomical Interactive Eye Visualizer ──
interface EyeModelProps {
  eye: 'OD' | 'OS';
  sph: string;
  cyl: string;
  axis: string;
  isActive: boolean;
  onPress: () => void;
}

function InteractiveEyeModel({ eye, sph, cyl, axis, isActive, onPress }: EyeModelProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const isRight = eye === 'OD';

  const sphNum = parseFloat(sph) || 0;
  const cylNum = parseFloat(cyl) || 0;
  const axisNum = parseFloat(axis) || 0;

  const ringScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.3, duration: 1200, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();

      Animated.spring(cardScale, { toValue: 1.05, useNativeDriver: true, friction: 5 }).start();
    } else {
      ringScale.setValue(1);
      Animated.spring(cardScale, { toValue: 0.95, useNativeDriver: true }).start();
    }
  }, [isActive]);

  const basePupilSize = 20;
  const pupilDilation = basePupilSize + Math.max(-8, Math.min(8, -sphNum * 1.5));

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={1}
        style={[
          s.eyeModelCard,
          isActive && { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.1 },
        ]}
      >
        <Typography variant="caption" weight="bold" color={isRight ? '#6366f1' : '#a78bfa'} style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {isRight ? 'Right Eye (OD)' : 'Left Eye (OS)'}
        </Typography>

        <View style={s.eyeOrbWrapper}>
          {isActive && (
            <Animated.View
              style={[
                s.eyeFocalRing,
                {
                  borderColor: isRight ? '#6366f130' : '#a78bfa30',
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
          )}

          <View style={s.eyeSclera} className="bg-card">
            <View style={[s.eyeIris, { backgroundColor: isRight ? '#4f46e5' : '#8b5cf6' }]}>
              <View
                style={[
                  s.eyePupil,
                  {
                    width: pupilDilation,
                    height: pupilDilation,
                    borderRadius: pupilDilation / 2,
                    backgroundColor: colors.backgroundSolid,
                  },
                ]}
              />
            </View>

            {Math.abs(cylNum) >= 0.25 && (
              <View
                style={[
                  s.eyeAxisLine,
                  {
                    backgroundColor: '#eab308',
                    transform: [{ rotate: `${axisNum}deg` as any }],
                  },
                ]}
              />
            )}
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={s.eyeMetricText}>SPH: {sphNum >= 0 ? `+${sphNum.toFixed(2)}` : sphNum.toFixed(2)}</Text>
          <Text style={s.eyeMetricSubText}>CYL: {cylNum.toFixed(2)} · AXS: {axisNum}°</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── MAIN WIZARD ──
export function NewVisitWizardScreen({ route, navigation }: NewVisitWizardScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = getStyles(colors);
  const queryClient = useQueryClient();

  const { customerId, customerName } = route.params;

  // Step state
  const [activeStep, setActiveStep] = useState<number>(1);
  const [performExam, setPerformExam] = useState(false);
  const [recordOrder, setRecordOrder] = useState(false);

  // Step 1: Visit Details
  const [visitType, setVisitType] = useState('Full Exam');
  const [doctorName, setDoctorName] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  // Step 2: Refraction
  const [odSph, setOdSph] = useState('0.00');
  const [odCyl, setOdCyl] = useState('0.00');
  const [odAxis, setOdAxis] = useState('90');
  const [odAdd, setOdAdd] = useState('0.00');

  const [osSph, setOsSph] = useState('0.00');
  const [osCyl, setOsCyl] = useState('0.00');
  const [osAxis, setOsAxis] = useState('90');
  const [osAdd, setOsAdd] = useState('0.00');

  const [pd, setPd] = useState('62');
  const [rxNotes, setRxNotes] = useState('');
  const [activeEye, setActiveEye] = useState<'OD' | 'OS'>('OD');

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

  // Previous prescription logic
  const { data: previousRxList } = useQuery<any[]>({
    queryKey: ['customer-prescriptions', customerId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.customers.prescriptions(customerId));
      return response.data;
    },
    enabled: performExam,
  });

  const latestRx = previousRxList && previousRxList.length > 0 ? previousRxList[0] : null;

  const handleCopyPreviousRx = () => {
    if (!latestRx) return;
    setOdSph(latestRx.rightSphere?.toString() || '0.00');
    setOdCyl(latestRx.rightCylinder?.toString() || '0.00');
    setOdAxis(latestRx.rightAxis?.toString() || '90');
    setOdAdd(latestRx.rightAdd?.toString() || '0.00');
    setOsSph(latestRx.leftSphere?.toString() || '0.00');
    setOsCyl(latestRx.leftCylinder?.toString() || '0.00');
    setOsAxis(latestRx.leftAxis?.toString() || '90');
    setOsAdd(latestRx.leftAdd?.toString() || '0.00');
    setPd(latestRx.pupillaryDistance?.toString() || '62');
    setRxNotes(latestRx.notes || '');
    Toast.show({ type: 'info', text1: 'Rx Values Copied', text2: 'Loaded previous optical parameters.' });
  };

  const sub = parseFloat(subtotal) || 0;
  const disc = parseFloat(discount) || 0;
  const tx = parseFloat(tax) || 0;
  const total = Math.max(0, sub - disc + tx);
  const paid = parseFloat(paidAmount) || 0;
  const due = Math.max(0, total - paid);

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

  const copyODtoOS = () => {
    setOsSph(odSph);
    setOsCyl(odCyl);
    setOsAxis(odAxis);
    setOsAdd(odAdd);
    triggerHaptic();
    Toast.show({ type: 'info', text1: 'Mirrored OD to OS', text2: 'Copied Right eye values to Left eye.' });
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
        <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
          <Text style={s.customerSub}>Patient: <Text style={{ color: colors.text }}>{customerName}</Text></Text>

          {/* STEP 1: Visit purpose & details */}
          <Card style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
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
                  placeholderTextColor={colors.textDisabled}
                  value={doctorName}
                  onChangeText={setDoctorName}
                />

                <Text style={s.label}>Encounter Notes</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  multiline
                  placeholder="Reason for visit, general complaints, or customer notes..."
                  placeholderTextColor={colors.textDisabled}
                  value={visitNotes}
                  onChangeText={setVisitNotes}
                />
              </View>
            )}
          </Card>

          {/* STEP 2: Eye Refraction Test */}
          <Card style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
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

                {/* Spatial Eye Selector Grid */}
                <View style={{ flexDirection: 'row', gap: 12, marginVertical: 8 }}>
                  <InteractiveEyeModel
                    eye="OD"
                    sph={odSph}
                    cyl={odCyl}
                    axis={odAxis}
                    isActive={activeEye === 'OD'}
                    onPress={() => { triggerHaptic(); setActiveEye('OD'); }}
                  />
                  <InteractiveEyeModel
                    eye="OS"
                    sph={osSph}
                    cyl={osCyl}
                    axis={osAxis}
                    isActive={activeEye === 'OS'}
                    onPress={() => { triggerHaptic(); setActiveEye('OS'); }}
                  />
                </View>

                {/* Active Eye Input Workspace Dials */}
                <View className="mt-2">
                  <Typography variant="body" weight="bold" color={colors.primary} style={{ textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
                    Operating Active: {activeEye === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                  </Typography>

                  {activeEye === 'OD' ? (
                    <View style={{ gap: 12 }}>
                      <JogDialWheel label="Sphere (SPH)" value={odSph} onChange={setOdSph} />
                      <JogDialWheel label="Cylinder (CYL)" value={odCyl} onChange={setOdCyl} min={-6} max={6} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <View style={{ width: '48%' }}>
                          <AxisSelector value={odAxis} onChange={setOdAxis} />
                        </View>
                        <View style={{ width: '48%', gap: 12 }}>
                          <View>
                            <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 4 }}>ADD Power</Typography>
                            <View className="flex-row items-center justify-between bg-card border border-borderLight rounded-xl px-3 py-1.5">
                              <TouchableOpacity onPress={() => { triggerHaptic(); const next = Math.max(0, (parseFloat(odAdd) || 0) - 0.25); setOdAdd(`+${next.toFixed(2)}`); }}>
                                <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                              </TouchableOpacity>
                              <Text className="font-mono text-sm text-text font-bold">{(parseFloat(odAdd) || 0) > 0 ? `+${(parseFloat(odAdd) || 0).toFixed(2)}` : '0.00'}</Text>
                              <TouchableOpacity onPress={() => { triggerHaptic(); const next = Math.min(4, (parseFloat(odAdd) || 0) + 0.25); setOdAdd(`+${next.toFixed(2)}`); }}>
                                <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <LensThicknessVisualizer sph={odSph} />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      <JogDialWheel label="Sphere (SPH)" value={osSph} onChange={setOsSph} />
                      <JogDialWheel label="Cylinder (CYL)" value={osCyl} onChange={setOsCyl} min={-6} max={6} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <View style={{ width: '48%' }}>
                          <AxisSelector value={osAxis} onChange={setOsAxis} />
                        </View>
                        <View style={{ width: '48%', gap: 12 }}>
                          <View>
                            <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 4 }}>ADD Power</Typography>
                            <View className="flex-row items-center justify-between bg-card border border-borderLight rounded-xl px-3 py-1.5">
                              <TouchableOpacity onPress={() => { triggerHaptic(); const next = Math.max(0, (parseFloat(osAdd) || 0) - 0.25); setOsAdd(`+${next.toFixed(2)}`); }}>
                                <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                              </TouchableOpacity>
                              <Text className="font-mono text-sm text-text font-bold">{(parseFloat(osAdd) || 0) > 0 ? `+${(parseFloat(osAdd) || 0).toFixed(2)}` : '0.00'}</Text>
                              <TouchableOpacity onPress={() => { triggerHaptic(); const next = Math.min(4, (parseFloat(osAdd) || 0) + 0.25); setOsAdd(`+${next.toFixed(2)}`); }}>
                                <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <LensThicknessVisualizer sph={osSph} />
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <TouchableOpacity onPress={copyODtoOS} style={[s.actionBtnSecondary, { flex: 1 }]}>
                      <Ionicons name="copy-outline" size={13} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={{ color: colors.primary }} className="text-xs font-bold uppercase">Mirror to OS</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* PD Ruler Slider */}
                <View style={{ marginTop: 12 }}>
                  <PdInteractiveRuler value={pd} onChange={setPd} />
                </View>

                <Text style={[s.label, { marginTop: 12 }]}>Clinical Findings / Lab Remarks</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  multiline
                  placeholder="Additional observations, recommended lens structure, or Glaucoma notes..."
                  placeholderTextColor={colors.textDisabled}
                  value={rxNotes}
                  onChangeText={setRxNotes}
                />
              </View>
            )}
          </Card>

          {/* STEP 3: Frame / Lenses Order */}
          <Card style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
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
                  placeholderTextColor={colors.textDisabled}
                  value={frameBrand}
                  onChangeText={setFrameBrand}
                />
                <TextInput
                  style={s.input}
                  placeholder="Frame Model (e.g. RB5154)"
                  placeholderTextColor={colors.textDisabled}
                  value={frameModel}
                  onChangeText={setFrameModel}
                />
                <TextInput
                  style={s.input}
                  placeholder="Frame Size/Name"
                  placeholderTextColor={colors.textDisabled}
                  value={frameName}
                  onChangeText={setFrameName}
                />

                <Text style={s.label}>Lens Specifications</Text>
                <TextInput
                  style={s.input}
                  placeholder="Lens Type (e.g. Progressive, Single Vision)"
                  placeholderTextColor={colors.textDisabled}
                  value={lensType}
                  onChangeText={setLensType}
                />
                <TextInput
                  style={s.input}
                  placeholder="Lens Coating (e.g. Crizal Blue Cut, Anti-Glare)"
                  placeholderTextColor={colors.textDisabled}
                  value={lensCoating}
                  onChangeText={setLensCoating}
                />

                <Text style={s.label}>Pricing (₹) *</Text>
                <TextInput
                  style={s.input}
                  keyboardType="decimal-pad"
                  placeholder="Order Subtotal"
                  placeholderTextColor={colors.textDisabled}
                  value={subtotal}
                  onChangeText={setSubtotal}
                />
                <TextInput
                  style={s.input}
                  keyboardType="decimal-pad"
                  placeholder="Discounts"
                  placeholderTextColor={colors.textDisabled}
                  value={discount}
                  onChangeText={setDiscount}
                />
                <TextInput
                  style={s.input}
                  keyboardType="decimal-pad"
                  placeholder="Tax Amount"
                  placeholderTextColor={colors.textDisabled}
                  value={tax}
                  onChangeText={setTax}
                />

                <Text style={s.label}>Expected Delivery Date</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDisabled}
                  value={expectedDeliveryDate}
                  onChangeText={setExpectedDeliveryDate}
                />

                <Text style={s.label}>Order Fit Notes</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  multiline
                  placeholder="Specify bifocal height, progressive lens details, or delivery instructions..."
                  placeholderTextColor={colors.textDisabled}
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                />
              </View>
            )}
          </Card>

          {/* STEP 4: Billing Summary & Payment */}
          {recordOrder && (
            <Card style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
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
                    <Text style={s.billingTotalVal}>
                      <AnimatedCounter value={total} prefix="₹" />
                    </Text>
                  </View>

                  <Text style={[s.label, { marginTop: 14 }]}>Log Deposit Payment (₹)</Text>
                  <TextInput
                    style={s.input}
                    keyboardType="decimal-pad"
                    placeholder="Advance or Full Payment"
                    placeholderTextColor={colors.textDisabled}
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
            </Card>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, submitMutation.isPending && s.submitDisabled, { backgroundColor: colors.primary }]}
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
    backgroundColor: colors.cardHover,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderLight,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  container: { padding: 14, paddingBottom: 60 },
  customerSub: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 14 },
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
    backgroundColor: colors.cardHover,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.2, borderColor: colors.borderLight,
  },
  stepNumActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepNumText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  stepNumTextActive: { color: '#fff' },
  stepTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  stepBody: { padding: 14, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 12 },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  input: {
    backgroundColor: colors.backgroundSolid,
    borderWidth: 1.2, borderColor: colors.borderLight,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 13,
  },
  textarea: { height: 70, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', gap: 6 },
  typeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.backgroundSolid, borderWidth: 1.2, borderColor: colors.borderLight,
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
  // ── Billing ───────────────────────────────────────
  billingItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billingLabel: { color: colors.textSecondary, fontSize: 12 },
  billingVal: { color: colors.text, fontSize: 12, fontWeight: '600' },
  billingTotalRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  billingTotalLabel: { color: colors.text, fontSize: 13, fontWeight: '800' },
  billingTotalVal: { color: colors.text, fontSize: 15, fontWeight: '800' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, paddingVertical: 14, marginTop: 16,
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Dial Wheel
  dialContainer: {
    marginBottom: 8,
  },
  wheelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wheelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  wheelTrack: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  wheelTrackInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
  },
  wheelTickLine: {
    width: 1.5,
    borderRadius: 1,
  },
  wheelIndicatorPin: {
    position: 'absolute',
    alignSelf: 'center',
    width: 3,
    height: 30,
    borderRadius: 1.5,
    zIndex: 5,
  },
  // Axis Dial Selector
  axisContainer: {
    alignItems: 'center',
  },
  axisRimContainer: {
    width: 180,
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  axisRim: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisDegTextWrapper: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisDegText: {
    fontSize: 8,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  axisHub: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 4,
  },
  axisNeedle: {
    position: 'absolute',
    width: 2,
    height: 72,
    borderRadius: 1,
    transformOrigin: 'bottom center',
    bottom: '50%',
    zIndex: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  // Thickness Profile
  thicknessContainer: {
    marginTop: 2,
  },
  thicknessProfileWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    paddingHorizontal: 16,
  },
  thicknessBlock: {
    width: 22,
    borderWidth: 1,
  },
  thicknessBlockCenter: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  thicknessLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  // Eye Model
  eyeModelCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: 12,
    alignItems: 'center',
  },
  eyeOrbWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 6,
  },
  eyeFocalRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.2,
    borderStyle: 'dashed',
  },
  eyeSclera: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  eyeIris: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  eyePupil: {
    zIndex: 3,
  },
  eyeAxisLine: {
    position: 'absolute',
    width: 50,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.6,
    zIndex: 1,
  },
  eyeMetricText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'monospace',
  },
  eyeMetricSubText: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  // PD Ruler slider
  pdContainer: {
    width: '100%',
  },
  rulerTrack: {
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.cardHover,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 4,
    position: 'relative',
  },
  rulerTick: {
    width: 1,
    borderRadius: 0.5,
  },
  rulerKnob: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  rulerKnobPin: {
    width: 2,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
});
