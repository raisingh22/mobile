import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { CustomersScreen } from '../features/customers/CustomersScreen';
import { OrdersScreen } from '../features/orders/OrdersScreen';
import { AppointmentsScreen } from '../features/appointments/AppointmentsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 4;

function TabBarIcon({ route, focused }: { route: any; focused: boolean }) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const colors = useThemeColors();

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      bounciness: 8,
      speed: 12,
    }).start();
  }, [focused]);

  let iconName: any = 'help-circle-outline';
  if (route.name === 'Dashboard')    iconName = focused ? 'grid' : 'grid-outline';
  if (route.name === 'Customers')    iconName = focused ? 'people' : 'people-outline';
  if (route.name === 'Orders')       iconName = focused ? 'cube' : 'cube-outline';
  if (route.name === 'Appointments') iconName = focused ? 'calendar' : 'calendar-outline';

  const color = focused ? colors.primary : colors.textSecondary;

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[
          styles.pillIndicator,
          {
            backgroundColor: colors.primaryGlow,
            transform: [{ scale: scaleAnim }],
            opacity: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          },
        ]}
      />
      <Ionicons name={iconName} size={22} color={color} style={{ zIndex: 2 }} />
    </View>
  );
}

export function AppTabs() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }: any) => ({
        headerShown: false,
        tabBarIcon: ({ focused }: any) => <TabBarIcon route={route} focused={focused} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.borderGlow,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          elevation: 0,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 48,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIndicator: {
    position: 'absolute',
    width: 48,
    height: 32,
    borderRadius: 16,
    zIndex: 1,
  },
});
