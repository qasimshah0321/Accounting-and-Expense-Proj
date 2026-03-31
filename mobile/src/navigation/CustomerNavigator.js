import React from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import SalesOrderListScreen from '../screens/sales-orders/SalesOrderListScreen';
import SalesOrderFormScreen from '../screens/sales-orders/SalesOrderFormScreen';

const Stack = createStackNavigator();

const opts = {
  headerStyle: { backgroundColor: '#1a237e', elevation: 4, shadowOpacity: 0.3 },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700', fontSize: 18 },
  headerBackTitleVisible: false,
};

const CustomerNavigator = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen
        name="CustomerSalesOrderList"
        component={SalesOrderListScreen}
        options={{
          title: 'My Sales Orders',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16, paddingHorizontal: 8, paddingVertical: 4 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Sign out"
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="SalesOrderForm"
        component={SalesOrderFormScreen}
        options={({ route }) => ({
          title: route.params?.salesOrder ? 'Edit Order' : 'New Sales Order',
        })}
      />
    </Stack.Navigator>
  );
};

export default CustomerNavigator;
