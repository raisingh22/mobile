import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export function SplashScreen() {
  return (
    <View 
      style={{ flex: 1, backgroundColor: '#090d16' }} 
      className="justify-between items-center py-16 px-6"
    >
      {/* Top spacer to align center layout */}
      <View style={{ height: 40 }} />

      {/* Main Logo & Title */}
      <View className="items-center">
        {/* Pulsing/Glowing Icon Wrapper */}
        <View className="w-24 h-24 rounded-full bg-[#06b6d4]/10 border-2 border-[#06b6d4]/30 items-center justify-center mb-6 shadow-lg shadow-[#06b6d4]/20">
          <Ionicons name="eye-outline" size={48} color="#06b6d4" />
        </View>
        
        <Text className="text-white text-4xl font-bold tracking-[6px] mb-2">OptiFlow</Text>
        <Text className="text-textSecondary text-sm tracking-wider uppercase font-semibold text-center px-4">
          Optics Workspace Manager
        </Text>
      </View>

      {/* Loading Progress Section */}
      <View className="items-center">
        <ActivityIndicator size="large" color="#06b6d4" className="mb-4" />
        <Text className="text-textMuted text-xs font-semibold tracking-widest uppercase">
          Initializing Board...
        </Text>
      </View>

      {/* Footer Info */}
      <View className="items-center">
        <Text className="text-textMuted text-xs">OptiFlow Client v1.0.0</Text>
        <Text className="text-[#3f3f46] text-[10px] mt-1">© 2026 Antigravity. All rights reserved.</Text>
      </View>
    </View>
  );
}
