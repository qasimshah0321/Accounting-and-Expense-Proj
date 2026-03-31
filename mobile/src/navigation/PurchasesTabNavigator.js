import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PurchasesHubScreen from '../screens/PurchasesHubScreen';
import BillListScreen from '../screens/bills/BillListScreen';
import BillFormScreen from '../screens/bills/BillFormScreen';
import PurchaseOrderListScreen from '../screens/purchase-orders/PurchaseOrderListScreen';
import PurchaseOrderFormScreen from '../screens/purchase-orders/PurchaseOrderFormScreen';
import ExpenseListScreen from '../screens/expenses/ExpenseListScreen';
import ExpenseFormScreen from '../screens/expenses/ExpenseFormScreen';
import VendorPaymentListScreen from '../screens/payments/VendorPaymentListScreen';
import VendorPaymentFormScreen from '../screens/payments/VendorPaymentFormScreen';

const Stack = createStackNavigator();
const opts = {
  headerStyle: { backgroundColor: '#1a237e', elevation: 4 },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600', fontSize: 18 },
  headerBackTitleVisible: false,
};

const PurchasesTabNavigator = () => (
  <Stack.Navigator screenOptions={opts}>
    <Stack.Screen name="PurchasesHub" component={PurchasesHubScreen} options={{ title: 'Purchases' }} />
    <Stack.Screen name="BillList" component={BillListScreen} options={{ title: 'Bills' }} />
    <Stack.Screen name="BillForm" component={BillFormScreen} options={({ route }) => ({ title: route.params?.bill ? 'Edit Bill' : 'New Bill' })} />
    <Stack.Screen name="PurchaseOrderList" component={PurchaseOrderListScreen} options={{ title: 'Purchase Orders' }} />
    <Stack.Screen name="PurchaseOrderForm" component={PurchaseOrderFormScreen} options={({ route }) => ({ title: route.params?.purchaseOrder ? 'Edit PO' : 'New Purchase Order' })} />
    <Stack.Screen name="ExpenseList" component={ExpenseListScreen} options={{ title: 'Expenses' }} />
    <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={({ route }) => ({ title: route.params?.expense ? 'Edit Expense' : 'New Expense' })} />
    <Stack.Screen name="VendorPaymentList" component={VendorPaymentListScreen} options={{ title: 'Vendor Payments' }} />
    <Stack.Screen name="VendorPaymentForm" component={VendorPaymentFormScreen} />
  </Stack.Navigator>
);

export default PurchasesTabNavigator;
