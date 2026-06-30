import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';
import { PdfService } from '../../services/PdfService';

interface VisualLensProps {
  eye: 'OD' | 'OS';
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
}

function VisualEyeCard({ eye, sph, cyl, axis, add }: VisualLensProps) {
  const rotation = axis || 0;
  const sphNum = sph || 0;
  const cylNum = cyl || 0;
  const isRight = eye === 'OD';

  let diagnosisLabel = 'Emmetropia';
  let diagnosisColor = '#a1a1aa';
  let diagnosisBg = 'bg-border';

  if (sphNum < -0.25) {
    diagnosisLabel = 'Myopia';
    diagnosisColor = '#ef4444';
    diagnosisBg = 'bg-[#ef4444]/15';
  } else if (sphNum > 0.25) {
    diagnosisLabel = 'Hyperopia';
    diagnosisColor = '#10b981';
    diagnosisBg = 'bg-[#10b981]/15';
  }

  const hasAstigmatism = Math.abs(cylNum) >= 0.25;

  const lensRingSize = Math.max(22, 62 - Math.min(Math.abs(sphNum) * 9, 36));
  const lensRingColor = sphNum < 0 ? '#ef4444' : sphNum > 0 ? '#10b981' : '#374151';

  return (
    <View className="flex-1 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Eye label strip */}
      <View
        className="px-4 py-2.5 flex-row items-center"
        style={{ backgroundColor: isRight ? '#06b6d4' + '18' : '#a78bfa' + '18', borderBottomWidth: 1, borderBottomColor: '#1f2937' }}
      >
        <Ionicons
          name="eye-outline"
          size={13}
          color={isRight ? '#06b6d4' : '#a78bfa'}
        />
        <Text
          className="text-[11px] font-bold tracking-widest ml-1.5"
          style={{ color: isRight ? '#06b6d4' : '#a78bfa' }}
        >
          {isRight ? 'RIGHT EYE (OD)' : 'LEFT EYE (OS)'}
        </Text>
      </View>

      <View className="items-center py-5 px-3">
        {/* Visual Lens Diagram */}
        <View
          className="w-[88px] h-[88px] rounded-full bg-background items-center justify-center relative"
          style={{
            borderWidth: 2,
            borderColor: isRight ? '#06b6d4' : '#a78bfa',
            shadowColor: isRight ? '#06b6d4' : '#a78bfa',
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          {/* Crosshair lines */}
          <View className="absolute w-full h-[0.5px] bg-border" />
          <View className="absolute h-full w-[0.5px] bg-border" />

          {/* Power ring — size reflects SPH magnitude */}
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

          {/* Axis line — represents astigmatism direction */}
          <View
            style={{
              position: 'absolute',
              width: '80%',
              height: 2,
              backgroundColor: isRight ? '#06b6d4' : '#a78bfa',
              borderRadius: 1,
              transform: [{ rotate: `${rotation}deg` }],
              opacity: hasAstigmatism ? 0.9 : 0.12,
            }}
          />

          {/* Second ring at 90° for astigmatism cross-axis */}
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

          {/* Centre dot */}
          <View
            className="w-3 h-3 rounded-full border-2 border-white absolute"
            style={{ backgroundColor: isRight ? '#06b6d4' : '#a78bfa' }}
          />
        </View>

        {/* Diagnosis badge */}
        <View className={`px-3 py-1 rounded-full mt-3 ${diagnosisBg}`}>
          <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: diagnosisColor }}>
            {diagnosisLabel}
          </Text>
        </View>

        {/* Power summary */}
        <View className="mt-3 w-full space-y-1.5">
          <View className="flex-row justify-between items-center">
            <Text className="text-textMuted text-[10px] font-bold uppercase">SPH</Text>
            <Text className="text-text text-xs font-bold font-mono">
              {sphNum >= 0 ? `+${sphNum.toFixed(2)}` : sphNum.toFixed(2)} D
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-textMuted text-[10px] font-bold uppercase">CYL</Text>
            <Text
              className="text-xs font-bold font-mono"
              style={{ color: hasAstigmatism ? '#f59e0b' : '#a1a1aa' }}
            >
              {cylNum.toFixed(2)} D
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-textMuted text-[10px] font-bold uppercase">AXIS</Text>
            <Text className="text-textSecondary text-xs font-mono">
              {rotation}°
            </Text>
          </View>
          {add !== null && add !== undefined && (
            <View className="flex-row justify-between items-center">
              <Text className="text-textMuted text-[10px] font-bold uppercase">ADD</Text>
              <Text className="text-textSecondary text-xs font-mono">+{Number(add).toFixed(2)}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function SectionCard({ icon, iconColor, iconBg, title, children }: {
  icon: any; iconColor: string; iconBg: string; title: string; children: React.ReactNode;
}) {
  return (
    <View className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
      <View className="px-4 py-3 flex-row items-center border-b border-border" style={{ backgroundColor: '#0f1623' }}>
        <View className={`w-7 h-7 rounded-full items-center justify-center mr-2.5 ${iconBg}`}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text className="text-text font-bold text-sm">{title}</Text>
      </View>
      <View className="p-4">{children}</View>
    </View>
  );
}

interface PrescriptionDetailsScreenProps {
  route: any;
  navigation: any;
}

export function PrescriptionDetailsScreen({ route, navigation }: PrescriptionDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const { prescriptionId } = route.params;
  const queryClient = useQueryClient();
  const [generatingPdf, setGeneratingPdf] = React.useState(false);

  const { data: prescription, isLoading } = useQuery({
    queryKey: ['prescription', prescriptionId],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.prescriptions.details(prescriptionId));
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return axiosClient.delete(ENDPOINTS.prescriptions.delete(prescriptionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-prescriptions', prescription?.customerId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Toast.show({ type: 'success', text1: 'Prescription Deleted', text2: 'Record removed successfully.' });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Delete failed';
      Toast.show({ type: 'error', text1: 'Delete Failed', text2: errMsg });
    },
  });

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Prescription',
      'Are you sure you want to delete this eye prescription record?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const handleSharePdf = async () => {
    try {
      setGeneratingPdf(true);
      const uri = await PdfService.generatePrescriptionPdf(prescription, prescription.customer);
      await PdfService.shareFile(uri, `Prescription_${prescription.customer?.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      // error handled
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <View className="w-16 h-16 rounded-full bg-[#06b6d4]/10 items-center justify-center mb-4">
          <Ionicons name="eye-outline" size={30} color="#06b6d4" />
        </View>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-textMuted mt-4 text-sm">Loading prescription...</Text>
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center p-6">
        <View className="w-20 h-20 rounded-full bg-border items-center justify-center mb-4">
          <Ionicons name="eye-off-outline" size={36} color="#4b5563" />
        </View>
        <Text className="text-text font-bold text-base mb-2">Prescription Not Found</Text>
        <Text className="text-textSecondary text-sm text-center mb-5">This prescription record may have been removed.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-[#06b6d4] px-5 py-2.5 rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="bg-card border-b border-border px-5 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 20 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-border items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#06b6d4" />
        </TouchableOpacity>

        <View className="flex-row items-center">
          <Ionicons name="eye-outline" size={16} color="#06b6d4" />
          <Text className="text-text text-base font-bold ml-2">Prescription</Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-border items-center justify-center mr-2"
            onPress={handleSharePdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? (
              <ActivityIndicator size="small" color="#eab308" />
            ) : (
              <Ionicons name="share-outline" size={19} color="#eab308" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-border items-center justify-center mr-2"
            onPress={() => navigation.navigate('AddPrescription', { prescription })}
          >
            <Ionicons name="create-outline" size={19} color="#06b6d4" />
          </TouchableOpacity>
          <TouchableOpacity
            className="w-9 h-9 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 items-center justify-center"
            onPress={handleDeletePress}
          >
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* Patient Card */}
        <SectionCard icon="person-outline" iconColor="#06b6d4" iconBg="bg-[#06b6d4]/10" title="Patient Information">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 items-center justify-center mr-3">
              <Text className="text-[#06b6d4] font-bold text-base">
                {prescription.customer?.fullName?.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-text font-bold text-base">{prescription.customer?.fullName}</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="call-outline" size={12} color="#06b6d4" />
                <Text className="text-textSecondary text-xs ml-1.5">{prescription.customer?.phone}</Text>
              </View>
            </View>
          </View>

          <View className="mt-4 pt-4 border-t border-border flex-row justify-between">
            <View>
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Prescribing Doctor</Text>
              <View className="flex-row items-center">
                <Ionicons name="medical-outline" size={12} color="#a78bfa" />
                <Text className="text-text text-sm font-semibold ml-1.5">
                  {prescription.doctorName || 'Not specified'}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mb-1">Date</Text>
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={12} color="#10b981" />
                <Text className="text-text text-sm font-semibold ml-1.5">
                  {new Date(prescription.prescriptionDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* Visual Lens Diagrams */}
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="eye-outline" size={16} color="#06b6d4" />
            <Text className="text-text font-bold text-sm ml-2">Visual Eye Diagram</Text>
          </View>
          <View className="flex-row" style={{ gap: 10 }}>
            <VisualEyeCard
              eye="OD"
              sph={prescription.rightSphere}
              cyl={prescription.rightCylinder}
              axis={prescription.rightAxis}
              add={prescription.rightAdd}
            />
            <VisualEyeCard
              eye="OS"
              sph={prescription.leftSphere}
              cyl={prescription.leftCylinder}
              axis={prescription.leftAxis}
              add={prescription.leftAdd}
            />
          </View>

          {/* Diagram legend */}
          <View className="bg-card border border-border rounded-xl px-4 py-3 mt-3 flex-row flex-wrap" style={{ gap: 12 }}>
            <View className="flex-row items-center">
              <View className="w-3 h-0.5 bg-[#06b6d4] rounded mr-1.5" />
              <Text className="text-textMuted text-[10px]">Axis line</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-0.5 bg-[#f59e0b] rounded mr-1.5" style={{ opacity: 0.5 }} />
              <Text className="text-textMuted text-[10px]">Cross-axis (astig.)</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full border border-[#ef4444] mr-1.5" style={{ opacity: 0.6 }} />
              <Text className="text-textMuted text-[10px]">Myopia ring</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full border border-[#10b981] mr-1.5" style={{ opacity: 0.6 }} />
              <Text className="text-textMuted text-[10px]">Hyperopia ring</Text>
            </View>
          </View>
        </View>

        {/* Power Matrix Table */}
        <SectionCard icon="grid-outline" iconColor="#f59e0b" iconBg="bg-[#f59e0b]/10" title="Power Matrix">
          {/* Header */}
          <View className="flex-row pb-2 border-b border-border mb-2">
            <Text className="text-textMuted text-[10px] font-bold uppercase w-[16%]">Eye</Text>
            <Text className="text-textMuted text-[10px] font-bold uppercase w-[21%] text-center">SPH</Text>
            <Text className="text-textMuted text-[10px] font-bold uppercase w-[21%] text-center">CYL</Text>
            <Text className="text-textMuted text-[10px] font-bold uppercase w-[21%] text-center">AXIS</Text>
            <Text className="text-textMuted text-[10px] font-bold uppercase w-[21%] text-center">ADD</Text>
          </View>
          {/* Right Eye */}
          <View className="flex-row py-2.5 border-b border-border">
            <View className="w-[16%] flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] mr-1.5" />
              <Text className="text-text text-xs font-bold">OD</Text>
            </View>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.rightSphere ?? '0.00'}</Text>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.rightCylinder ?? '0.00'}</Text>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.rightAxis ?? '—'}</Text>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.rightAdd ?? '—'}</Text>
          </View>
          {/* Left Eye */}
          <View className="flex-row py-2.5">
            <View className="w-[16%] flex-row items-center">
              <View className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] mr-1.5" />
              <Text className="text-text text-xs font-bold">OS</Text>
            </View>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.leftSphere ?? '0.00'}</Text>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.leftCylinder ?? '0.00'}</Text>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.leftAxis ?? '—'}</Text>
            <Text className="text-textSecondary text-xs w-[21%] text-center font-mono">{prescription.leftAdd ?? '—'}</Text>
          </View>
        </SectionCard>

        {/* PD & Notes */}
        <SectionCard icon="resize-outline" iconColor="#10b981" iconBg="bg-[#10b981]/10" title="Measurements & Notes">
          <View className="flex-row items-center mb-1">
            <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider mr-2">Pupillary Distance (PD)</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="resize-outline" size={14} color="#10b981" />
            <Text className="text-text font-bold text-sm ml-2">
              {prescription.pupillaryDistance ? `${prescription.pupillaryDistance} mm` : 'Not specified'}
            </Text>
          </View>

          {prescription.notes && (
            <View className="mt-4 pt-4 border-t border-border">
              <View className="flex-row items-center mb-2">
                <Ionicons name="document-text-outline" size={13} color="#71717a" />
                <Text className="text-textMuted text-[10px] font-bold uppercase tracking-wider ml-1.5">Clinical Notes</Text>
              </View>
              <Text className="text-textSecondary text-sm leading-5">{prescription.notes}</Text>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}
