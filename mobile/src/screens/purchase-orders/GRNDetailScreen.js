import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { grnAPI } from '../../services/api';

const STATUS_COLORS = {
  draft: '#9e9e9e', submitted: '#1565c0', received: '#2e7d32', cancelled: '#d32f2f',
};

const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const GRNDetailScreen = ({ route, navigation }) => {
  const { grnId } = route.params || {};
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await grnAPI.getById(grnId);
      setGrn(res.data?.goods_received_note || res.data?.grn || res.data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); }
  }, [grnId]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const doSubmit = async () => {
    try {
      setWorking(true);
      await grnAPI.updateStatus(grnId, 'submitted');
      Alert.alert('Success', 'GRN submitted');
      load();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setWorking(false); }
  };

  const doReceive = async () => {
    Alert.alert('Receive Goods', 'Mark goods as received?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Receive', onPress: async () => {
          try {
            setWorking(true);
            await grnAPI.receiveGoods(grnId, { received_date: new Date().toISOString().slice(0, 10) });
            Alert.alert('Success', 'Goods received');
            load();
          } catch (e) { Alert.alert('Error', e.message); }
          finally { setWorking(false); }
        }
      }
    ]);
  };

  const doConvertToBill = async () => {
    Alert.alert('Convert to Bill', 'Create a bill from this GRN?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create Bill', onPress: async () => {
          try {
            setWorking(true);
            await grnAPI.convertToBill(grnId, { bill_date: new Date().toISOString().slice(0, 10) });
            Alert.alert('Success', 'Bill created from GRN');
            navigation.goBack();
          } catch (e) { Alert.alert('Error', e.message); }
          finally { setWorking(false); }
        }
      }
    ]);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#e65100" /></View>;
  if (!grn) return <View style={styles.centered}><Text style={styles.empty}>GRN not found</Text></View>;

  const status = grn.status || 'draft';
  const lines = grn.line_items || grn.items || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.docNo}>{grn.grn_no || `GRN-${grn.id}`}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] || '#9e9e9e' }]}>
            <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.grandTotal}>{fmt(grn.grand_total)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Row label="Vendor" value={grn.vendor_name || '-'} />
        <Row label="PO Reference" value={grn.po_no || grn.purchase_order_no || '-'} />
        <Row label="GRN Date" value={fmtDate(grn.grn_date)} />
        <Row label="Expected Delivery" value={fmtDate(grn.expected_delivery_date)} />
        <Row label="Received Date" value={fmtDate(grn.received_date)} />
      </View>

      {lines.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {lines.map((l, i) => (
            <View key={i} style={styles.lineItem}>
              <View style={styles.lineLeft}>
                <Text style={styles.lineName} numberOfLines={1}>
                  {l.product_name || l.description || `Item ${i + 1}`}
                </Text>
                <Text style={styles.lineDetail}>
                  Qty: {l.received_qty || l.quantity} x {fmt(l.rate || l.unit_price)}
                </Text>
              </View>
              <Text style={styles.lineTotal}>{fmt(l.total || l.line_total)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <Row label="Subtotal" value={fmt(grn.subtotal)} />
        <Row label="Tax" value={fmt(grn.tax_amount)} />
        <Row label="Discount" value={fmt(grn.discount_amount)} />
        <View style={styles.divider} />
        <Row label="Grand Total" value={fmt(grn.grand_total)} bold />
      </View>

      {grn.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{grn.notes}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {status === 'draft' && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#1565c0' }]} onPress={doSubmit} disabled={working}>
            <Text style={styles.btnText}>Submit</Text>
          </TouchableOpacity>
        )}
        {status === 'submitted' && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#2e7d32' }]} onPress={doReceive} disabled={working}>
            <Text style={styles.btnText}>Receive Goods</Text>
          </TouchableOpacity>
        )}
        {(status === 'submitted' || status === 'received') && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#e65100' }]} onPress={doConvertToBill} disabled={working}>
            <Text style={styles.btnText}>Convert to Bill</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const Row = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#e65100' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#999' },
  headerCard: { backgroundColor: '#e65100', margin: 12, borderRadius: 12, padding: 20, elevation: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNo: { fontSize: 20, fontWeight: '800', color: '#fff' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  grandTotal: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 12 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#e65100', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  lineLeft: { flex: 1, marginRight: 12 },
  lineName: { fontSize: 13, fontWeight: '600', color: '#333' },
  lineDetail: { fontSize: 11, color: '#888', marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: '#e65100' },
  notes: { fontSize: 13, color: '#666', lineHeight: 20 },
  actions: { marginHorizontal: 12, marginTop: 12, gap: 10 },
  btn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2, marginBottom: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default GRNDetailScreen;
