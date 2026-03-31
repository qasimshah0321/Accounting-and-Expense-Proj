import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const fmt = (v) =>
  parseFloat(v || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

const TotalsCard = ({ subtotal, taxAmount, discountAmount, shippingCharges, grandTotal, totalLabel = 'Grand Total', accentColor = '#1a237e' }) => {
  return (
    <View style={styles.card}>
      <Text style={[styles.title, { color: accentColor }]}>Totals</Text>
      <Row label="Subtotal" value={fmt(subtotal)} />
      <Row label="Tax" value={fmt(taxAmount)} />
      <Row label="Discount" value={fmt(discountAmount)} />
      {shippingCharges !== undefined && shippingCharges !== null && (
        <Row label="Shipping" value={fmt(shippingCharges)} />
      )}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={[styles.label, { fontWeight: '700' }]}>{totalLabel}</Text>
        <Text style={[styles.value, { fontWeight: '800', color: accentColor, fontSize: 16 }]}>
          {fmt(grandTotal)}
        </Text>
      </View>
    </View>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  label: { fontSize: 13, color: '#666' },
  value: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
});

export default TotalsCard;
