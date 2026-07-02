import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated, StyleSheet, Dimensions, Vibration
} from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useThemeColors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { Typography } from '../../components/Typography';

const prescriptionSchema = z.object({
  doctorName: z.string().optional(),
  prescriptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional().or(z.literal('')),
  rightSphere: z.string().transform(v => v === '' ? null : parseFloat(v)).nullable().optional(),
  rightCylinder: z.string().transform(v => v === '' ? null : parseFloat(v)).nullable().optional(),
  rightAxis: z.string().transform(v => v === '' ? null : parseInt(v, 10)).nullable().optional(),
  rightAdd: z.string().transform(v => v === '' ? null : parseFloat(v)).nullable().optional(),
  leftSphere: z.string().transform(v => v === '' ? null : parseFloat(v)).nullable().optional(),
  leftCylinder: z.string().transform(v => v === '' ? null : parseFloat(v)).nullable().optional(),
  leftAxis: z.string().transform(v => v === '' ? null : parseInt(v, 10)).nullable().optional(),
  leftAdd: z.string().transform(v => v === '' ? null : parseFloat(v)).nullable().optional(),
  pupillaryDistance: z.string().transform(v => v === '' ? null : parseFloat(v)).nullable().optional(),
  notes: z.string().optional(),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

// Helper for haptics using react-native Vibration
const triggerHaptic = () => {
  try {
    Vibration.vibrate(10);
  } catch (e) {
    // ignore vibrator fail
  }
};

// ── Tactile Jog-Dial Wheel for SPH / CYL ──
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

  // Generate fake lines that shift relative to current value to simulate wheel rotation
  const ticksCount = 11;
  const wheelOffset = (current % 1) * 35; // displacement offset

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

        {/* Tactile Gauge Area */}
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
          {/* Active Center Indicator pin */}
          <View style={[s.wheelIndicatorPin, { backgroundColor: colors.primary }]} />
        </View>

        <TouchableOpacity onPress={handleIncrement} style={s.wheelBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Interactive Axis Semi-Circular Gauge Selector ──
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
    const cx = 90; // Center X
    const cy = 90; // Center Y
    const dx = locationX - cx;
    const dy = locationY - cy;

    // Calculate angle (0 to 180 degrees)
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
        {/* Semi-circular dial */}
        <View
          style={[s.axisRim, { borderColor: colors.borderLight }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handleTouch}
          onResponderMove={handleTouch}
        >
          {/* Degree Ticks */}
          {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const r = 70; // radius
            const tx = 90 + r * Math.cos(rad) - 8;
            const ty = 90 - r * Math.sin(rad) - 8;
            return (
              <View key={deg} style={[s.axisDegTextWrapper, { left: tx, top: ty }]}>
                <Text style={s.axisDegText}>{deg}</Text>
              </View>
            );
          })}

          {/* Core Hub */}
          <View style={[s.axisHub, { backgroundColor: colors.border }]} />

          {/* Dynamic Needle */}
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

  // Compute thickness for convex (+) or concave (-) lens profiles
  const baseThickness = 12;
  const delta = Math.abs(sphNum) * 2.8;

  const leftEdgeHeight = sphNum < 0 ? baseThickness + delta : baseThickness;
  const centerHeight = sphNum > 0 ? baseThickness + delta : baseThickness;
  const rightEdgeHeight = sphNum < 0 ? baseThickness + delta : baseThickness;

  return (
    <View style={s.thicknessContainer}>
      <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 6 }}>Lens Profile Section</Typography>
      <View style={s.thicknessProfileWrapper} className="bg-card">
        {/* Left Edge Block */}
        <View style={[s.thicknessBlock, { height: leftEdgeHeight, backgroundColor: colors.primary + '30', borderColor: colors.primary, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
        {/* Center Block */}
        <View style={[s.thicknessBlockCenter, { height: centerHeight, backgroundColor: colors.primary + '50', borderColor: colors.primary }]} />
        {/* Right Edge Block */}
        <View style={[s.thicknessBlock, { height: rightEdgeHeight, backgroundColor: colors.primary + '30', borderColor: colors.primary, borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
      </View>
      <Text style={[s.thicknessLabel, { color: colors.textSecondary }]}>
        {sphNum === 0 ? 'Plano Flat' : sphNum > 0 ? 'Convex (Plus Power)' : 'Concave (Minus Power)'}
      </Text>
    </View>
  );
}

// ── Snellen Acuity Test Chart Visualizer ──
interface AcuityTestProps {
  sph: string;
  selectedAcuity: string;
  onSelectAcuity: (ac: string) => void;
}

function SnellenAcuityTest({ sph, selectedAcuity, onSelectAcuity }: AcuityTestProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);
  const sphNum = parseFloat(sph) || 0;

  // Text shadow blur calculations simulating visual impairment
  const shadowBlur = Math.min(22, Math.abs(sphNum) * 2.4);
  const EStyle = {
    color: Math.abs(sphNum) > 0.5 ? 'transparent' : colors.text,
    textShadowColor: colors.text,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: shadowBlur,
  };

  const acuities = ['6/60', '6/36', '6/24', '6/18', '6/12', '6/9', '6/6'];

  return (
    <View style={s.acuityContainer} className="bg-card border border-borderLight rounded-2xl p-4">
      <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 8 }}>Snellen Visual Acuity</Typography>

      <View style={s.acuityFlex}>
        {/* Snellen letter indicator */}
        <View style={s.snellenBox} className="bg-backgroundSolid border border-borderLight">
          <Text style={[s.snellenE, EStyle]}>E</Text>
        </View>

        {/* Vertical selector scale */}
        <View style={s.acuityScale}>
          {acuities.map((ac) => {
            const isActive = selectedAcuity === ac;
            return (
              <TouchableOpacity
                key={ac}
                onPress={() => {
                  triggerHaptic();
                  onSelectAcuity(ac);
                }}
                style={[s.acuityChip, isActive && { backgroundColor: colors.primary }]}
              >
                <Text style={[s.acuityChipText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                  {ac}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Interactive 2D Eye Visualizer Model ──
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

  // Pulse rings
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

      Animated.spring(cardScale, { toValue: 1.06, useNativeDriver: true, friction: 5 }).start();
    } else {
      ringScale.setValue(1);
      Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true }).start();
    }
  }, [isActive]);

  // Adjust pupil diameter depending on power magnitude (dilation vs constriction)
  const basePupilSize = 20;
  const pupilDilation = basePupilSize + Math.max(-8, Math.min(8, -sphNum * 1.5));

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: cardScale }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={1}
        style={[
          s.eyeModelCard,
          isActive && { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.15 },
        ]}
      >
        <Typography variant="caption" weight="bold" color={isRight ? '#6366f1' : '#a78bfa'} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          {isRight ? 'Right Eye (OD)' : 'Left Eye (OS)'}
        </Typography>

        <View style={s.eyeOrbWrapper}>
          {/* Pulsing focal ring */}
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

          {/* Outer Sclera */}
          <View style={s.eyeSclera} className="bg-card">
            {/* Iris */}
            <View style={[s.eyeIris, { backgroundColor: isRight ? '#4f46e5' : '#8b5cf6' }]}>
              {/* Pupil */}
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

            {/* Astigmatic Axis visual overlay line */}
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

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={s.eyeMetricText}>SPH: {sphNum >= 0 ? `+${sphNum.toFixed(2)}` : sphNum.toFixed(2)}</Text>
          <Text style={s.eyeMetricSubText}>CYL: {cylNum.toFixed(2)} · AXS: {axisNum}°</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
    // Map screen coordinate width to range [50, 80]
    const sliderWidth = Dimensions.get('window').width - 70;
    const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
    const finalPd = Math.round(50 + percentage * 30);
    triggerHaptic();
    onChange(finalPd.toString());
  };

  // Calculate pointer translation
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
        {/* Tick lines on ruler */}
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

        {/* Pointer knob */}
        <View style={[s.rulerKnob, { left: knobLeft, backgroundColor: colors.primary }]}>
          <View style={s.rulerKnobPin} />
        </View>
      </View>
    </View>
  );
}

// ── Guided Progress Flow Steps Indicator ──
interface StepProgressProps {
  currentStep: number;
  onSetStep: (step: number) => void;
}

function StepProgressBar({ currentStep, onSetStep }: StepProgressProps) {
  const colors = useThemeColors();
  const s = getStyles(colors);

  const steps = [
    { idx: 0, label: 'Setup', icon: 'settings-outline' },
    { idx: 1, label: 'Right (OD)', icon: 'eye-outline' },
    { idx: 2, label: 'Left (OS)', icon: 'eye-outline' },
    { idx: 3, label: 'Lenses', icon: 'glasses-outline' },
    { idx: 4, label: 'Review', icon: 'shield-checkmark-outline' },
  ];

  return (
    <View style={s.progressBarContainer} className="bg-card">
      {steps.map((st, i) => {
        const isDone = currentStep > st.idx;
        const isActive = currentStep === st.idx;
        const iconColor = isActive ? colors.primary : isDone ? colors.success : colors.textDisabled;
        const borderColor = isActive ? colors.primary : isDone ? colors.success : colors.borderLight;

        return (
          <React.Fragment key={st.idx}>
            <TouchableOpacity
              onPress={() => onSetStep(st.idx)}
              style={[s.progressNode, { borderColor }]}
              activeOpacity={0.8}
            >
              <Ionicons name={st.icon as any} size={13} color={iconColor} />
              <Text style={[s.progressNodeLabel, { color: isActive ? colors.text : colors.textMuted }]}>
                {st.label}
              </Text>
            </TouchableOpacity>
            {i < steps.length - 1 && (
              <View style={[s.progressLine, { backgroundColor: isDone ? colors.success : colors.borderLight }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

interface AddEditPrescriptionScreenProps {
  route: any;
  navigation: any;
}

// ── MAIN MODULE SCREEN ──
export function AddEditPrescriptionScreen({ route, navigation }: AddEditPrescriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = getStyles(colors);
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { customerId, prescription } = route.params || {};
  const isEdit = !!prescription;

  // Form setup
  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<any>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      doctorName: prescription?.doctorName || '',
      prescriptionDate: prescription?.prescriptionDate ? prescription.prescriptionDate.split('T')[0] : new Date().toISOString().split('T')[0],
      rightSphere: prescription?.rightSphere?.toString() || '0.00',
      rightCylinder: prescription?.rightCylinder?.toString() || '0.00',
      rightAxis: prescription?.rightAxis?.toString() || '90',
      rightAdd: prescription?.rightAdd?.toString() || '0.00',
      leftSphere: prescription?.leftSphere?.toString() || '0.00',
      leftCylinder: prescription?.leftCylinder?.toString() || '0.00',
      leftAxis: prescription?.leftAxis?.toString() || '90',
      leftAdd: prescription?.leftAdd?.toString() || '0.00',
      pupillaryDistance: prescription?.pupillaryDistance?.toString() || '62',
      notes: prescription?.notes || '',
    },
  });

  // Steps tracking
  const [activeStep, setActiveStep] = useState(0);

  // Local state for Visual Acuity
  const [odAcuity, setOdAcuity] = useState('6/6');
  const [osAcuity, setOsAcuity] = useState('6/6');

  // Local state for expanded lens recommendations
  const [expandedLens, setExpandedLens] = useState<string | null>(null);

  // Undo memory bank
  const [undoStack, setUndoStack] = useState<any[]>([]);

  // Watch parameters for realtime updates
  const rightSph = useWatch({ control, name: 'rightSphere' });
  const rightCyl = useWatch({ control, name: 'rightCylinder' });
  const rightAxis = useWatch({ control, name: 'rightAxis' });
  const rightAdd = useWatch({ control, name: 'rightAdd' });

  const leftSph = useWatch({ control, name: 'leftSphere' });
  const leftCyl = useWatch({ control, name: 'leftCylinder' });
  const leftAxis = useWatch({ control, name: 'leftAxis' });
  const leftAdd = useWatch({ control, name: 'leftAdd' });

  // Save stack changes for Undo capability
  const pushToUndo = () => {
    const state = getValues();
    setUndoStack((prev) => [...prev, state]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((old) => old.slice(0, -1));

    Object.keys(prev).forEach((key) => {
      setValue(key, prev[key]);
    });
    Toast.show({ type: 'info', text1: 'Action Undone', text2: 'Reverted to previous state.' });
  };

  const copyODtoOS = () => {
    pushToUndo();
    const currentValues = getValues();
    setValue('leftSphere', currentValues.rightSphere);
    setValue('leftCylinder', currentValues.rightCylinder);
    setValue('leftAxis', currentValues.rightAxis);
    setValue('leftAdd', currentValues.rightAdd);
    setOsAcuity(odAcuity);
    triggerHaptic();

    Toast.show({
      type: 'info',
      text1: 'Copied OD Values',
      text2: 'Right eye refraction metrics mirrored to Left eye.',
    });
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        return axiosClient.patch(ENDPOINTS.prescriptions.update(prescription.id), data);
      } else {
        return axiosClient.post(ENDPOINTS.prescriptions.create(customerId), data);
      }
    },
    onSuccess: () => {
      const activeCustomerId = customerId || prescription?.customerId;
      queryClient.invalidateQueries({ queryKey: ['customer', activeCustomerId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['prescription', prescription.id] });
      }
      triggerHaptic();
      Toast.show({
        type: 'success',
        text1: isEdit ? 'Prescription Updated' : 'Prescription Recorded',
        text2: 'Diagnostic record logged successfully.',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Request failed';
      Toast.show({
        type: 'error',
        text1: 'Console Error',
        text2: errMsg,
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: PrescriptionFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  // High power warning evaluations
  const showPowerWarning = useMemo(() => {
    const oDSph = Math.abs(parseFloat(rightSph) || 0);
    const oSSph = Math.abs(parseFloat(leftSph) || 0);
    const oDCyl = Math.abs(parseFloat(rightCyl) || 0);
    const oSCyl = Math.abs(parseFloat(leftCyl) || 0);
    return oDSph > 6 || oSSph > 6 || oDCyl > 3 || oSCyl > 3;
  }, [rightSph, leftSph, rightCyl, leftCyl]);

  // Recommended lenses dynamic generation
  const lensRecommendations = useMemo(() => {
    const oDSph = parseFloat(rightSph) || 0;
    const oSSph = parseFloat(leftSph) || 0;
    const maxSph = Math.max(Math.abs(oDSph), Math.abs(oSSph));
    const maxAdd = Math.max(parseFloat(rightAdd) || 0, parseFloat(leftAdd) || 0);

    const recs = [
      {
        key: 'sv',
        title: 'Single Vision Standard',
        type: 'Standard Correction',
        desc: 'Optimized for single-focus vision correction. Highly recommended for standard myopia and hyperopia errors.',
        icon: 'ellipse-outline',
      },
      {
        key: 'blue',
        title: 'Blue Cut Defender',
        type: 'Digital Screen Filter',
        desc: 'Equipped with a blue-light absorbing coating. Filters out high-energy digital glare from computer monitors and mobile devices.',
        icon: 'desktop-outline',
      },
    ];

    if (maxAdd > 0) {
      recs.push({
        key: 'prog',
        title: 'Premium Progressive Flex',
        type: 'Multi-Focal Correction',
        desc: 'Advanced line-free multifocal design. Seamless power transition from distance focus down to near reading zones.',
        icon: 'infinite-outline',
      });
    }

    if (maxSph >= 4) {
      recs.push({
        key: 'hi-index',
        title: 'Hi-Index 1.67 Ultra-Thin',
        type: 'High Index Thin Lens',
        desc: 'Engineered with premium density plastic. Drastically reduces lens edges thickness and overall frame weight for high prescriptions.',
        icon: 'glasses-outline',
      });
    }

    recs.push(
      {
        key: 'photo',
        title: 'Photochromic Transitions',
        type: 'Adaptive Tint Tech',
        desc: 'Responds dynamically to UV rays. Remains completely clear indoors and darkens into a sun protective lens under daylight.',
        icon: 'sunny-outline',
      },
      {
        key: 'polar',
        title: 'Polarized Anti-Glare',
        type: 'Active Outdoor Polarizer',
        desc: 'Eliminates blinding reflective light from horizontal surfaces (water, wet roads, sand). Delivers absolute glare-free clarity.',
        icon: 'water-outline',
      }
    );

    return recs;
  }, [rightSph, leftSph, rightAdd, leftAdd]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.backgroundSolid }}
    >
      {/* Top Header */}
      <View
        className="bg-card border-b border-border px-5 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 16 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Typography variant="bodySecondary" weight="semibold">Cancel</Typography>
        </TouchableOpacity>

        <View className="flex-row items-center">
          <Ionicons name="medical-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Typography variant="body" weight="bold">Diagnostic Workspace</Typography>
        </View>

        <TouchableOpacity onPress={() => handleUndo()} disabled={undoStack.length === 0} style={{ opacity: undoStack.length > 0 ? 1 : 0.4 }}>
          <Ionicons name="arrow-undo-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Progress Flow Checklist indicator */}
      <StepProgressBar currentStep={activeStep} onSetStep={setActiveStep} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
        {/* Step 0: Setup */}
        {activeStep === 0 && (
          <View>
            <Typography variant="h3" weight="bold" style={{ marginBottom: 12 }}>Diagnostic Setup</Typography>
            <Card style={{ padding: 18 }}>
              <View className="flex-row items-center mb-4">
                <Ionicons name="document-text-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
                <Typography variant="body" weight="bold">Record Information</Typography>
              </View>

              <Controller
                control={control}
                name="doctorName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-4">
                    <Typography variant="caption" weight="bold" style={{ marginBottom: 6, textTransform: 'uppercase' }}>Attending Doctor</Typography>
                    <TextInput
                      style={s.formInput}
                      placeholder="Dr. Mehta"
                      placeholderTextColor={colors.textDisabled}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  </View>
                )}
              />

              <Controller
                control={control}
                name="prescriptionDate"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-2">
                    <Typography variant="caption" weight="bold" style={{ marginBottom: 6, textTransform: 'uppercase' }}>Exam Date (YYYY-MM-DD)</Typography>
                    <TextInput
                      style={s.formInput}
                      placeholder="2026-06-28"
                      placeholderTextColor={colors.textDisabled}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.prescriptionDate?.message && (
                <Text style={{ color: colors.danger }} className="text-xs mt-1">{errors.prescriptionDate.message as string}</Text>
              )}
            </Card>

            <TouchableOpacity style={s.actionBtnMain} onPress={() => { triggerHaptic(); setActiveStep(1); }}>
              <Text className="text-white text-xs font-bold uppercase tracking-wider">Start Refraction Exam</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Right Eye (OD) Refraction */}
        {activeStep === 1 && (
          <View>
            <Typography variant="h3" weight="bold" style={{ marginBottom: 12 }}>Right Eye Refraction (OD)</Typography>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <InteractiveEyeModel
                eye="OD"
                sph={rightSph}
                cyl={rightCyl}
                axis={rightAxis}
                isActive={true}
                onPress={() => {}}
              />
              <InteractiveEyeModel
                eye="OS"
                sph={leftSph}
                cyl={leftCyl}
                axis={leftAxis}
                isActive={false}
                onPress={() => { triggerHaptic(); setActiveStep(2); }}
              />
            </View>

            <Card style={{ padding: 16 }}>
              {/* Dial Wheel SPH */}
              <Controller
                control={control}
                name="rightSphere"
                render={({ field: { onChange, value } }) => (
                  <JogDialWheel label="Sphere (SPH)" value={value} onChange={(v) => { pushToUndo(); onChange(v); }} />
                )}
              />

              {/* Dial Wheel CYL */}
              <Controller
                control={control}
                name="rightCylinder"
                render={({ field: { onChange, value } }) => (
                  <JogDialWheel label="Cylinder (CYL)" value={value} onChange={(v) => { pushToUndo(); onChange(v); }} min={-6} max={6} />
                )}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                {/* Circular Axis dial */}
                <View style={{ width: '48%' }}>
                  <Controller
                    control={control}
                    name="rightAxis"
                    render={({ field: { onChange, value } }) => (
                      <AxisSelector value={value} onChange={onChange} />
                    )}
                  />
                </View>

                {/* Vertical slider ADD & visual lens profile */}
                <View style={{ width: '48%', gap: 14 }}>
                  <View>
                    <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 6 }}>ADD Power</Typography>
                    <Controller
                      control={control}
                      name="rightAdd"
                      render={({ field: { onChange, value } }) => (
                        <View className="flex-row items-center justify-between bg-background border border-borderLight rounded-xl px-3 py-2">
                          <TouchableOpacity onPress={() => { pushToUndo(); const next = Math.max(0, (parseFloat(value) || 0) - 0.25); onChange(`+${next.toFixed(2)}`); }}>
                            <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <Text className="font-mono text-sm text-text font-bold">{(parseFloat(value) || 0) > 0 ? `+${(parseFloat(value) || 0).toFixed(2)}` : '0.00'}</Text>
                          <TouchableOpacity onPress={() => { pushToUndo(); const next = Math.min(4, (parseFloat(value) || 0) + 0.25); onChange(`+${next.toFixed(2)}`); }}>
                            <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>

                  <LensThicknessVisualizer sph={rightSph} />
                </View>
              </View>

              <View className="mt-4 pt-4 border-t border-borderLight">
                <SnellenAcuityTest sph={rightSph} selectedAcuity={odAcuity} onSelectAcuity={setOdAcuity} />
              </View>
            </Card>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={copyODtoOS}
                style={[s.actionBtnSecondary, { flex: 1 }]}
              >
                <Ionicons name="copy-outline" size={13} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.primary }} className="text-xs font-bold uppercase tracking-wider">Mirror to OS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtnMain, { flex: 1, marginTop: 0 }]}
                onPress={() => { triggerHaptic(); setActiveStep(2); }}
              >
                <Text className="text-white text-xs font-bold uppercase tracking-wider">Next: Left Eye OS</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Left Eye (OS) Refraction */}
        {activeStep === 2 && (
          <View>
            <Typography variant="h3" weight="bold" style={{ marginBottom: 12 }}>Left Eye Refraction (OS)</Typography>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <InteractiveEyeModel
                eye="OD"
                sph={rightSph}
                cyl={rightCyl}
                axis={rightAxis}
                isActive={false}
                onPress={() => { triggerHaptic(); setActiveStep(1); }}
              />
              <InteractiveEyeModel
                eye="OS"
                sph={leftSph}
                cyl={leftCyl}
                axis={leftAxis}
                isActive={true}
                onPress={() => {}}
              />
            </View>

            <Card style={{ padding: 16 }}>
              {/* Dial Wheel SPH */}
              <Controller
                control={control}
                name="leftSphere"
                render={({ field: { onChange, value } }) => (
                  <JogDialWheel label="Sphere (SPH)" value={value} onChange={(v) => { pushToUndo(); onChange(v); }} />
                )}
              />

              {/* Dial Wheel CYL */}
              <Controller
                control={control}
                name="leftCylinder"
                render={({ field: { onChange, value } }) => (
                  <JogDialWheel label="Cylinder (CYL)" value={value} onChange={(v) => { pushToUndo(); onChange(v); }} min={-6} max={6} />
                )}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }} className="justify-between">
                {/* Circular Axis dial */}
                <View style={{ width: '48%' }}>
                  <Controller
                    control={control}
                    name="leftAxis"
                    render={({ field: { onChange, value } }) => (
                      <AxisSelector value={value} onChange={onChange} />
                    )}
                  />
                </View>

                {/* Vertical slider ADD & visual lens thickness */}
                <View style={{ width: '48%', gap: 14 }}>
                  <View>
                    <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 6 }}>ADD Power</Typography>
                    <Controller
                      control={control}
                      name="leftAdd"
                      render={({ field: { onChange, value } }) => (
                        <View className="flex-row items-center justify-between bg-background border border-borderLight rounded-xl px-3 py-2">
                          <TouchableOpacity onPress={() => { pushToUndo(); const next = Math.max(0, (parseFloat(value) || 0) - 0.25); onChange(`+${next.toFixed(2)}`); }}>
                            <Ionicons name="remove-circle-outline" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <Text className="font-mono text-sm text-text font-bold">{(parseFloat(value) || 0) > 0 ? `+${(parseFloat(value) || 0).toFixed(2)}` : '0.00'}</Text>
                          <TouchableOpacity onPress={() => { pushToUndo(); const next = Math.min(4, (parseFloat(value) || 0) + 0.25); onChange(`+${next.toFixed(2)}`); }}>
                            <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>

                  <LensThicknessVisualizer sph={leftSph} />
                </View>
              </View>

              <View className="mt-4 pt-4 border-t border-borderLight">
                <SnellenAcuityTest sph={leftSph} selectedAcuity={osAcuity} onSelectAcuity={setOsAcuity} />
              </View>
            </Card>

            <TouchableOpacity style={s.actionBtnMain} onPress={() => { triggerHaptic(); setActiveStep(3); }}>
              <Text className="text-white text-xs font-bold uppercase tracking-wider">Analyze Recommended Lenses</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Lens Recommendation */}
        {activeStep === 3 && (
          <View>
            <Typography variant="h3" weight="bold" style={{ marginBottom: 4 }}>Recommended Lenses</Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ marginBottom: 12 }}>Derived based on refraction prescription indices.</Typography>

            <View style={{ gap: 10 }}>
              {lensRecommendations.map((ln: any) => {
                const isExpanded = expandedLens === ln.key;
                return (
                  <TouchableOpacity
                    key={ln.key}
                    activeOpacity={0.9}
                    onPress={() => {
                      triggerHaptic();
                      setExpandedLens(isExpanded ? null : ln.key);
                    }}
                  >
                    <Card style={{ padding: 14, marginBottom: 0, borderColor: isExpanded ? colors.primary : colors.borderLight }}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center" style={{ gap: 10 }}>
                          <View style={{ backgroundColor: colors.primaryGlow }} className="w-9 h-9 rounded-full items-center justify-center">
                            <Ionicons name={ln.icon as any} size={16} color={colors.primary} />
                          </View>
                          <View>
                            <Typography variant="body" weight="bold">{ln.title}</Typography>
                            <Typography variant="muted" style={{ textTransform: 'uppercase', fontSize: 9 }}>{ln.type}</Typography>
                          </View>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                      </View>

                      {isExpanded && (
                        <View style={{ marginTop: 10 }} className="pt-3 border-t border-borderLight">
                          <Text style={{ color: colors.textSecondary }} className="text-xs leading-5">
                            {ln.desc}
                          </Text>
                          <TouchableOpacity
                            style={[s.actionBtnSecondary, { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 6, paddingHorizontal: 10 }]}
                            onPress={() => {
                              setValue('notes', `Recommended: ${ln.title}. ${getValues('notes') || ''}`);
                              Toast.show({ type: 'success', text1: 'Lens Selected', text2: 'Added recommendation note.' });
                            }}
                          >
                            <Text style={{ color: colors.primary }} className="text-[10px] font-bold uppercase">Pre-select Lens</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={s.actionBtnMain} onPress={() => { triggerHaptic(); setActiveStep(4); }}>
              <Text className="text-white text-xs font-bold uppercase tracking-wider">Finalize & Review</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 4: Finalize & Review */}
        {activeStep === 4 && (
          <View>
            <Typography variant="h3" weight="bold" style={{ marginBottom: 12 }}>Prescription Summary</Typography>

            {/* Abnormal warning display */}
            {showPowerWarning && (
              <View style={[s.warningCard, { backgroundColor: colors.dangerGlow, borderColor: colors.danger }]}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text className="text-xs font-bold" style={{ color: colors.danger }}>High Prescription Index Warning</Text>
                  <Text className="text-[10px] mt-0.5" style={{ color: colors.danger }}>An absolute refractive power greater than ±6.00D SPH or ±3.00D CYL has been captured. Ensure premium high-index lens options are selected.</Text>
                </View>
              </View>
            )}

            {/* Side by side diagnostics comparison sheet */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={{ backgroundColor: colors.cardHover }} className="px-4 py-3 flex-row justify-between items-center border-b border-borderLight">
                <Text className="text-text font-black text-sm" style={{ color: colors.text }}>Diagnostic Refraction Record</Text>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              </View>

              <View className="p-4" style={{ gap: 12 }}>
                {/* Headers */}
                <View className="flex-row">
                  <View className="w-[20%]" />
                  <View className="w-[40%]"><Typography variant="muted" weight="bold" align="center" style={{ textTransform: 'uppercase' }}>Right Eye (OD)</Typography></View>
                  <View className="w-[40%]"><Typography variant="muted" weight="bold" align="center" style={{ textTransform: 'uppercase' }}>Left Eye (OS)</Typography></View>
                </View>

                {/* SPH Row */}
                <View className="flex-row items-center py-1">
                  <View className="w-[20%]"><Text className="text-xs text-textSecondary font-bold">SPH</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{rightSph ? (parseFloat(rightSph) >= 0 ? `+${parseFloat(rightSph).toFixed(2)}` : parseFloat(rightSph).toFixed(2)) : '0.00'}</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{leftSph ? (parseFloat(leftSph) >= 0 ? `+${parseFloat(leftSph).toFixed(2)}` : parseFloat(leftSph).toFixed(2)) : '0.00'}</Text></View>
                </View>

                {/* CYL Row */}
                <View className="flex-row items-center py-1 border-t" style={{ borderTopColor: colors.borderLight }}>
                  <View className="w-[20%]"><Text className="text-xs text-textSecondary font-bold">CYL</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{rightCyl ? parseFloat(rightCyl).toFixed(2) : '0.00'}</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{leftCyl ? parseFloat(leftCyl).toFixed(2) : '0.00'}</Text></View>
                </View>

                {/* AXIS Row */}
                <View className="flex-row items-center py-1 border-t" style={{ borderTopColor: colors.borderLight }}>
                  <View className="w-[20%]"><Text className="text-xs text-textSecondary font-bold">AXIS</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{rightAxis || '90'}°</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{leftAxis || '90'}°</Text></View>
                </View>

                {/* ADD Row */}
                <View className="flex-row items-center py-1 border-t" style={{ borderTopColor: colors.borderLight }}>
                  <View className="w-[20%]"><Text className="text-xs text-textSecondary font-bold">ADD</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{rightAdd ? (parseFloat(rightAdd) >= 0 ? `+${parseFloat(rightAdd).toFixed(2)}` : parseFloat(rightAdd).toFixed(2)) : '0.00'}</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-mono font-bold" style={{ color: colors.text }}>{leftAdd ? (parseFloat(leftAdd) >= 0 ? `+${parseFloat(leftAdd).toFixed(2)}` : parseFloat(leftAdd).toFixed(2)) : '0.00'}</Text></View>
                </View>

                {/* VA Acuity Row */}
                <View className="flex-row items-center py-1 border-t" style={{ borderTopColor: colors.borderLight }}>
                  <View className="w-[20%]"><Text className="text-xs text-textSecondary font-bold">VA</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-bold" style={{ color: colors.text }}>{odAcuity}</Text></View>
                  <View className="w-[40%]"><Text className="text-center text-xs font-bold" style={{ color: colors.text }}>{osAcuity}</Text></View>
                </View>
              </View>
            </Card>

            {/* Interactive PD ruler slider */}
            <View style={{ marginTop: 14 }}>
              <Controller
                control={control}
                name="pupillaryDistance"
                render={({ field: { onChange, value } }) => (
                  <PdInteractiveRuler value={value} onChange={onChange} />
                )}
              />
            </View>

            {/* Diagnostics Notes */}
            <Card style={{ padding: 16, marginTop: 14 }}>
              <Typography variant="muted" weight="bold" style={{ textTransform: 'uppercase', marginBottom: 8 }}>Diagnostic & Clinical Notes</Typography>
              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[s.formInput, { height: 75, textAlignVertical: 'top' }]}
                    placeholder="Enter specs frame specifications, vertex distance adjustments, or clinical observations..."
                    placeholderTextColor={colors.textDisabled}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    multiline
                    numberOfLines={3}
                  />
                )}
              />
            </Card>

            {/* Save trigger */}
            <TouchableOpacity
              style={[s.actionBtnMain, { marginTop: 16, paddingVertical: 14 }]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" className="mr-2" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              )}
              <Text className="text-white text-sm font-bold uppercase tracking-wider">Commit Prescription</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Dynamic Clinical Cockpit HUD summary panel */}
      {activeStep > 0 && activeStep < 4 && (
        <View style={[s.floatingHud, { backgroundColor: colors.card + 'f2' }]} className="border border-borderLight shadow-2xl">
          <View style={s.hudRow}>
            <View>
              <Text style={s.hudTitle}>Console HUD</Text>
              <View className="flex-row" style={{ gap: 14, marginTop: 2 }}>
                <Text style={s.hudVal}>OD: {rightSph ? (parseFloat(rightSph) >= 0 ? `+${parseFloat(rightSph).toFixed(2)}` : parseFloat(rightSph).toFixed(2)) : '0.00'} / {rightCyl || '0.00'} x {rightAxis || '90'}</Text>
                <Text style={s.hudVal}>OS: {leftSph ? (parseFloat(leftSph) >= 0 ? `+${parseFloat(leftSph).toFixed(2)}` : parseFloat(leftSph).toFixed(2)) : '0.00'} / {leftCyl || '0.00'} x {leftAxis || '90'}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.hudSaveBtn} onPress={() => { triggerHaptic(); setActiveStep(4); }}>
              <Typography variant="caption" weight="bold" color="#fff">Review</Typography>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  dialContainer: {
    marginBottom: 16,
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
    // Pivot at base (hub)
    transformOrigin: 'bottom center',
    bottom: '50%',
    zIndex: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  // Thickness Profile
  thicknessContainer: {
    marginTop: 4,
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
  // Snellen Visual Acuity
  acuityContainer: {
    width: '100%',
  },
  acuityFlex: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  snellenBox: {
    width: 76,
    height: 76,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snellenE: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  acuityScale: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  acuityChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acuityChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  // Eye Graphic model
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
  // StepProgressBar
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  progressNode: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 50,
  },
  progressNodeLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
  },
  progressLine: {
    flex: 1,
    height: 1.5,
    marginHorizontal: 4,
    opacity: 0.8,
  },
  // Setup form inputs
  formInput: {
    backgroundColor: colors.backgroundSolid,
    color: colors.text,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  // CTA buttons
  actionBtnMain: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
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
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  // Floating consoleHUD
  floatingHud: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 99,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hudVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'monospace',
  },
  hudSaveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
