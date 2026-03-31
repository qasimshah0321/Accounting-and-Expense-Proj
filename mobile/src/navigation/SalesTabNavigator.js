import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SalesHubScreen from '../screens/SalesHubScreen';
import InvoiceListScreen from '../screens/invoices/InvoiceListScreen';
import InvoiceFormScreen from '../screens/invoices/InvoiceFormScreen';
import SalesOrderListScreen from '../screens/sales-orders/SalesOrderListScreen';
import SalesOrderFormScreen from '../screens/sales-orders/SalesOrderFormScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import EstimateListScreen from '../screens/estimates/EstimateListScreen';
import EstimateFormScreen from '../screens/estimates/EstimateFormScreen';
import EstimateDetailScreen from '../screens/estimates/EstimateDetailScreen';
import DeliveryNoteListScreen from '../screens/delivery-notes/DeliveryNoteListScreen';
import DeliveryNoteFormScreen from '../screens/delivery-notes/DeliveryNoteFormScreen';
import DeliveryNoteDetailScreen from '../screens/delivery-notes/DeliveryNoteDetailScreen';
import CustomerPaymentListScreen from '../screens/payments/CustomerPaymentListScreen';
import CustomerPaymentFormScreen from '../screens/payments/CustomerPaymentFormScreen';

const Stack = createStackNavigator();
const opts = {
  headerStyle: { backgroundColor: '#1a237e', elevation: 4 },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600', fontSize: 18 },
  headerBackTitleVisible: false,
};

const SalesTabNavigator = () => (
  <Stack.Navigator screenOptions={opts}>
    <Stack.Screen name="SalesHub" component={SalesHubScreen} options={{ title: 'Sales' }} />
    <Stack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'Invoices' }} />
    <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={({ route }) => ({ title: route.params?.invoice ? 'Edit Invoice' : 'New Invoice' })} />
    <Stack.Screen name="SalesOrderList" component={SalesOrderListScreen} options={{ title: 'Sales Orders' }} />
    <Stack.Screen name="SalesOrderForm" component={SalesOrderFormScreen} options={({ route }) => ({ title: route.params?.salesOrder ? 'Edit Sales Order' : 'New Sales Order' })} />
    <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Products' }} />
    <Stack.Screen name="EstimateList" component={EstimateListScreen} options={{ title: 'Estimates' }} />
    <Stack.Screen name="EstimateForm" component={EstimateFormScreen} options={({ route }) => ({ title: route.params?.estimate ? 'Edit Estimate' : 'New Estimate' })} />
    <Stack.Screen name="EstimateDetail" component={EstimateDetailScreen} options={{ title: 'Estimate Details' }} />
    <Stack.Screen name="DeliveryNoteList" component={DeliveryNoteListScreen} options={{ title: 'Delivery Notes' }} />
    <Stack.Screen name="DeliveryNoteForm" component={DeliveryNoteFormScreen} options={({ route }) => ({ title: route.params?.deliveryNote ? 'Edit Delivery Note' : 'New Delivery Note' })} />
    <Stack.Screen name="DeliveryNoteDetail" component={DeliveryNoteDetailScreen} options={{ title: 'Delivery Note Details' }} />
    <Stack.Screen name="CustomerPaymentList" component={CustomerPaymentListScreen} options={{ title: 'Customer Payments' }} />
    <Stack.Screen name="CustomerPaymentForm" component={CustomerPaymentFormScreen} />
  </Stack.Navigator>
);

export default SalesTabNavigator;
