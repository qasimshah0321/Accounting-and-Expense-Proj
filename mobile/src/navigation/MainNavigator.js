import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform, TouchableOpacity } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import ContactsScreen from '../screens/ContactsScreen';
import SalesTabNavigator from './SalesTabNavigator';
import PurchasesTabNavigator from './PurchasesTabNavigator';
import MoreNavigator from './MoreNavigator';
import { useNotificationContext } from '../context/NotificationContext';

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

/** Bell icon with optional unread badge — shown in screen headers */
const NotificationBell = ({ navigation, unreadCount }) => (
  <TouchableOpacity
    style={styles.bellBtn}
    onPress={() => navigation.navigate('More', { screen: 'Notifications' })}
    accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
    accessibilityRole="button"
  >
    <Text style={styles.bellIcon}>🔔</Text>
    {unreadCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const MainNavigator = () => {
  const { unreadCount } = useNotificationContext();

  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: {
          backgroundColor: '#1a237e',
          elevation: 4,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        headerRight: () => (
          <NotificationBell navigation={navigation} unreadCount={unreadCount} />
        ),
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
        // Badge on More tab when there are unread notifications
        tabBarBadge: route.name === 'More' && unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: { backgroundColor: '#e53935', fontSize: 10 },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
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
};

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
  bellBtn: {
    marginRight: 14,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});

export default MainNavigator;
