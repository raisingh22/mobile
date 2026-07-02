import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

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

interface NumberStepperProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  step?: number;
}

function NumberStepper({ value, onChange, placeholder = '0.00', step = 0.25 }: NumberStepperProps) {
  const current = parseFloat(value) || 0;

  const handleIncrement = () => {
    const next = current + step;
    onChange(next > 0 ? `+${next.toFixed(2)}` : next.toFixed(2));
  };

  const handleDecrement = () => {
    const next = current - step;
    onChange(next > 0 ? `+${next.toFixed(2)}` : next.toFixed(2));
  };

  return (
    <View className="flex-row items-center bg-background border border-border rounded-lg overflow-hidden">
      <TouchableOpacity onPress={handleDecrement} className="bg-border px-3.5 py-2.5">
        <Text className="text-text font-bold text-sm">-</Text>
      </TouchableOpacity>
      <TextInput
        className="flex-1 text-text text-center text-sm py-2"
        placeholder={placeholder}
        placeholderTextColor="#71717a"
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
      <TouchableOpacity onPress={handleIncrement} className="bg-border px-3.5 py-2.5">
        <Text className="text-text font-bold text-sm">+</Text>
      </TouchableOpacity>
    </View>
  );
}

interface VisualLensProps {
  eye: 'OD' | 'OS';
  sph: string;
  cyl: string;
  axis: string;
  setValue: any;
  axisFieldName: string;
}

