import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MoreScreen from '../screens/MoreScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import TaxListScreen from '../screens/settings/TaxListScreen';
import TaxFormScreen from '../screens/settings/TaxFormScreen';
import ShipViaListScreen from '../screens/settings/ShipViaListScreen';
import ShipViaFormScreen from '../screens/settings/ShipViaFormScreen';
import CompanySettingsScreen from '../screens/settings/CompanySettingsScreen';

const Stack = createStackNavigator();
const opts = {
  headerStyle: { backgroundColor: '#1a237e', elevation: 4, shadowOpacity: 0.3 },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '600', fontSize: 18 },
  headerBackTitleVisible: false,
};

const MoreNavigator = () => (
  <Stack.Navigator screenOptions={opts}>
    <Stack.Screen name="MoreHome" component={MoreScreen} options={{ title: 'More' }} />
    <Stack.Screen name="ProductList" component={ProductListScreen} options={{ title: 'Products' }} />
    <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
    <Stack.Screen name="TaxList" component={TaxListScreen} options={{ title: 'Tax Configuration' }} />
    <Stack.Screen name="TaxForm" component={TaxFormScreen} />
    <Stack.Screen name="ShipViaList" component={ShipViaListScreen} options={{ title: 'Ship Via' }} />
    <Stack.Screen name="ShipViaForm" component={ShipViaFormScreen} />
    <Stack.Screen name="CompanySettings" component={CompanySettingsScreen} options={{ title: 'Company Settings' }} />
  </Stack.Navigator>
);

export default MoreNavigator;
