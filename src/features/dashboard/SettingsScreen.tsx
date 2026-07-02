import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useThemeColors } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/Card';
import { useTranslation } from '../../hooks/useTranslation';
import { useThemeStore } from '../../store/useThemeStore';

interface SettingsScreenProps {
  navigation: any;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { user, clearAuth } = useAuthStore();
  const { t, language, setLanguage } = useTranslation();
  const { themeMode, setThemeMode } = useThemeStore();
  const colors = useThemeColors();

  const handleLogout = async () => {
    await clearAuth();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const chooseLanguage = () => {
    Alert.alert(
      t('settings.language'),
      'Select system language / भाषा चुनें',
      [
        { text: 'English', onPress: () => setLanguage('en') },
        { text: 'हिंदी (Hindi)', onPress: () => setLanguage('hi') },
        { text: 'ਪੰਜਾਬੀ (Punjabi)', onPress: () => setLanguage('pa') },
        { text: 'ગુજરાતી (Gujarati)', onPress: () => setLanguage('gu') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const chooseTheme = () => {
    Alert.alert(
      t('settings.theme'),
      'Select visual interface theme',
      [
        { text: 'System default', onPress: () => setThemeMode('system') },
        { text: 'Light Mode', onPress: () => setThemeMode('light') },
        { text: 'Dark Mode', onPress: () => setThemeMode('dark') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSolid }}>
      {/* Header Bar */}
      <View style={{ backgroundColor: colors.card, borderBottomColor: colors.border }} className="border-b px-6 pt-14 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text style={{ color: colors.text }} className="text-lg font-bold">{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* User Card */}
        <View className="items-center mb-6 pt-4">
          <View className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary items-center justify-center mb-4 shadow-lg shadow-primary/10">
            <Text className="text-primary text-3xl font-bold">{getInitials(user?.fullName)}</Text>
          </View>
          <Text style={{ color: colors.text }} className="text-xl font-bold">{user?.fullName}</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm mt-1">{user?.email}</Text>
        </View>

        {/* Business Settings */}
        <Card className="mb-6">
          <Text style={{ color: colors.textMuted }} className="text-[10px] font-bold uppercase tracking-wider mb-4">Business & Clinic</Text>
          
          <TouchableOpacity onPress={() => navigation.navigate('ClinicProfile')} style={{ borderBottomColor: colors.border }} className="flex-row items-center py-2.5 border-b" activeOpacity={0.7}>
            <Ionicons name="business-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">{t('settings.clinicProfile')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Branches')} style={{ borderBottomColor: colors.border }} className="flex-row items-center py-2.5 border-b" activeOpacity={0.7}>
            <Ionicons name="git-network-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">{t('settings.branches')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('TaxSettings')} style={{ borderBottomColor: colors.border }} className="flex-row items-center py-2.5 border-b" activeOpacity={0.7}>
            <Ionicons name="calculator-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">{t('settings.taxSettings')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Expenses')} style={{ borderBottomColor: colors.border }} className="flex-row items-center py-2.5 border-b" activeOpacity={0.7}>
            <Ionicons name="wallet-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">Expense Tracker</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Suppliers')} className="flex-row items-center py-2.5" activeOpacity={0.7}>
            <Ionicons name="people-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">Supplier Directory</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </Card>

        {/* Device Integrations */}
        <Card className="mb-6">
          <Text style={{ color: colors.textMuted }} className="text-[10px] font-bold uppercase tracking-wider mb-4">Device Integrations</Text>
          
          <TouchableOpacity onPress={() => navigation.navigate('BarcodeScanner')} className="flex-row items-center py-2.5" activeOpacity={0.7}>
            <Ionicons name="scan-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">Barcode & QR Scanner</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </Card>

        {/* Preferences */}
        <Card className="mb-6">
          <Text style={{ color: colors.textMuted }} className="text-[10px] font-bold uppercase tracking-wider mb-4">Preferences</Text>

          <TouchableOpacity onPress={chooseLanguage} style={{ borderBottomColor: colors.border }} className="flex-row items-center py-2.5 border-b" activeOpacity={0.7}>
            <Ionicons name="language-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">{t('settings.language')}</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mr-2 uppercase">{language}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity onPress={chooseTheme} className="flex-row items-center py-2.5" activeOpacity={0.7}>
            <Ionicons name="color-palette-outline" size={18} color="#6366f1" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">{t('settings.theme')}</Text>
            <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mr-2 uppercase">{themeMode}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </Card>

        {/* Data & Security */}
        <Card className="mb-6">
          <Text style={{ color: colors.textMuted }} className="text-[10px] font-bold uppercase tracking-wider mb-4">Data & Security</Text>

          <TouchableOpacity onPress={() => navigation.navigate('BackupRestore')} className="flex-row items-center py-2.5" activeOpacity={0.7}>
            <Ionicons name="cloud-upload-outline" size={18} color="#10b981" className="mr-3" />
            <Text style={{ color: colors.text }} className="text-sm flex-1 font-medium">{t('settings.backup')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </Card>

        {/* Logout Action */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-[#f43f5e]/10 border border-[#f43f5e]/30 rounded-xl py-3.5 items-center flex-row justify-center mt-4"
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#f43f5e" className="mr-2" />
          <Text className="text-[#f43f5e] font-bold text-base">{t('settings.logout')}</Text>
        </TouchableOpacity>

        <Text style={{ color: colors.textMuted }} className="text-center text-xs mt-8">OptiFlow Client v1.2.0</Text>
      </ScrollView>
    </View>
  );
}
