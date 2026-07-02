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
import { useThemeColors } from '../../theme/colors';

const loginSchema = z.object({
  mobileNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid mobile number format (e.g. +919876543210)'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type LoginFormData = z.infer<typeof loginSchema>;

interface LoginScreenProps { navigation: any; }

// ── Animated Eye Logo ──────────────────────────────────────────────
function EyeLogo() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const colors = useThemeColors();

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

  return (
    <View style={styles.logoContainer}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          { backgroundColor: colors.primary, opacity: glowAnim },
        ]}
      />
      {/* Logo circle */}
      <Animated.View
        style={[
          styles.logoCircle,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary + '35',
            shadowColor: colors.primary,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Eye shape using nested views */}
        <View style={[styles.eyeOuter, { backgroundColor: colors.primary }]}>
          <View style={[styles.eyeInner, { backgroundColor: colors.backgroundSolid }]}>
            <View style={[styles.eyePupil, { backgroundColor: colors.primary }]} />
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
  const colors = useThemeColors();
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
    defaultValues: { mobileNumber: '', password: '' },
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
      <View style={[styles.screen, { backgroundColor: colors.backgroundSolid }]}>
        {/* Background radial glows */}
        <View style={[styles.bgGlow1, { backgroundColor: colors.primary }]} />
        <View style={[styles.bgGlow2, { backgroundColor: colors.purple }]} />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand / Logo */}
          <Animated.View style={[styles.brandSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <EyeLogo />
            <Text style={[styles.brandName, { color: colors.text }]}>OptiFlow</Text>
            <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>Premium Optical Management</Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>Sign In</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Welcome back to your workspace</Text>

            <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

            <Controller control={control} name="mobileNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mobile Number"
                  placeholder="+919876543210"
                  icon="call-outline"
                  onBlur={onBlur} onChangeText={onChange} value={value}
                  autoCapitalize="none" keyboardType="phone-pad"
                  error={errors.mobileNumber?.message}
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
                    onIconRightPress={() => setShowPassword((s) => !s)}
                    secureTextEntry={!showPassword}
                    onBlur={onBlur} onChangeText={onChange} value={value}
                    autoCapitalize="none"
                    error={errors.password?.message}
                  />
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
                  style={[
                    styles.biometricBtn,
                    { backgroundColor: colors.primaryGlow, borderColor: colors.primary + '45' },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={24}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>New to OptiFlow?</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
            </View>

            <Button
              title="Create a Workspace"
              variant="outline"
              onPress={() => navigation.navigate('Register')}
              icon="business-outline"
            />
          </Animated.View>

          {/* Footer */}
          <Text style={[styles.footer, { color: colors.textDisabled }]}>
            OptiFlow · Premium Optical ERP · v2.0
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  bgGlow1: {
    position: 'absolute', top: -80, left: -60,
    width: 300, height: 300, borderRadius: 150,
    opacity: 0.07,
  },
  bgGlow2: {
    position: 'absolute', top: 200, right: -80,
    width: 250, height: 250, borderRadius: 125,
    opacity: 0.05,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  glowRing: {
    position: 'absolute',
    width: 90, height: 90, borderRadius: 45,
  },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  eyeOuter: {
    width: 38, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  eyeInner: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  eyePupil: {
    width: 10, height: 10, borderRadius: 5,
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
    fontSize: 36, fontWeight: '800', letterSpacing: 1.5,
  },
  brandTagline: { fontSize: 13, marginTop: 4, letterSpacing: 0.3 },
  card: {
    borderRadius: 24, borderWidth: 1, padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  cardSubtitle: { fontSize: 13, marginTop: 4 },
  divider: { height: 1, marginVertical: 20 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  biometricBtn: {
    width: 54, height: 54,
    borderRadius: 16, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  footer: { textAlign: 'center', fontSize: 11, marginTop: 8 },
});
