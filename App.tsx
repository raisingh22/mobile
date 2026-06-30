import './global.css';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useAuthStore } from './src/store/authStore';
import { secureStore } from './src/services/secureStore';
import { axiosClient } from './src/api/axiosClient';
import { ENDPOINTS } from './src/api/endpoints';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

const queryClient = new QueryClient();

export default function App() {
  const { setAuth, setLoading, clearAuth, isLoading } = useAuthStore();

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
      <SafeAreaProvider style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

