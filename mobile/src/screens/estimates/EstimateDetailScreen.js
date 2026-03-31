import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
  TouchableOpacity,
} from 'react-native';
import { estimatesAPI, salesOrdersAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const EstimateDetailScreen = ({ route, navigation }) => {
  const { estimateId } = route.params;
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => { fetchEstimate(); }, [estimateId]);

  const fetchEstimate = async () => {
    try {
      const res = await estimatesAPI.getById(estimateId);
      setEstimate(res.data?.estimate || res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const handleStatusChange = async (newStatus) => {
    Alert.alert('Confirm', `Change status to "${newStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await estimatesAPI.updateStatus(estimateId, newStatus);
            Alert.alert('Success', `Status updated to ${newStatus}.`);
            fetchEstimate();
          } catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  const handleConvertToSO = () => {
    Alert.alert(
      'Convert to Sales Order',
      'Create a Sales Order from this estimate? The estimate will be marked as converted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            setConverting(true);
            try {
              const lines = estimate.line_items || estimate.items || [];
              const soPayload = {
                customer_id: estimate.customer_id,
                order_date: new Date().toISOString().slice(0, 10),
                delivery_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
                notes: `Converted from Estimate ${estimate.estimate_no || estimateId}. ${estimate.notes || ''}`,
                shipping_charges: parseFloat(estimate.shipping_charges) || 0,
                status: 'draft',
                subtotal: parseFloat(estimate.subtotal) || 0,
                tax_amount: parseFloat(estimate.tax_amount) || 0,
                discount_amount: parseFloat(estimate.discount_amount) || 0,
                grand_total: parseFloat(estimate.grand_total) || 0,
                line_items: lines.map((l) => ({
                  product_id: l.product_id || null,
                  description: l.description || '',
                  quantity: parseFloat(l.quantity) || 1,
                  unit_price: parseFloat(l.unit_price) || 0,
                  tax_id: l.tax_id || null,
                  tax_rate: parseFloat(l.tax_rate) || 0,
                  discount: parseFloat(l.discount) || 0,
                  total: parseFloat(l.total || l.line_total) || 0,
                })),
              };
              await salesOrdersAPI.create(soPayload);
              // Mark estimate as converted
              try { await estimatesAPI.updateStatus(estimateId, 'converted'); } catch (_) {}
              Alert.alert('Success', 'Sales Order created from estimate.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setConverting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  if (!estimate) return <View style={styles.centered}><Text style={styles.emptyText}>Estimate not found</Text></View>;

  const status = estimate.status || 'draft';
  const lines = estimate.line_items || estimate.items || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.docNo}>{estimate.estimate_no || `EST-${estimate.id}`}</Text>
          <StatusBadge status={status} />
        </View>
        <Text style={styles.grandTotal}>{fmt(estimate.grand_total)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Row label="Customer" value={estimate.customer_name || '-'} />
        <Row label="Estimate Date" value={fmtDate(estimate.estimate_date)} />
        <Row label="Expiry Date" value={fmtDate(estimate.expiry_date)} />
      </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Row label="Subtotal" value={fmt(estimate.subtotal)} />
        <Row label="Tax" value={fmt(estimate.tax_amount)} />
        <Row label="Discount" value={fmt(estimate.discount_amount)} />
        <View style={styles.divider} />
        <Row label="Grand Total" value={fmt(estimate.grand_total)} bold />
      </View>

      {estimate.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{estimate.notes}</Text>
        </View>
      ) : null}

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsRow}>
          {status === 'draft' && (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2e7d32' }]} onPress={() => handleStatusChange('approved')}>
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1565c0' }]} onPress={() => handleStatusChange('sent')}>
                <Text style={styles.actionBtnText}>Send</Text>
              </TouchableOpacity>
            </>
          )}
          {(status === 'draft' || status === 'approved' || status === 'sent') && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#6a1b9a' }]}
              onPress={handleConvertToSO}
              disabled={converting}
            >
              <Text style={styles.actionBtnText}>{converting ? 'Converting...' : 'Convert to SO'}</Text>
            </TouchableOpacity>
          )}
          {status === 'draft' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#d32f2f' }]} onPress={() => handleStatusChange('rejected')}>
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {status === 'draft' && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EstimateForm', { estimateId: estimate.id })}
        >
          <Text style={styles.editBtnText}>Edit Estimate</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const Row = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#6a1b9a' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },
  headerCard: { backgroundColor: '#6a1b9a', margin: 12, borderRadius: 12, padding: 20, elevation: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNo: { fontSize: 20, fontWeight: '800', color: '#fff' },
  grandTotal: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 12 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6a1b9a', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  lineLeft: { flex: 1, marginRight: 12 },
  lineName: { fontSize: 13, fontWeight: '600', color: '#333' },
  lineDetail: { fontSize: 11, color: '#888', marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: '#6a1b9a' },
  notes: { fontSize: 13, color: '#666', lineHeight: 20 },
  actionsSection: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, elevation: 2 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  editBtn: { backgroundColor: '#1a237e', marginHorizontal: 12, marginTop: 12, paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default EstimateDetailScreen;
