import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'optiflow_secure_token';
const BIOMETRIC_KEY = 'optiflow_biometrics_enabled';

export const secureStore = {
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving secure token', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error fetching secure token', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Error deleting secure token', error);
    }
  },

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving biometric preference', error);
    }
  },

  async getBiometricsEnabled(): Promise<boolean> {
    try {
      const val = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      return val === 'true';
    } catch (error) {
      console.error('Error reading biometric preference', error);
      return false;
    }
  },
};
