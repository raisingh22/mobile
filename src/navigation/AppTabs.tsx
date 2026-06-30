import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../api/axiosClient';
import { ENDPOINTS } from '../api/endpoints';
import { useNotificationStore } from '../store/notificationStore';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { CustomersScreen } from '../features/customers/CustomersScreen';
import { PrescriptionsScreen } from '../features/prescriptions/PrescriptionsScreen';
import { OrdersScreen } from '../features/orders/OrdersScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();

export function AppTabs() {
  const { readIds } = useNotificationStore();

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axiosClient.get(ENDPOINTS.notifications);
      return response.data;
    },
    refetchInterval: 30000, // Background poll every 30s
  });

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181b',
          borderTopColor: '#27272a',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#71717a',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'cube';

          if (route.name === 'Dashboard') {
            iconName = 'grid-outline';
          } else if (route.name === 'Customers') {
            iconName = 'people-outline';
          } else if (route.name === 'Prescriptions') {
            iconName = 'document-text-outline';
          } else if (route.name === 'Orders') {
            iconName = 'cart-outline';
          } else if (route.name === 'Notifications') {
            iconName = 'notifications-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Prescriptions" component={PrescriptionsScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: 'white',
            fontSize: 9,
            lineHeight: 13,
            fontWeight: 'bold',
          },
        }}
      />
    </Tab.Navigator>
  );
}