function VisualLensPreview({ eye, sph, cyl, axis, setValue, axisFieldName }: VisualLensProps) {
  const rotation = parseFloat(axis) || 0;
  const sphNum = parseFloat(sph) || 0;
  const cylNum = parseFloat(cyl) || 0;
  const isRight = eye === 'OD';

  // Determine diagnosis type
  let typeLabel = 'Emmetropia';
  let diagnosisColor = '#a1a1aa';
  let diagnosisBg = 'bg-border';
  if (sphNum < -0.25) {
    typeLabel = 'Myopia';
    diagnosisColor = '#ef4444';
    diagnosisBg = 'bg-[#ef4444]/15';
  } else if (sphNum > 0.25) {
    typeLabel = 'Hyperopia';
    diagnosisColor = '#10b981';
    diagnosisBg = 'bg-[#10b981]/15';
  }

  const hasAstigmatism = Math.abs(cylNum) >= 0.25;
  const lensRingSize = Math.max(30, 90 - Math.min(Math.abs(sphNum) * 9, 45));
  const lensRingColor = sphNum < 0 ? '#ef4444' : sphNum > 0 ? '#10b981' : '#374151';

  const handleTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const cx = 56;
    const cy = 56;
    const dx = locationX - cx;
    const dy = locationY - cy;

    const angleRad = Math.atan2(-dy, dx);
    let angleDeg = angleRad * (180 / Math.PI);

    if (angleDeg < 0) {
      angleDeg += 360;
    }

    const calculatedAxis = Math.round(angleDeg % 180);
    setValue(axisFieldName, calculatedAxis.toString());
  };

  return (
    <View className="items-center bg-background rounded-2xl p-4 border border-border mb-4">
      <Text
        className="text-[11px] font-bold tracking-widest mb-1"
        style={{ color: isRight ? '#6366f1' : '#a78bfa' }}
      >
        {isRight ? 'RIGHT EYE (OD) LENS' : 'LEFT EYE (OS) LENS'}
      </Text>
      
      <Text className="text-textMuted text-[10px] mb-3">
        Drag/rotate inside circle to set Axis
      </Text>

      {/* Spectacle Lens Circle */}
      <View
        className="w-28 h-28 rounded-full items-center justify-center bg-card relative overflow-hidden"
        style={{
          borderWidth: 2,
          borderColor: isRight ? '#6366f1' : '#a78bfa',
          shadowColor: isRight ? '#6366f1' : '#a78bfa',
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        <View className="absolute w-full h-[0.5px] bg-border" />
        <View className="absolute h-full w-[0.5px] bg-border" />
        
        {Math.abs(sphNum) >= 0.25 && (
          <View
            style={{
              width: lensRingSize,
              height: lensRingSize,
              borderRadius: lensRingSize / 2,
              borderWidth: 1.5,
              borderColor: lensRingColor,
              borderStyle: 'dashed',
              opacity: 0.55,
              position: 'absolute',
            }}
          />
        )}

        <View
          style={{
            position: 'absolute',
            width: '80%',
            height: 2.5,
            backgroundColor: isRight ? '#6366f1' : '#a78bfa',
            borderRadius: 1.25,
            transform: [{ rotate: `${rotation}deg` }],
            opacity: hasAstigmatism ? 0.9 : 0.12,
          }}
        />

        {hasAstigmatism && (
          <View
            style={{
              position: 'absolute',
              width: '80%',
              height: 1,
              backgroundColor: '#f59e0b',
              borderRadius: 1,
              transform: [{ rotate: `${rotation + 90}deg` }],
              opacity: 0.4,
            }}
          />
        )}

        <View
          className="w-3.5 h-3.5 rounded-full border-2 border-white absolute"
          style={{ backgroundColor: isRight ? '#6366f1' : '#a78bfa' }}
        />
      </View>

      {/* Lens Details Labels */}
      <View className="mt-3.5 items-center">
        <Text className="text-text text-xs font-bold font-mono">
          SPH: {sphNum >= 0 ? `+${sphNum.toFixed(2)}` : sphNum.toFixed(2)} D
        </Text>
        <Text className="text-textSecondary text-[11px] mt-0.5 font-medium font-mono">
          CYL: {cylNum.toFixed(2)} D | AXIS: {rotation}°
        </Text>
        
        <View className="flex-row mt-2.5">
          <View className={`px-2 py-0.5 rounded-full ${diagnosisBg} mr-2`}>
            <Text className="text-[9px] font-bold tracking-wide uppercase" style={{ color: diagnosisColor }}>
              {typeLabel}
            </Text>
          </View>
          {hasAstigmatism && (
            <View className="px-2 py-0.5 rounded-full bg-[#f59e0b]/15">
              <Text className="text-[#f59e0b] text-[9px] font-bold tracking-wide uppercase">Astigmatism</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

interface AddEditPrescriptionScreenProps {
  route: any;
  navigation: any;
}

export function AddEditPrescriptionScreen({ route, navigation }: AddEditPrescriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const { customerId, prescription } = route.params || {};
  const isEdit = !!prescription;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<any>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      doctorName: prescription?.doctorName || '',
      prescriptionDate: prescription?.prescriptionDate ? prescription.prescriptionDate.split('T')[0] : new Date().toISOString().split('T')[0],
      rightSphere: prescription?.rightSphere?.toString() || '',
      rightCylinder: prescription?.rightCylinder?.toString() || '',
      rightAxis: prescription?.rightAxis?.toString() || '',
      rightAdd: prescription?.rightAdd?.toString() || '',
      leftSphere: prescription?.leftSphere?.toString() || '',
      leftCylinder: prescription?.leftCylinder?.toString() || '',
      leftAxis: prescription?.leftAxis?.toString() || '',
      leftAdd: prescription?.leftAdd?.toString() || '',
      pupillaryDistance: prescription?.pupillaryDistance?.toString() || '',
      notes: prescription?.notes || '',
    },
  });

  // Watch values for real-time interactive lens previews
  const rightSph = useWatch({ control, name: 'rightSphere' });
  const rightCyl = useWatch({ control, name: 'rightCylinder' });
  const rightAxis = useWatch({ control, name: 'rightAxis' });

  const leftSph = useWatch({ control, name: 'leftSphere' });
  const leftCyl = useWatch({ control, name: 'leftCylinder' });
  const leftAxis = useWatch({ control, name: 'leftAxis' });

  const copyODtoOS = () => {
    const currentValues = getValues();
    setValue('leftSphere', currentValues.rightSphere);
    setValue('leftCylinder', currentValues.rightCylinder);
    setValue('leftAxis', currentValues.rightAxis);
    setValue('leftAdd', currentValues.rightAdd);
    
    Toast.show({
      type: 'info',
      text1: 'Copied OD Values',
      text2: 'Right eye values copied to Left eye successfully.',
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
      queryClient.invalidateQueries({ queryKey: ['customer-prescriptions', activeCustomerId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['prescription', prescription.id] });
      }
      Toast.show({
        type: 'success',
        text1: isEdit ? 'Prescription Updated' : 'Prescription Added',
        text2: 'Save successful.',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Request failed';
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: errMsg,
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: PrescriptionFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      className="bg-background"
    >
      {/* Header Bar */}
      <View 
        className="bg-card border-b border-border px-6 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 16 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-primary text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-text text-base font-bold">{isEdit ? 'Edit Prescription' : 'Add Prescription'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 45 }}>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <Text className="text-textSecondary text-sm font-medium mb-2">Doctor Name</Text>
          <Controller
            control={control}
            name="doctorName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2.5 mb-3 text-sm"
                placeholder="Dr. Mehta"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />

          <Text className="text-textSecondary text-sm font-medium mb-2">Prescription Date (YYYY-MM-DD)</Text>
          <Controller
            control={control}
            name="prescriptionDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2.5 mb-1 text-sm"
                placeholder="2026-06-28"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.prescriptionDate?.message && (
            <Text className="text-[#ef4444] text-xs mb-3">{errors.prescriptionDate.message as string}</Text>
          )}
        </View>

        {/* Right Eye OD Card */}
        <Text className="text-text font-bold text-sm mb-3">Right Eye (OD)</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <VisualLensPreview
            eye="OD"
            sph={rightSph}
            cyl={rightCyl}
            axis={rightAxis}
            setValue={setValue}
            axisFieldName="rightAxis"
          />

          <View className="flex-row justify-between mb-3">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Sphere (SPH)</Text>
              <Controller
                control={control}
                name="rightSphere"
                render={({ field: { onChange, value } }) => (
                  <NumberStepper value={value} onChange={onChange} placeholder="0.00" />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Cylinder (CYL)</Text>
              <Controller
                control={control}
                name="rightCylinder"
                render={({ field: { onChange, value } }) => (
                  <NumberStepper value={value} onChange={onChange} placeholder="0.00" />
                )}
              />
            </View>
          </View>
          <View className="flex-row justify-between">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Axis</Text>
              <Controller
                control={control}
                name="rightAxis"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2.5 text-sm h-[40px] text-center"
                    placeholder="90"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Add</Text>
              <Controller
                control={control}
                name="rightAdd"
                render={({ field: { onChange, value } }) => (
                  <NumberStepper value={value} onChange={onChange} placeholder="+0.00" />
                )}
              />
            </View>
          </View>
        </View>

        {/* Copy OD to OS Button */}
        <TouchableOpacity
          onPress={copyODtoOS}
          className="bg-card border border-primary/40 rounded-xl py-3 items-center mb-6 flex-row justify-center"
        >
          <Text className="text-primary text-xs font-bold uppercase tracking-wider">
            Copy Right Eye (OD) ➡️ Left Eye (OS)
          </Text>
        </TouchableOpacity>

        {/* Left Eye OS Card */}
        <Text className="text-text font-bold text-sm mb-3">Left Eye (OS)</Text>
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <VisualLensPreview
            eye="OS"
            sph={leftSph}
            cyl={leftCyl}
            axis={leftAxis}
            setValue={setValue}
            axisFieldName="leftAxis"
          />

          <View className="flex-row justify-between mb-3">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Sphere (SPH)</Text>
              <Controller
                control={control}
                name="leftSphere"
                render={({ field: { onChange, value } }) => (
                  <NumberStepper value={value} onChange={onChange} placeholder="0.00" />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Cylinder (CYL)</Text>
              <Controller
                control={control}
                name="leftCylinder"
                render={({ field: { onChange, value } }) => (
                  <NumberStepper value={value} onChange={onChange} placeholder="0.00" />
                )}
              />
            </View>
          </View>
          <View className="flex-row justify-between">
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Axis</Text>
              <Controller
                control={control}
                name="leftAxis"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="bg-background text-text border border-border rounded-lg px-3 py-2.5 text-sm h-[40px] text-center"
                    placeholder="85"
                    placeholderTextColor="#71717a"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="number-pad"
                  />
                )}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-textSecondary text-xs mb-1.5">Add</Text>
              <Controller
                control={control}
                name="leftAdd"
                render={({ field: { onChange, value } }) => (
                  <NumberStepper value={value} onChange={onChange} placeholder="+0.00" />
                )}
              />
            </View>
          </View>
        </View>

        {/* Pupillary Distance & Notes */}
        <View className="bg-card border border-border rounded-2xl p-5 mb-6">
          <Text className="text-textSecondary text-sm font-medium mb-2">Pupillary Distance (PD mm)</Text>
          <Controller
            control={control}
            name="pupillaryDistance"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2.5 mb-4 text-sm"
                placeholder="62"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                keyboardType="numeric"
              />
            )}
          />

          <Text className="text-textSecondary text-sm font-medium mb-2">Notes</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-background text-text border border-border rounded-lg px-4 py-2.5 text-sm h-20"
                placeholder="First prescription details"
                placeholderTextColor="#71717a"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                multiline
                numberOfLines={3}
                style={{ textAlignVertical: 'top' }}
              />
            )}
          />
        </View>

        <TouchableOpacity
          className="bg-primary rounded-lg py-3.5 items-center flex-row justify-center"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" className="mr-2" />
          ) : null}
          <Text className="text-text text-base font-bold">{isEdit ? 'Save Changes' : 'Create Prescription'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
