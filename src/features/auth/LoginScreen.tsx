import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Animated, StyleSheet,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Toast from 'react-native-toast-message';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { axiosClient } from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { secureStore } from '../../services/secureStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type LoginFormData = z.infer<typeof loginSchema>;

interface LoginScreenProps { navigation: any; }

// ── Animated Eye Logo ──────────────────────────────────────────────
function EyeLogo() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

  return (
    <View style={styles.logoContainer}>
      {/* Outer glow ring */}
      <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
      {/* Logo circle */}
      <Animated.View style={[styles.logoCircle, { transform: [{ scale: pulseAnim }] }]}>
        {/* Eye shape using nested views */}
        <View style={styles.eyeOuter}>
          <View style={styles.eyeInner}>
            <View style={styles.eyePupil} />
          </View>
          {/* Lens highlights */}
          <View style={styles.highlight1} />
          <View style={styles.highlight2} />
        </View>
      </Animated.View>
    </View>
  );
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { setAuth } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometrics');
  const [showPassword, setShowPassword] = useState(false);

  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 12, bounciness: 4 }),
    ]).start();

    const checkBiometrics = async () => {
      const isEnabled = await secureStore.getBiometricsEnabled();
      const savedToken = await secureStore.getToken();
      if (isEnabled && savedToken) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled) {
          setShowBiometric(true);
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Touch ID');
          }
        }
      }
    };
    checkBiometrics();
  }, []);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Sign in with ${biometricType}`,
        fallbackLabel: 'Use passcode',
      });
      if (result.success) {
        const token = await secureStore.getToken();
        if (token) {
          setIsSubmitting(true);
          const response = await axiosClient.get(ENDPOINTS.auth.me, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data) {
            await setAuth(response.data, token);
            Toast.show({ type: 'success', text1: 'Welcome back!', text2: response.data.fullName });
          }
        }
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Biometric Failed', text2: 'Please sign in with your password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const response = await axiosClient.post(ENDPOINTS.auth.login, data);
      const { user, token } = response.data;
      await setAuth(user, token);
      Toast.show({ type: 'success', text1: 'Welcome back!', text2: `Signed in as ${user.fullName}` });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Login failed';
      Toast.show({ type: 'error', text1: 'Sign In Failed', text2: errMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <View style={styles.screen}>
        {/* Background radial glow */}
        <View style={styles.bgGlow1} />
        <View style={styles.bgGlow2} />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand / Logo */}
          <Animated.View style={[styles.brandSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <EyeLogo />
            <Text style={styles.brandName}>OptiFlow</Text>
            <Text style={styles.brandTagline}>Premium Optical Management</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Welcome back to your workspace</Text>

            <View style={styles.divider} />

            <Controller control={control} name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  icon="mail-outline"
                  onBlur={onBlur} onChangeText={onChange} value={value}
                  autoCapitalize="none" keyboardType="email-address"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller control={control} name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Input
                    label="Password"
                    placeholder="Min. 8 characters"
                    icon="lock-closed-outline"
                    iconRight={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    secureTextEntry={!showPassword}
                    onBlur={onBlur} onChangeText={onChange} value={value}
                    autoCapitalize="none"
                    error={errors.password?.message}
                  />
                  <TouchableOpacity
                    style={styles.showPasswordBtn}
                    onPress={() => setShowPassword((s) => !s)}
                  >
                    {/* Touch target for the right icon — handled by iconRight visually */}
                  </TouchableOpacity>
                </View>
              )}
            />

            <View style={styles.actionRow}>
              <View style={styles.flex}>
                <Button
                  title="Sign In"
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isSubmitting}
                  icon="log-in-outline"
                />
              </View>
              {showBiometric && (
                <TouchableOpacity
                  onPress={handleBiometricLogin}
                  style={styles.biometricBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={24}
                    color="#06b6d4"
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>New to OptiFlow?</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Create a Workspace"
              variant="outline"
              onPress={() => navigation.navigate('Register')}
              icon="business-outline"
            />
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footer}>
            OptiFlow · Premium Optical ERP · v2.0
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#070912' },
  bgGlow1: {
    position: 'absolute', top: -80, left: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#06b6d4', opacity: 0.06,
  },
  bgGlow2: {
    position: 'absolute', top: 200, right: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: '#3b82f6', opacity: 0.05,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  glowRing: {
    position: 'absolute',
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#06b6d4',
  },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#0d1117',
    borderWidth: 2, borderColor: '#06b6d430',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#06b6d4', shadowOpacity: 0.5, shadowRadius: 15, shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  eyeOuter: {
    width: 38, height: 22, borderRadius: 11,
    backgroundColor: '#06b6d4',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  eyeInner: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#070912',
    alignItems: 'center', justifyContent: 'center',
  },
  eyePupil: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#06b6d4',
  },
  highlight1: {
    position: 'absolute', top: 4, right: 8,
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  highlight2: {
    position: 'absolute', top: 7, right: 6,
    width: 2, height: 2, borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  brandName: {
    fontSize: 36, fontWeight: '800', color: '#f1f5f9',
    letterSpacing: 1.5,
  },
  brandTagline: { fontSize: 13, color: '#64748b', marginTop: 4, letterSpacing: 0.3 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.2 },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 0 },
  divider: { height: 1, backgroundColor: '#1f2937', marginVertical: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  biometricBtn: {
    width: 54, height: 54,
    backgroundColor: '#06b6d412',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#06b6d440',
    alignItems: 'center', justifyContent: 'center',
  },
  showPasswordBtn: { position: 'absolute', right: 14, top: 12, padding: 6 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1f2937' },
  dividerText: { fontSize: 12, color: '#64748b' },
  footer: { textAlign: 'center', color: '#334155', fontSize: 11, marginTop: 8 },
});
