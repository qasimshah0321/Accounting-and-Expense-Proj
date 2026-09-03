import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
  Image, TouchableOpacity,
} from 'react-native';
import { invoicesAPI, fbrAPI } from '../../services/api';

const STATUS_COLORS = {
  draft: '#9e9e9e', sent: '#1565c0', approved: '#2e7d32',
  posted: '#2e7d32', cancelled: '#d32f2f',
};

const InvoiceDetailScreen = ({ route }) => {
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingFbr, setSubmittingFbr] = useState(false);

  const loadInvoice = async () => {
    try {
      const res = await invoicesAPI.getById(invoiceId);
      setInvoice(res.data?.invoice || res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadInvoice();
  }, [invoiceId]);

  const handleSubmitFbr = async () => {
    Alert.alert(
      'Submit to FBR?',
      'This invoice will be sent to the FBR POS system. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmittingFbr(true);
              await fbrAPI.submitInvoice(invoiceId);
              Alert.alert('Success', 'Invoice submitted to FBR');
              await loadInvoice();
            } catch (err) {
              Alert.alert('FBR Error', err.message);
            } finally {
              setSubmittingFbr(false);
            }
          },
        },
      ]
    );
  };

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

      {/* FBR Verified Invoice */}
      {invoice.fbr_submission_status === 'submitted' && invoice.fbr_qr_url ? (
        <View style={styles.section}>
          <View style={styles.fbrHeader}>
            <View style={styles.fbrBadge}>
              <Text style={styles.fbrBadgeText}>FBR VERIFIED</Text>
            </View>
          </View>
          <Text style={styles.fbrUsin}>FBR Invoice No: {invoice.fbr_usin || '-'}</Text>
          {invoice.fbr_submitted_at ? (
            <Text style={styles.fbrMeta}>
              Submitted: {new Date(invoice.fbr_submitted_at).toLocaleString()}
            </Text>
          ) : null}
          <View style={styles.qrWrap}>
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(invoice.fbr_qr_url)}`,
              }}
              style={styles.qrImage}
            />
          </View>
          <Text style={styles.fbrUrl} numberOfLines={2}>{invoice.fbr_qr_url}</Text>
        </View>
      ) : null}

      {/* Submit to FBR (sent/approved invoices that haven't been submitted) */}
      {['sent', 'approved', 'paid', 'partially_paid'].includes(status)
        && invoice.fbr_submission_status !== 'submitted' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FBR Submission</Text>
          {invoice.fbr_error ? (
            <Text style={styles.fbrError}>Last error: {invoice.fbr_error}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.submitBtn, submittingFbr && { opacity: 0.6 }]}
            onPress={handleSubmitFbr}
            disabled={submittingFbr}
          >
            {submittingFbr
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Submit to FBR</Text>}
          </TouchableOpacity>
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
  // FBR styles
  fbrHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  fbrBadge: { backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  fbrBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  fbrUsin: { fontSize: 14, fontWeight: '700', color: '#1a237e', marginBottom: 4 },
  fbrMeta: { fontSize: 12, color: '#666', marginBottom: 12 },
  qrWrap: { alignItems: 'center', marginVertical: 12 },
  qrImage: { width: 150, height: 150, borderRadius: 4 },
  fbrUrl: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  fbrError: { fontSize: 12, color: '#dc2626', backgroundColor: '#fee2e2', padding: 8, borderRadius: 6, marginBottom: 10 },
  submitBtn: { backgroundColor: '#0ea5e9', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default InvoiceDetailScreen;
