import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useThemeColors } from '../../theme/colors';

export function SplashScreen() {
  const colors = useThemeColors();

  // Pulsing outer ring
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.6)).current;
  const ring2Opacity = useRef(new Animated.Value(0.4)).current;

  // Logo scale pulse
  const logoPulse = useRef(new Animated.Value(1)).current;

  // Staggered content fade-in
  const logoFade = useRef(new Animated.Value(0)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const subtitleFade = useRef(new Animated.Value(0)).current;
  const loaderFade = useRef(new Animated.Value(0)).current;
  const footerFade = useRef(new Animated.Value(0)).current;

  // Spinner rotation
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing rings (ripple outward)
    const pulseRing = (anim: Animated.Value, opacityAnim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1.5, duration: 1800, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();

    pulseRing(ring1Anim, ring1Opacity, 0);
    pulseRing(ring2Anim, ring2Opacity, 600);

    // Logo gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.04, duration: 1600, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();

    // Spinner
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();

    // Staggered fade-ins
    Animated.stagger(180, [
      Animated.timing(logoFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(titleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(subtitleFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(loaderFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(footerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundSolid }]}>
      {/* Background ambient glow */}
      <View style={[styles.bgGlow, { backgroundColor: colors.primary }]} />

      {/* Top spacer */}
      <View style={{ height: 60 }} />

      {/* Main Logo Section */}
      <View style={styles.logoSection}>
        {/* Ripple rings */}
        <Animated.View
          style={[
            styles.rippleRing,
            { borderColor: colors.primary, transform: [{ scale: ring1Anim }], opacity: ring1Opacity },
          ]}
        />
        <Animated.View
          style={[
            styles.rippleRing,
            styles.rippleRing2,
            { borderColor: colors.primary, transform: [{ scale: ring2Anim }], opacity: ring2Opacity },
          ]}
        />

        {/* Logo orb */}
        <Animated.View
          style={[
            styles.logoOrb,
            {
              backgroundColor: colors.primaryGlow,
              borderColor: colors.primary + '40',
              transform: [{ scale: logoPulse }],
              opacity: logoFade,
            },
          ]}
        >
          {/* Eye icon composed of shapes */}
          <View style={styles.eyeOuter}>
            <View style={[styles.eyeInner, { backgroundColor: colors.backgroundSolid }]}>
              <View style={[styles.eyePupil, { backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.highlight1} />
          </View>
        </Animated.View>

        {/* Brand name */}
        <Animated.Text style={[styles.brandName, { color: colors.text, opacity: titleFade }]}>
          OptiFlow
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { color: colors.textSecondary, opacity: subtitleFade }]}>
          Optics Workspace Manager
        </Animated.Text>
      </View>

      {/* Loader Section */}
      <Animated.View style={[styles.loaderSection, { opacity: loaderFade }]}>
        {/* Rotating arc spinner */}
        <View style={styles.spinnerContainer}>
          <View style={[styles.spinnerTrack, { borderColor: colors.border }]} />
          <Animated.View
            style={[
              styles.spinnerArc,
              { borderTopColor: colors.primary, transform: [{ rotate: spinInterpolate }] },
            ]}
          />
        </View>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Initializing Board...
        </Text>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: footerFade }]}>
        <Text style={[styles.footerVersion, { color: colors.textDisabled }]}>
          OptiFlow Client v2.0.0
        </Text>
        <Text style={[styles.footerCopy, { color: colors.textDisabled }]}>
          © 2026 Antigravity. All rights reserved.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  bgGlow: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.05,
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  rippleRing2: {
    width: 148,
    height: 148,
    borderRadius: 74,
  },
  logoOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  eyeOuter: {
    width: 42,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eyeInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  highlight1: {
    position: 'absolute',
    top: 5,
    right: 9,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  brandName: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  loaderSection: {
    alignItems: 'center',
    gap: 16,
  },
  spinnerContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerTrack: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
  },
  spinnerArc: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#6366f1',
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  footerVersion: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerCopy: {
    fontSize: 10,
  },
});
