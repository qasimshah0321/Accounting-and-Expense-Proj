import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
  TouchableOpacity,
} from 'react-native';
import { salesOrdersAPI } from '../../services/api';

const STATUS_COLORS = {
  draft: '#9e9e9e', approved: '#2e7d32', sent: '#1565c0',
  completed: '#00695c', cancelled: '#d32f2f', rejected: '#d32f2f',
  shipped: '#0277bd',
};

const SalesOrderDetailScreen = ({ route, navigation }) => {
  const { salesOrderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await salesOrdersAPI.getById(salesOrderId);
      setOrder(res.data?.sales_order || res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [salesOrderId]);

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const handleStatusChange = async (newStatus, requireReason = false) => {
    if (requireReason) {
      Alert.prompt
        ? Alert.prompt('Reason', 'Enter reason for rejection:', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Submit', onPress: (reason) => doStatusChange(newStatus, reason) },
          ])
        : Alert.alert('Reject', 'Are you sure you want to reject this order?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reject', style: 'destructive', onPress: () => doStatusChange(newStatus, 'Rejected via mobile') },
          ]);
      return;
    }

    Alert.alert('Confirm', `Change status to "${newStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => doStatusChange(newStatus) },
    ]);
  };

  const doStatusChange = async (newStatus, reason) => {
    setActionLoading(true);
    try {
      await salesOrdersAPI.updateStatus(salesOrderId, newStatus, reason);
      Alert.alert('Success', `Status updated to ${newStatus}.`);
      fetchOrder();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  if (!order) return <View style={styles.centered}><Text style={styles.emptyText}>Sales order not found</Text></View>;

  const status = order.status || 'draft';
  const lines = order.line_items || order.items || [];

  // Determine available actions based on status
  const actions = [];
  if (status === 'draft') {
    actions.push({ label: 'Approve', status: 'approved', color: '#2e7d32' });
    actions.push({ label: 'Reject', status: 'rejected', color: '#d32f2f', requireReason: true });
  }
  if (status === 'approved') {
    actions.push({ label: 'Ship', status: 'shipped', color: '#0277bd' });
  }
  if (status === 'shipped' || status === 'approved') {
    actions.push({ label: 'Complete', status: 'completed', color: '#00695c' });
  }
  if (status !== 'cancelled' && status !== 'completed') {
    actions.push({ label: 'Cancel', status: 'cancelled', color: '#d32f2f' });
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.docNo}>{order.so_no || order.sales_order_no || `SO-${order.id}`}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] || '#9e9e9e' }]}>
            <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.grandTotal}>{fmt(order.grand_total)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Row label="Customer" value={order.customer_name || '-'} />
        <Row label="Order Date" value={fmtDate(order.order_date || order.so_date)} />
        <Row label="Delivery Date" value={fmtDate(order.delivery_date || order.expected_date)} />
        <Row label="Reference" value={order.reference_no || '-'} />
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
        <Row label="Subtotal" value={fmt(order.subtotal)} />
        <Row label="Tax" value={fmt(order.tax_amount)} />
        <Row label="Discount" value={fmt(order.discount_amount)} />
        <Row label="Shipping" value={fmt(order.shipping_charges)} />
        <View style={styles.divider} />
        <Row label="Grand Total" value={fmt(order.grand_total)} bold />
      </View>

      {order.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{order.notes}</Text>
        </View>
      ) : null}

      {/* Status Action Buttons */}
      {actions.length > 0 && (
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsRow}>
            {actions.map((act) => (
              <TouchableOpacity
                key={act.status}
                style={[styles.actionBtn, { backgroundColor: act.color }]}
                onPress={() => handleStatusChange(act.status, act.requireReason)}
                disabled={actionLoading}
              >
                <Text style={styles.actionBtnText}>{act.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Edit Button */}
      {status === 'draft' && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('SalesOrderForm', { salesOrderId: order.id })}
        >
          <Text style={styles.editBtnText}>Edit Sales Order</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const Row = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#2e7d32' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },
  headerCard: {
    backgroundColor: '#2e7d32', margin: 12, borderRadius: 12, padding: 20, elevation: 4,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNo: { fontSize: 20, fontWeight: '800', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  grandTotal: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 12 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10,
    padding: 16, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#2e7d32', marginBottom: 10 },
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
  lineTotal: { fontSize: 14, fontWeight: '700', color: '#2e7d32' },
  notes: { fontSize: 13, color: '#666', lineHeight: 20 },
  actionsSection: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10,
    padding: 16, elevation: 2,
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, elevation: 2,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  editBtn: {
    backgroundColor: '#1a237e', marginHorizontal: 12, marginTop: 12, paddingVertical: 14,
    borderRadius: 10, alignItems: 'center', elevation: 2,
  },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default SalesOrderDetailScreen;
