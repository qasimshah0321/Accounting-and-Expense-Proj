import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import MainNavigator from './MainNavigator';
import CustomerNavigator from './CustomerNavigator';

// Master data forms
import CustomerFormScreen from '../screens/customers/CustomerFormScreen';
import VendorFormScreen from '../screens/vendors/VendorFormScreen';
import ProductFormScreen from '../screens/products/ProductFormScreen';

// Sales detail screens
import InvoiceDetailScreen from '../screens/invoices/InvoiceDetailScreen';
import SalesOrderDetailScreen from '../screens/sales-orders/SalesOrderDetailScreen';

// Purchase detail screens
import BillDetailScreen from '../screens/bills/BillDetailScreen';
import PurchaseOrderDetailScreen from '../screens/purchase-orders/PurchaseOrderDetailScreen';

const Stack = createStackNavigator();
const screenOptions = {
  headerStyle: { backgroundColor: '#1a237e', elevation: 4, shadowOpacity: 0.3 },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600', fontSize: 18 },
  headerBackTitleVisible: false,
  cardStyle: { backgroundColor: '#f5f5f5' },
};

/** Navigator shown to users with role === 'customer' — Sales Orders only */
const CustomerAppNavigator = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="CustomerMain" component={CustomerNavigator} options={{ headerShown: false }} />
    <Stack.Screen name="SalesOrderDetail" component={SalesOrderDetailScreen} options={{ title: 'Order Details' }} />
  </Stack.Navigator>
);

/** Full navigator for admins / all other roles */
const FullAppNavigator = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
    {/* Master data forms */}
    <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={({ route }) => ({ title: route.params?.customer ? 'Edit Customer' : 'New Customer' })} />
    <Stack.Screen name="VendorForm" component={VendorFormScreen} options={({ route }) => ({ title: route.params?.vendor ? 'Edit Vendor' : 'New Vendor' })} />
    <Stack.Screen name="ProductForm" component={ProductFormScreen} options={({ route }) => ({ title: route.params?.product ? 'Edit Product' : 'New Product' })} />
    {/* Sales detail */}
    <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice Details' }} />
    <Stack.Screen name="SalesOrderDetail" component={SalesOrderDetailScreen} options={{ title: 'Sales Order Details' }} />
    {/* Purchase detail */}
    <Stack.Screen name="BillDetail" component={BillDetailScreen} options={{ title: 'Bill Details' }} />
    <Stack.Screen name="PurchaseOrderDetail" component={PurchaseOrderDetailScreen} options={{ title: 'Purchase Order Details' }} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a237e' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return user?.role === 'customer' ? <CustomerAppNavigator /> : <FullAppNavigator />;
};

export default AppNavigator;
