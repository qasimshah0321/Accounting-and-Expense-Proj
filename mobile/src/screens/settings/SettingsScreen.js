import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const ITEMS = [
  { label: 'Tax Configuration', screen: 'TaxList', icon: '%', desc: 'Manage tax rates and defaults' },
  { label: 'Ship Via', screen: 'ShipViaList', icon: '🚚', desc: 'Manage shipping methods' },
  { label: 'Company Settings', screen: 'CompanySettings', icon: '🏢', desc: 'Edit company profile and info' },
];

export default function SettingsScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Configuration</Text>
      {ITEMS.map(item => (
        <TouchableOpacity key={item.screen} style={styles.card} onPress={() => navigation.navigate(item.screen)}>
          <Text style={styles.icon}>{item.icon}</Text>
          <View style={styles.info}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  heading: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, elevation: 2 },
  icon: { fontSize: 24, marginRight: 14 },
  info: { flex: 1 },
  label: { fontSize: 15, fontWeight: '700', color: '#1a237e' },
  desc: { fontSize: 13, color: '#666', marginTop: 2 },
  arrow: { fontSize: 22, color: '#bbb' },
});
