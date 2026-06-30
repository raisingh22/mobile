import AsyncStorage from '@react-native-async-storage/async-storage';

export const offlineCache = {
  async setCache(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(`optiflow_cache_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving offline cache for key ${key}:`, error);
    }
  },

  async getCache<T>(key: string): Promise<T | null> {
    try {
      const val = await AsyncStorage.getItem(`optiflow_cache_${key}`);
      return val ? JSON.parse(val) as T : null;
    } catch (error) {
      console.error(`Error fetching offline cache for key ${key}:`, error);
      return null;
    }
  },

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('optiflow_cache_'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing offline cache:', error);
    }
  },
};
