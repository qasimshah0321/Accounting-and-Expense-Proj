import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { invoicesAPI } from '../../services/api';

const STATUS_COLORS = {
  draft: '#9e9e9e', sent: '#1565c0', approved: '#2e7d32',
  posted: '#2e7d32', cancelled: '#d32f2f',
};

const InvoiceDetailScreen = ({ route }) => {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await invoicesAPI.getById(invoiceId);
        setInvoice(res.data?.invoice || res.data);
      } catch (err) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId]);

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  }

  if (!invoice) {
    return <View style={styles.centered}><Text style={styles.emptyText}>Invoice not found</Text></View>;
  }

  const status = invoice.status || 'draft';
  const lines = invoice.line_items || invoice.items || [];

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.docNo}>{invoice.invoice_no || `INV-${invoice.id}`}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] || '#9e9e9e' }]}>
            <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.grandTotal}>{fmt(invoice.grand_total)}</Text>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Row label="Customer" value={invoice.customer_name || '-'} />
        <Row label="Invoice Date" value={fmtDate(invoice.invoice_date)} />
        <Row label="Due Date" value={fmtDate(invoice.due_date)} />
        <Row label="Payment Status" value={(invoice.payment_status || '-').toUpperCase()} />
        <Row label="Amount Paid" value={fmt(invoice.amount_paid)} />
        <Row label="Amount Due" value={fmt(invoice.amount_due)} />
      </View>

      {/* Line Items */}
      {lines.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.lineItem}>
              <View style={styles.lineLeft}>
                <Text style={styles.lineName} numberOfLines={1}>{line.product_name || line.description || `Item ${idx + 1}`}</Text>
                <Text style={styles.lineDetail}>Qty: {line.quantity} x {fmt(line.unit_price)}</Text>
              </View>
              <Text style={styles.lineTotal}>{fmt(line.total || line.line_total)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Totals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Row label="Subtotal" value={fmt(invoice.subtotal)} />
        <Row label="Tax" value={fmt(invoice.tax_amount)} />
        <Row label="Discount" value={fmt(invoice.discount_amount)} />
        <Row label="Shipping" value={fmt(invoice.shipping_charges)} bold />
        <View style={styles.divider} />
        <Row label="Grand Total" value={fmt(invoice.grand_total)} bold />
      </View>

      {/* Notes */}
      {invoice.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{invoice.notes}</Text>
        </View>
      ) : null}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const Row = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#1a237e' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },
  headerCard: {
    backgroundColor: '#1a237e', margin: 12, borderRadius: 12, padding: 20,
    elevation: 4,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNo: { fontSize: 20, fontWeight: '800', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  grandTotal: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 12 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10,
    padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a237e', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  lineItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  lineLeft: { flex: 1, marginRight: 12 },
  lineName: { fontSize: 13, fontWeight: '600', color: '#333' },
  lineDetail: { fontSize: 11, color: '#888', marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: '#1a237e' },
  notes: { fontSize: 13, color: '#666', lineHeight: 20 },
});

export default InvoiceDetailScreen;
