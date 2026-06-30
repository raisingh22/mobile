import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  getResolvedTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeMode: 'system',
      setThemeMode: (themeMode) => set({ themeMode }),
      getResolvedTheme: () => {
        const mode = get().themeMode;
        if (mode === 'system') {
          // This is a helper, but inside React components, useColorScheme() is reactive.
          return 'dark'; // Fallback / default
        }
        return mode;
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
