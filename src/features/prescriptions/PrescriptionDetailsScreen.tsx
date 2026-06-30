import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { colors } from '../../theme/colors';

interface VisualLensProps {
  eye: 'OD' | 'OS';
  sph: number | null;
  cyl: number | null;
  axis: number | null;
}

function VisualLensDetails({ eye, sph, cyl, axis }: VisualLensProps) {
  const rotation = axis || 0;
  const sphNum = sph || 0;
  const cylNum = cyl || 0;

  // Determine diagnosis type
  let typeLabel = 'Normal';
  let badgeColor = 'bg-[#27272a] text-[#a1a1aa]';
  if (sphNum < 0) {
    typeLabel = 'Myopia';
    badgeColor = 'bg-[#ef4444]/20 text-[#ef4444]';
  } else if (sphNum > 0) {
    typeLabel = 'Hyperopia';
    badgeColor = 'bg-[#10b981]/20 text-[#10b981]';
  }

  const hasAstigmatism = cylNum !== 0;

  return (
    <View className="items-center bg-[#18181b] border border-[#27272a] rounded-2xl p-4 w-[48%]">
      <Text className="text-white text-[10px] font-bold tracking-wider mb-2">
        {eye === 'OD' ? 'RIGHT EYE (OD)' : 'LEFT EYE (OS)'}
      </Text>

      {/* Static spectacle lens preview */}
      <View className="w-20 h-20 rounded-full border-2 border-[#6366f1] items-center justify-center bg-[#09090b] relative overflow-hidden">
        <View className="absolute w-full h-[0.5px] bg-[#27272a]" />
        <View className="absolute h-full w-[0.5px] bg-[#27272a]" />
        
        {Math.abs(sphNum) > 0 && (
          <View
            style={{
              width: Math.max(20, 60 - Math.min(Math.abs(sphNum) * 8, 40)),
              height: Math.max(20, 60 - Math.min(Math.abs(sphNum) * 8, 40)),
              borderRadius: 999,
              borderWidth: 1,
              borderColor: sphNum < 0 ? '#ef4444' : '#10b981',
              opacity: 0.4,
              borderStyle: 'dashed',
            }}
            className="absolute"
          />
        )}

        <View
          style={{
            width: '85%',
            height: 2,
            backgroundColor: '#6366f1',
            transform: [{ rotate: `${rotation}deg` }],
            opacity: hasAstigmatism ? 1 : 0.15,
          }}
          className="absolute"
        />

        <View className="w-2.5 h-2.5 rounded-full bg-[#10b981] border border-white absolute shadow-sm" />
      </View>

      <View className="mt-2.5 items-center">
        <Text className="text-white text-[11px] font-bold">
          SPH: {sphNum > 0 ? `+${sphNum.toFixed(2)}` : sphNum.toFixed(2)} D
        </Text>
        <Text className="text-[#a1a1aa] text-[10px] mt-0.5 font-medium">
          CYL: {cylNum.toFixed(2)} D | AXIS: {rotation}°
        </Text>
        <View className={`px-2 py-0.5 rounded-full mt-2 ${badgeColor}`}>
          <Text className="text-[8px] font-bold uppercase">{typeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

interface PrescriptionDetailsScreenProps {
  route: any;
  navigation: any;
}

export function PrescriptionDetailsScreen({ route, navigation }: PrescriptionDetailsScreenProps) {
  const { prescriptionId } = route.params;
  const queryClient = useQueryClient();

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
      Toast.show({
        type: 'success',
        text1: 'Prescription Deleted',
        text2: 'Prescription removed successfully.',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Delete failed';
      Toast.show({
        type: 'error',
        text1: 'Delete Failed',
        text2: errMsg,
      });
    },
  });

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Prescription',
      'Are you sure you want to delete this eye prescription record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!prescription) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center p-6">
        <Text className="text-[#a1a1aa] mb-4">Prescription not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-[#6366f1] px-4 py-2 rounded-lg">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header Bar */}
      <View className="bg-[#18181b] border-b border-[#27272a] px-6 pt-14 pb-4 flex-row justify-between items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text className="text-white text-base font-bold">Prescription Details</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-3"
            onPress={() => navigation.navigate('AddPrescription', { prescription })}
          >
            <Ionicons name="create-outline" size={22} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Customer Profile Block */}
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 mb-6">
          <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Customer</Text>
          <Text className="text-white text-lg font-bold">{prescription.customer?.fullName}</Text>
          <Text className="text-[#a1a1aa] text-xs mt-1">📞 {prescription.customer?.phone}</Text>

          <View className="mt-4 pt-4 border-t border-[#27272a] flex-row justify-between">
            <View>
              <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Doctor</Text>
              <Text className="text-white text-sm font-semibold">{prescription.doctorName || 'Not specified'}</Text>
            </View>
            <View className="items-end">
              <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Date</Text>
              <Text className="text-white text-sm font-semibold">
                {new Date(prescription.prescriptionDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Eye Lens Previews Side by Side */}
        <View className="flex-row justify-between mb-6">
          <VisualLensDetails
            eye="OD"
            sph={prescription.rightSphere}
            cyl={prescription.rightCylinder}
            axis={prescription.rightAxis}
          />
          <VisualLensDetails
            eye="OS"
            sph={prescription.leftSphere}
            cyl={prescription.leftCylinder}
            axis={prescription.leftAxis}
          />
        </View>

        {/* Prescription Table Grid */}
        <Text className="text-white font-bold text-sm mb-3">Power Matrix</Text>
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden mb-6">
          {/* Header Row */}
          <View className="bg-[#27272a] px-4 py-2.5 flex-row">
            <Text className="text-white text-xs font-bold w-[16%]">Eye</Text>
            <Text className="text-white text-xs font-bold w-[21%] text-center">SPH</Text>
            <Text className="text-white text-xs font-bold w-[21%] text-center">CYL</Text>
            <Text className="text-white text-xs font-bold w-[21%] text-center">AXIS</Text>
            <Text className="text-white text-xs font-bold w-[21%] text-center">ADD</Text>
          </View>

          {/* Right Eye Row */}
          <View className="px-4 py-3 flex-row border-b border-[#27272a]">
            <Text className="text-white text-xs font-bold w-[16%]">OD (R)</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.rightSphere ?? '0.00'}</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.rightCylinder ?? '0.00'}</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.rightAxis ?? '—'}</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.rightAdd ?? '—'}</Text>
          </View>

          {/* Left Eye Row */}
          <View className="px-4 py-3 flex-row">
            <Text className="text-white text-xs font-bold w-[16%]">OS (L)</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.leftSphere ?? '0.00'}</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.leftCylinder ?? '0.00'}</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.leftAxis ?? '—'}</Text>
            <Text className="text-[#a1a1aa] text-xs w-[21%] text-center">{prescription.leftAdd ?? '—'}</Text>
          </View>
        </View>

        {/* Pupillary Distance & Notes */}
        <View className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5">
          <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Pupillary Distance (PD)</Text>
          <Text className="text-white text-sm font-semibold mb-4">
            {prescription.pupillaryDistance ? `${prescription.pupillaryDistance} mm` : 'Not specified'}
          </Text>

          {prescription.notes && (
            <View className="pt-4 border-t border-[#27272a]">
              <Text className="text-[#71717a] text-[10px] font-bold uppercase tracking-wider mb-1">Notes</Text>
              <Text className="text-[#a1a1aa] text-sm leading-5">{prescription.notes}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
