import React from 'react';
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
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { SettingsScreen } from '../features/dashboard/SettingsScreen';
import { AppointmentDetailsScreen } from '../features/appointments/AppointmentDetailsScreen';
import { AddEditAppointmentScreen } from '../features/appointments/AddEditAppointmentScreen';
import { ClinicProfileScreen } from '../features/dashboard/Settings/ClinicProfileScreen';
import { BranchesScreen } from '../features/dashboard/Settings/BranchesScreen';
import { AddBranchScreen } from '../features/dashboard/Settings/AddBranchScreen';
import { TaxSettingsScreen } from '../features/dashboard/Settings/TaxSettingsScreen';
import { BackupRestoreScreen } from '../features/dashboard/Settings/BackupRestoreScreen';
import { BarcodeScannerScreen } from '../features/scanner/BarcodeScannerScreen';
import { ExpensesScreen } from '../features/dashboard/Settings/ExpensesScreen';
import { SuppliersScreen } from '../features/dashboard/Settings/SuppliersScreen';
import { ReceiptPadScreen } from '../features/receipts/ReceiptPadScreen';
import { LedgerScreen } from '../features/ledger/LedgerScreen';
import { AddEditPaymentScreen } from '../features/ledger/AddEditPaymentScreen';
import { NewVisitWizardScreen } from '../features/visits/NewVisitWizardScreen';
import { AppTabs } from './AppTabs';

const Stack = createNativeStackNavigator();

import { SplashScreen } from '../features/auth/SplashScreen';

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.backgroundSolid },
        animation: 'slide_from_right',
        animationTypeForReplace: 'push',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen 
            name="App" 
            component={AppTabs} 
            options={{ headerShown: false }}
          />
          <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
          <Stack.Screen name="AddEditCustomer" component={AddEditCustomerScreen} />
          <Stack.Screen name="AddPrescription" component={AddEditPrescriptionScreen} />
          <Stack.Screen name="PrescriptionDetails" component={PrescriptionDetailsScreen} />
          <Stack.Screen name="AddOrder" component={AddEditOrderScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="ClinicProfile" component={ClinicProfileScreen} />
          <Stack.Screen name="Branches" component={BranchesScreen} />
          <Stack.Screen name="AddBranch" component={AddBranchScreen} />
          <Stack.Screen name="TaxSettings" component={TaxSettingsScreen} />
          <Stack.Screen name="BackupRestore" component={BackupRestoreScreen} />
          <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
          <Stack.Screen name="Expenses" component={ExpensesScreen} />
          <Stack.Screen name="Suppliers" component={SuppliersScreen} />
          <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
          <Stack.Screen name="AddEditAppointment" component={AddEditAppointmentScreen} />
          <Stack.Screen name="ReceiptPad" component={ReceiptPadScreen} />
          <Stack.Screen name="Ledger" component={LedgerScreen} />
          <Stack.Screen name="AddEditPayment" component={AddEditPaymentScreen} />
          <Stack.Screen name="NewVisit" component={NewVisitWizardScreen} />
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
