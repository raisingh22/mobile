import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Modal, FlatList, TextInput,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useThemeColors } from '../../theme/colors';

// ── Tag definitions ──────────────────────────────────────────────
const PREDEFINED_TAGS = [
  { label: 'VIP',          color: '#eab308', bg: '#eab30815' },
  { label: 'Regular',      color: '#6366f1', bg: '#6366f115' },
  { label: 'New Patient',  color: '#10b981', bg: '#10b98115' },
  { label: 'High Risk',    color: '#ef4444', bg: '#ef444415' },
  { label: 'Diabetic',     color: '#f97316', bg: '#f9731615' },
  { label: 'Glaucoma',     color: '#a78bfa', bg: '#a78bfa15' },
  { label: 'Progressive',  color: '#3b82f6', bg: '#3b82f615' },
  { label: 'Contact Lens', color: '#14b8a6', bg: '#14b8a615' },
];

const RELATION_TYPES = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

// ── Schema ───────────────────────────────────────────────────────
const customerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format').optional().or(z.literal('')),
  gender: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface AddEditCustomerScreenProps {
  route: any;
  navigation: any;
}

// ── Tag Toggle Row ────────────────────────────────────────────────
function TagSelector({ selectedTags, onToggle }: { selectedTags: string[]; onToggle: (t: string) => void }) {
  const colors = useThemeColors();
  return (
    <View className="mb-1">
      <Text className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-2">
        Select Customer Tags
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {PREDEFINED_TAGS.map((tag) => {
          const active = selectedTags.includes(tag.label);
          return (
            <TouchableOpacity
              key={tag.label}
              onPress={() => onToggle(tag.label)}
              className="flex-row items-center px-3 py-1.5 rounded-full border"
              style={{
                backgroundColor: active ? tag.bg : 'transparent',
                borderColor: active ? tag.color : colors.borderLight,
              }}
            >
              {active && (
                <Ionicons name="checkmark-circle" size={12} color={tag.color} style={{ marginRight: 4 }} />
              )}
              <Text className="text-xs font-semibold" style={{ color: active ? tag.color : colors.textSecondary }}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Family Member Picker ──────────────────────────────────────────
function FamilyMemberPicker({
  workspaceCustomers,
  selectedId,
  relationType,
  onSelectMember,
  onSelectRelation,
  selfId,
}: {
  workspaceCustomers: any[];
  selectedId: string;
  relationType: string;
  onSelectMember: (id: string, name: string) => void;
  onSelectRelation: (rel: string) => void;
  selfId?: string;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = workspaceCustomers.filter(
    (c) => c.id !== selfId && c.fullName.toLowerCase().includes(query.toLowerCase())
  );

  const selectedName = workspaceCustomers.find((c) => c.id === selectedId)?.fullName;

  return (
    <View className="mb-1">
      <Text className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-2">
        Link Family Member
      </Text>

      {/* Member pick button */}
      <TouchableOpacity
        onPress={() => setSearchVisible(true)}
        className="bg-card border rounded-xl px-4 py-3 flex-row items-center justify-between"
        style={{ borderColor: colors.borderLight }}
      >
        <View className="flex-row items-center">
          <Ionicons name="people-outline" size={16} color={colors.textMuted} />
          <Text className="ml-2 text-sm" style={{ color: selectedId ? colors.text : colors.textMuted }}>
            {selectedId ? selectedName : 'Select family member...'}
          </Text>
        </View>
        {selectedId ? (
          <TouchableOpacity onPress={() => onSelectMember('', '')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Relation type chips — only shown when someone is selected */}
      {selectedId ? (
        <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
          {RELATION_TYPES.map((rel) => {
            const active = relationType === rel;
            return (
              <TouchableOpacity
                key={rel}
                onPress={() => onSelectRelation(rel)}
                className="px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: active ? colors.primaryGlow : 'transparent',
                  borderColor: active ? colors.primary : colors.borderLight,
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: active ? colors.primary : colors.textSecondary }}>
                  {rel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* Search Modal */}
      <Modal visible={searchVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: colors.borderLight, maxHeight: '70%', paddingBottom: insets.bottom + 16 }}>
            <View className="px-4 pt-4 pb-3 border-b border-borderLight" style={{ borderColor: colors.borderLight }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-text font-bold text-base" style={{ color: colors.text }}>Select Family Member</Text>
                <TouchableOpacity onPress={() => setSearchVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View className="bg-card border rounded-xl px-3 py-2 flex-row items-center" style={{ borderColor: colors.borderLight }}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  className="flex-1 text-text text-sm ml-2"
                  style={{ color: colors.text }}
                  placeholder="Search name..."
                  placeholderTextColor={colors.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                />
              </View>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="flex-row items-center bg-card border rounded-xl px-4 py-3 mb-2"
                  style={{ borderColor: colors.borderLight }}
                  onPress={() => {
                    onSelectMember(item.id, item.fullName);
                    setSearchVisible(false);
                    setQuery('');
                  }}
                >
                  <View className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 items-center justify-center mr-3">
                    <Text className="text-primary font-bold text-xs">
                      {item.fullName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-text font-semibold text-sm" style={{ color: colors.text }}>{item.fullName}</Text>
                    <Text className="text-textMuted text-xs mt-0.5" style={{ color: colors.textSecondary }}>{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="items-center py-10">
                  <Text className="text-textMuted text-sm" style={{ color: colors.textSecondary }}>No customers found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export function AddEditCustomerScreen({ route, navigation }: AddEditCustomerScreenProps) {
  const insets = useSafeAreaInsets();
  const customer = route.params?.customer;
  const isEdit = !!customer;
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  // Local state for tags & family (managed outside RHF for flexibility)
  const [selectedTags, setSelectedTags] = useState<string[]>(customer?.tags ?? []);
  const [primaryMemberId, setPrimaryMemberId] = useState<string>(customer?.primaryMemberId ?? '');
  const [primaryMemberName, setPrimaryMemberName] = useState<string>('');
  const [relationType, setRelationType] = useState<string>(customer?.relationType ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load all customers for the family picker
  const { data: allCustomersData } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.customers.list, { params: { limit: 200 } });
      return res.data;
    },
  });
  const allCustomers: any[] = allCustomersData?.data ?? [];

  const prefill = route.params?.prefill;

  const { control, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: customer?.fullName || prefill?.fullName || '',
      phone: customer?.phone || prefill?.phone || '',
      email: customer?.email || '',
      dateOfBirth: customer?.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
      gender: customer?.gender || '',
      address: customer?.address || prefill?.address || '',
      notes: customer?.notes || '',
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const payload: any = { ...data };
      if (!payload.email) delete payload.email;
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      payload.tags = selectedTags;
      payload.primaryMemberId = primaryMemberId || null;
      payload.relationType = relationType || null;

      if (isEdit) {
        return axiosClient.patch(ENDPOINTS.customers.update(customer.id), payload);
      } else {
        return axiosClient.post(ENDPOINTS.customers.create, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
      }
      Toast.show({
        type: 'success',
        text1: isEdit ? 'Customer Updated' : 'Customer Added',
        text2: isEdit ? 'Profile details saved.' : 'New profile created.',
      });
      navigation.goBack();
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Request failed';
      Toast.show({ type: 'error', text1: 'Request Failed', text2: errMsg });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.backgroundSolid }}
    >
      {/* Header */}
      <View
        className="bg-card border-b border-border px-5 pb-4 flex-row justify-between items-center"
        style={{ paddingTop: insets.top > 0 ? insets.top + 8 : 16 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-full bg-borderLight items-center justify-center"
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View className="flex-row items-center">
          <Ionicons name="person-outline" size={15} color={colors.primary} />
          <Text className="text-text text-base font-bold ml-2" style={{ color: colors.text }}>
            {isEdit ? 'Edit Customer' : 'Add Customer'}
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {/* ── Core Info ── */}
        <View className="bg-card border rounded-2xl p-4 mb-4" style={{ borderColor: colors.borderLight }}>
          <View className="flex-row items-center mb-4">
            <View style={{ backgroundColor: colors.primaryGlow }} className="w-7 h-7 rounded-full items-center justify-center mr-2">
              <Ionicons name="person-outline" size={14} color={colors.primary} />
            </View>
            <Text className="text-text font-bold text-sm" style={{ color: colors.text }}>Basic Information</Text>
          </View>

          <Controller control={control} name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Full Name *" placeholder="Harjinder Singh"
                onBlur={onBlur} onChangeText={onChange} value={value}
                error={errors.fullName?.message}
              />
            )}
          />
          <Controller control={control} name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Phone Number *" placeholder="9876543210"
                onBlur={onBlur} onChangeText={onChange} value={value}
                keyboardType="phone-pad" error={errors.phone?.message}
              />
            )}
          />
          <Controller control={control} name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Email (Optional)" placeholder="john@example.com"
                onBlur={onBlur} onChangeText={onChange} value={value}
                autoCapitalize="none" keyboardType="email-address"
                error={errors.email?.message}
              />
            )}
          />
          <Controller control={control} name="dateOfBirth"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Date of Birth (YYYY-MM-DD)" placeholder="1990-04-15"
                onBlur={onBlur} onChangeText={onChange} value={value}
                error={errors.dateOfBirth?.message}
              />
            )}
          />

          {/* Gender quick select */}
          <Controller control={control} name="gender"
            render={({ field: { onChange, value } }) => (
              <View className="mb-4">
                <Text className="text-textSecondary text-xs font-semibold uppercase tracking-wider mb-2">
                  Gender
                </Text>
                <View className="flex-row" style={{ gap: 8 }}>
                  {['Male', 'Female', 'Other'].map((g) => {
                    const active = value === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => onChange(active ? '' : g)}
                        className="flex-1 items-center py-2 rounded-xl border"
                        style={{
                          backgroundColor: active ? colors.primaryGlow : 'transparent',
                          borderColor: active ? colors.primary : colors.borderLight,
                        }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: active ? colors.primary : colors.textSecondary }}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          />

          <Controller control={control} name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Address" placeholder="MG Road, Pune"
                onBlur={onBlur} onChangeText={onChange} value={value}
              />
            )}
          />
        </View>

        {/* ── Tags ── */}
        <View className="bg-card border rounded-2xl p-4 mb-4" style={{ borderColor: colors.borderLight }}>
          <View className="flex-row items-center mb-4">
            <View className="w-7 h-7 rounded-full bg-[#eab308]/10 items-center justify-center mr-2">
              <Ionicons name="pricetag-outline" size={14} color="#eab308" />
            </View>
            <Text className="text-text font-bold text-sm" style={{ color: colors.text }}>Customer Tags</Text>
          </View>
          <TagSelector selectedTags={selectedTags} onToggle={toggleTag} />
        </View>

        {/* ── Family Member ── */}
        <View className="bg-card border rounded-2xl p-4 mb-4" style={{ borderColor: colors.borderLight }}>
          <View className="flex-row items-center mb-4">
            <View className="w-7 h-7 rounded-full bg-[#a78bfa]/10 items-center justify-center mr-2">
              <Ionicons name="people-outline" size={14} color="#a78bfa" />
            </View>
            <Text className="text-text font-bold text-sm" style={{ color: colors.text }}>Household / Family Link</Text>
          </View>
          <FamilyMemberPicker
            workspaceCustomers={allCustomers}
            selectedId={primaryMemberId}
            relationType={relationType}
            selfId={customer?.id}
            onSelectMember={(id, name) => {
              setPrimaryMemberId(id);
              setPrimaryMemberName(name);
              if (!id) setRelationType('');
            }}
            onSelectRelation={setRelationType}
          />
        </View>

        {/* ── Notes ── */}
        <View className="bg-card border rounded-2xl p-4 mb-4" style={{ borderColor: colors.borderLight }}>
          <View className="flex-row items-center mb-4">
            <View className="w-7 h-7 rounded-full bg-[#10b981]/10 items-center justify-center mr-2">
              <Ionicons name="document-text-outline" size={14} color="#10b981" />
            </View>
            <Text className="text-text font-bold text-sm" style={{ color: colors.text }}>Clinical Notes</Text>
          </View>
          <Controller control={control} name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Notes (Optional)"
                placeholder="Prefers lightweight frames. History of dry eyes..."
                onBlur={onBlur} onChangeText={onChange} value={value}
                multiline numberOfLines={4}
                style={{ textAlignVertical: 'top' }}
                className="h-24 text-start"
              />
            )}
          />
        </View>

        <Button
          title={isEdit ? 'Save Changes' : 'Create Customer'}
          onPress={handleSubmit(onSubmit)}
          isLoading={isSubmitting}
          className="mt-2"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
