import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { CustomerDetailsScreen } from '../features/customers/CustomerDetailsScreen';
import { AddEditCustomerScreen } from '../features/customers/AddEditCustomerScreen';
import { AddEditPrescriptionScreen } from '../features/prescriptions/AddEditPrescriptionScreen';
import { PrescriptionDetailsScreen } from '../features/prescriptions/PrescriptionDetailsScreen';
import { AddEditOrderScreen } from '../features/orders/AddEditOrderScreen';
import { OrderDetailsScreen } from '../features/orders/OrderDetailsScreen';
import { AppTabs } from './AppTabs';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }} className="justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="App" component={AppTabs} />
          <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
          <Stack.Screen name="AddEditCustomer" component={AddEditCustomerScreen} />
          <Stack.Screen name="AddPrescription" component={AddEditPrescriptionScreen} />
          <Stack.Screen name="PrescriptionDetails" component={PrescriptionDetailsScreen} />
          <Stack.Screen name="AddOrder" component={AddEditOrderScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
