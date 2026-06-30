import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // isConnected can be null during initialization, default to false if explicitly connected false
      const offline = state.isConnected === false;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View className="bg-amber-600 border-b border-amber-700 px-4 py-2.5 flex-row items-center justify-center">
      <Ionicons name="cloud-offline-outline" size={16} color="white" className="mr-2" />
      <Text className="text-white text-xs font-bold tracking-wider uppercase">
        Offline Mode — Viewing cached data
      </Text>
    </View>
  );
}
