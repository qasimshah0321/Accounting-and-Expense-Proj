import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SalesTabNavigator from './SalesTabNavigator';
import PurchasesTabNavigator from './PurchasesTabNavigator';
import MoreNavigator from './MoreNavigator';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home:      { icon: '\uD83C\uDFE0', label: 'Home' },
  Sales:     { icon: '\uD83D\uDCC8', label: 'Sales' },
  Purchases: { icon: '\uD83D\uDCE6', label: 'Purchases' },
  Customers: { icon: '\uD83D\uDC65', label: 'Customers' },
  More:      { icon: '\u2630',        label: 'More' },
};

const TabIcon = ({ label, focused }) => {
  const config = TAB_CONFIG[label] || { icon: '\u2022' };
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Text style={styles.iconText}>{config.icon}</Text>
    </View>
  );
};

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerStyle: {
        backgroundColor: '#1a237e',
        elevation: 4,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
      },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor: '#e8e8e8',
        height: Platform.OS === 'ios' ? 88 : 64,
        paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        paddingTop: 6,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      tabBarActiveTintColor: '#1a237e',
      tabBarInactiveTintColor: '#9e9e9e',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
      tabBarHideOnKeyboard: true,
      tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
    })}
  >
    <Tab.Screen
      name="Home"
      component={DashboardScreen}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="Sales"
      component={SalesTabNavigator}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="Purchases"
      component={PurchasesTabNavigator}
      options={{ headerShown: false }}
    />
    <Tab.Screen
      name="Customers"
      component={ContactsScreen}
      options={{ title: 'Customers' }}
    />
    <Tab.Screen
      name="More"
      component={MoreNavigator}
      options={{ headerShown: false }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 28,
    borderRadius: 14,
  },
  iconContainerActive: {
    backgroundColor: '#e8eaf6',
  },
  iconText: {
    fontSize: 20,
  },
});

export default MainNavigator;
