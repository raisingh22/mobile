import { useColorScheme, Appearance } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

export const lightColors = {
  background: '#f8fafc80',
  backgroundSolid: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardHover: '#f1f5f9',
  border: '#cbd5e1',
  borderLight: '#e2e8f0',
  borderGlow: '#06b6d420',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textDisabled: '#94a3b8',
  primary: '#0891b2',
  primaryDark: '#0e7490',
  primaryLight: '#06b6d4',
  primaryGlow: '#06b6d420',
  success: '#10b981',
  successGlow: '#10b98120',
  warning: '#f59e0b',
  warningGlow: '#f59e0b20',
  danger: '#ef4444',
  dangerGlow: '#ef444420',
  info: '#3b82f6',
  infoGlow: '#3b82f620',
  purple: '#8b5cf6',
  purpleGlow: '#8b5cf620',
  gradientStart: '#06b6d4',
  gradientEnd: '#3b82f6',
  heroStart: '#e0f2fe',
  heroEnd: '#f8fafc80',
};

export const darkColors = {
  background: '#07091280',
  backgroundSolid: '#070912',
  surface: '#0d1117',
  card: '#111827',
  cardHover: '#141f2e',
  border: '#1f2937',
  borderLight: '#2d3748',
  borderGlow: '#06b6d430',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDisabled: '#475569',
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  primaryLight: '#22d3ee',
  primaryGlow: '#06b6d440',
  success: '#10b981',
  successGlow: '#10b98130',
  warning: '#f59e0b',
  warningGlow: '#f59e0b30',
  danger: '#f43f5e',
  dangerGlow: '#f43f5e30',
  info: '#3b82f6',
  infoGlow: '#3b82f630',
  purple: '#a78bfa',
  purpleGlow: '#a78bfa30',
  gradientStart: '#06b6d4',
  gradientEnd: '#3b82f6',
  heroStart: '#0f1f3d',
  heroEnd: '#07091280',
};

const getActiveColors = () => {
  try {
    const themeMode = useThemeStore.getState().themeMode;
    const system = Appearance.getColorScheme();
    const resolved = themeMode === 'system' ? (system || 'dark') : themeMode;
    return resolved === 'light' ? lightColors : darkColors;
  } catch (e) {
    return darkColors;
  }
};

// Dynamic JS Proxy for theme-reactive stylesheet and property evaluations
export const colors = new Proxy({}, {
  get(target, prop) {
    const active = getActiveColors();
    return active[prop as keyof typeof darkColors];
  }
}) as typeof darkColors;

export const shadows = {
  primaryGlow: {
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  dangerGlow: {
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

export function useThemeColors() {
  const system = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const resolved = themeMode === 'system' ? (system || 'dark') : themeMode;
  return resolved === 'light' ? lightColors : darkColors;
}
