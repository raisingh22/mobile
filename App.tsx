import './global.css';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/useThemeStore';
import { secureStore } from './src/services/secureStore';
import { axiosClient } from './src/api/axiosClient';
import { ENDPOINTS } from './src/api/endpoints';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors, lightColors, darkColors } from './src/theme/colors';
import { OfflineBanner } from './src/components/OfflineBanner';
import { toastConfig } from './src/components/ToastConfig';

const queryClient = new QueryClient();

export default function App() {
  const { setAuth, setLoading, clearAuth, isLoading } = useAuthStore();
  const system = useColorScheme();
  const themeMode = useThemeStore((state) => state.themeMode);
  const resolved: 'light' | 'dark' = themeMode === 'system' 
    ? (system === 'light' ? 'light' : 'dark') 
    : (themeMode === 'light' ? 'light' : 'dark');
  const themeColors = resolved === 'light' ? lightColors : darkColors;
  const { setColorScheme } = useNativewindColorScheme();

  // Synchronize NativeWind theme color class
  useEffect(() => {
    setColorScheme(resolved);
  }, [resolved, setColorScheme]);

  const NavigationTheme = resolved === 'light' ? {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: themeColors.backgroundSolid,
      card: themeColors.card,
    },
  } : {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: themeColors.backgroundSolid,
      card: themeColors.card,
    },
  };

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await secureStore.getToken();
        if (token) {
          // Verify token against /auth/me
          const response = await axiosClient.get(ENDPOINTS.auth.me, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.data) {
            await setAuth(response.data, token);
          } else {
            await clearAuth();
          }
        } else {
          await clearAuth();
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        await clearAuth();
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: themeColors.backgroundSolid }}>
        <StatusBar style={resolved === 'light' ? 'dark' : 'light'} />
        <OfflineBanner />
        <View className={resolved} style={{ flex: 1 }}>
          <NavigationContainer theme={NavigationTheme}>
            <AppNavigator />
          </NavigationContainer>
        </View>
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

