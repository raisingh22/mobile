import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, StyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useThemeColors } from '../../theme/colors';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  workspaceName: z.string().min(3, 'Workspace name must be at least 3 characters'),
});
type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterScreenProps { navigation: any; }

const FEATURES = [
  { icon: 'people-outline' as const, text: 'Unlimited customer profiles' },
  { icon: 'eye-outline' as const, text: 'Prescription management' },
  { icon: 'cart-outline' as const, text: 'Order & payment tracking' },
  { icon: 'calendar-outline' as const, text: 'Appointment scheduling' },
];

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const colors = useThemeColors();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 3 }),
    ]).start();
  }, []);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', workspaceName: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      const response = await axiosClient.post(ENDPOINTS.auth.register, data);
      const { user, token } = response.data;
      await setAuth(user, token);
      Toast.show({ type: 'success', text1: '🎉 Workspace Created!', text2: `Welcome to ${data.workspaceName}` });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Registration failed';
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: errMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <View style={[styles.screen, { backgroundColor: colors.backgroundSolid }]}>
        {/* Background glows */}
        <View style={[styles.bgGlow1, { backgroundColor: colors.primary }]} />
        <View style={[styles.bgGlow2, { backgroundColor: colors.purple }]} />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.logoMark, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '30' }]}>
              <Ionicons name="business-outline" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Create Workspace</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Set up your optical shop in 60 seconds</Text>
          </Animated.View>

          {/* Feature pills */}
          <Animated.View style={[styles.featureRow, { opacity: fadeAnim }]}>
            {FEATURES.map((f) => (
              <View
                key={f.text}
                style={[
                  styles.featurePill,
                  { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '25' },
                ]}
              >
                <Ionicons name={f.icon} size={13} color={colors.primary} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f.text}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textMuted }]}>Your Details</Text>

            <Controller control={control} name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Full Name" placeholder="Dr. Harjinder Singh"
                  icon="person-outline"
                  onBlur={onBlur} onChangeText={onChange} value={value}
                  error={errors.fullName?.message}
                />
              )}
            />
            <Controller control={control} name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Email Address" placeholder="you@clinic.com"
                  icon="mail-outline"
                  onBlur={onBlur} onChangeText={onChange} value={value}
                  autoCapitalize="none" keyboardType="email-address"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller control={control} name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Password" placeholder="Min. 8 characters"
                  icon="lock-closed-outline"
                  secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value}
                  autoCapitalize="none"
                  error={errors.password?.message}
                />
              )}
            />

            <View style={styles.sectionDivider}>
              <View style={[styles.divLine, { backgroundColor: colors.borderLight }]} />
              <Text style={[styles.divText, { color: colors.textMuted }]}>Workspace Info</Text>
              <View style={[styles.divLine, { backgroundColor: colors.borderLight }]} />
            </View>

            <Controller control={control} name="workspaceName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Shop / Clinic Name" placeholder="Lens Vision Care"
                  icon="storefront-outline"
                  onBlur={onBlur} onChangeText={onChange} value={value}
                  error={errors.workspaceName?.message}
                  hint="This is how your team will identify your workspace"
                />
              )}
            />

            <Button
              title="Launch Workspace"
              onPress={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              icon="rocket-outline"
              size="lg"
            />
          </Animated.View>

          <TouchableOpacity style={styles.signInRow} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.signInText, { color: colors.textSecondary }]}>Already have a workspace? </Text>
            <Text style={[styles.signInLink, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  bgGlow1: {
    position: 'absolute', bottom: 100, right: -80,
    width: 280, height: 280, borderRadius: 140,
    opacity: 0.06,
  },
  bgGlow2: {
    position: 'absolute', top: 120, left: -100,
    width: 260, height: 260, borderRadius: 130,
    opacity: 0.05,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  header: { marginBottom: 20 },
  logoMark: {
    width: 56, height: 56, borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 14, marginTop: 4 },
  featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  featurePill: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1,
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
    gap: 5,
  },
  featureText: { fontSize: 11, fontWeight: '500' },
  card: {
    borderRadius: 24, borderWidth: 1,
    padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '700',
    marginBottom: 20, letterSpacing: 1.2, textTransform: 'uppercase',
  },
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, marginBottom: 20, marginTop: 4,
  },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  signInRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  signInText: { fontSize: 13 },
  signInLink: { fontSize: 13, fontWeight: '600' },
});
