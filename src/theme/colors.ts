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
  borderGlow: '#4f46e515',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textDisabled: '#94a3b8',
  primary: '#4f46e5', // Premium Indigo 600
  primaryDark: '#4338ca', // Indigo 700
  primaryLight: '#6366f1', // Indigo 500
  primaryGlow: '#4f46e518',
  success: '#10b981',
  successGlow: '#10b98118',
  warning: '#f59e0b',
  warningGlow: '#f59e0b18',
  danger: '#ef4444',
  dangerGlow: '#ef444418',
  info: '#3b82f6',
  infoGlow: '#3b82f618',
  purple: '#8b5cf6',
  purpleGlow: '#8b5cf618',
  gradientStart: '#4f46e5',
  gradientEnd: '#6366f1',
  heroStart: '#eef2ff', // Soft Indigo starter
  heroEnd: '#f8fafc80',
};

export const darkColors = {
  background: '#090d1680', // Premium deep navy-slate background
  backgroundSolid: '#090d16',
  surface: '#0f172a', // Slate 900
  card: '#131b2e', // Deep Slate Indigo-tinted Card
  cardHover: '#1d2a4a',
  border: '#1e293b',
  borderLight: '#334155',
  borderGlow: '#6366f120',
  text: '#f8fafc', // Slate 50
  textSecondary: '#94a3b8', // Slate 400
  textMuted: '#64748b',
  textDisabled: '#475569',
  primary: '#6366f1', // Indigo 500
  primaryDark: '#4f46e5', // Indigo 600
  primaryLight: '#818cf8', // Indigo 400
  primaryGlow: '#6366f125',
  success: '#10b981',
  successGlow: '#10b98125',
  warning: '#f59e0b',
  warningGlow: '#f59e0b25',
  danger: '#f43f5e',
  dangerGlow: '#f43f5e25',
  info: '#3b82f6',
  infoGlow: '#3b82f625',
  purple: '#a78bfa',
  purpleGlow: '#a78bfa25',
  gradientStart: '#6366f1',
  gradientEnd: '#3b82f6',
  heroStart: '#111b36',
  heroEnd: '#090d1680',
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
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  dangerGlow: {
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
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
