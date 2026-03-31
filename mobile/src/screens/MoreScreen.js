import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

/**
 * "More" tab screen — groups Products, Reports, Settings, and Account actions.
 */

const MoreScreen = ({ navigation }) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const SECTIONS = [
    {
      title: 'Inventory',
      items: [
        { label: 'Products', desc: 'Manage products & services', icon: '\uD83D\uDCE6', screen: 'ProductList', color: '#6a1b9a' },
      ],
    },
    {
      title: 'Reports',
      items: [
        { label: 'Reports', desc: 'Financial reports & analytics', icon: '\uD83D\uDCCA', screen: 'Reports', color: '#1565c0' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Tax Configuration', desc: 'Manage tax rates and defaults', icon: '\uD83C\uDFE6', screen: 'TaxList', color: '#2e7d32' },
        { label: 'Ship Via', desc: 'Manage shipping methods', icon: '\uD83D\uDE9A', screen: 'ShipViaList', color: '#e65100' },
        { label: 'Company Settings', desc: 'Edit company profile', icon: '\uD83C\uDFE2', screen: 'CompanySettings', color: '#1a237e' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, idx) => (
              <TouchableOpacity
                key={item.screen}
                style={[
                  styles.menuItem,
                  idx < section.items.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.color + '18' }]}>
                  <Text style={[styles.iconText, { color: item.color }]}>{item.icon}</Text>
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuDesc}>{item.desc}</Text>
                </View>
                <Text style={styles.chevron}>{'\u203A'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Sign Out */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <View style={[styles.iconCircle, { backgroundColor: '#ffebee' }]}>
              <Text style={[styles.iconText, { color: '#c62828' }]}>{'\u23FB'}</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={[styles.menuLabel, { color: '#c62828' }]}>Sign Out</Text>
              <Text style={styles.menuDesc}>Sign out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: { fontSize: 20, fontWeight: '700' },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '700', color: '#333' },
  menuDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  chevron: { fontSize: 24, color: '#ccc', fontWeight: '300' },
});

export default MoreScreen;
