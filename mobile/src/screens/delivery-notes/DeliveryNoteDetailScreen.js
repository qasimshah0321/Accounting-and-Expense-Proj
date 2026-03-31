import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { deliveryNotesAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const DeliveryNoteDetailScreen = ({ route, navigation }) => {
  const { deliveryNoteId } = route.params;
  const [dn, setDn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await deliveryNotesAPI.getById(deliveryNoteId);
        setDn(res.data?.delivery_note || res.data);
      } catch (err) {
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [deliveryNoteId]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  if (!dn) return <View style={styles.centered}><Text style={styles.emptyText}>Delivery note not found</Text></View>;

  const lines = dn.line_items || dn.items || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.docNo}>{dn.delivery_note_no || dn.dn_no || `DN-${dn.id}`}</Text>
          <StatusBadge status={dn.status || 'draft'} />
        </View>
        <Text style={styles.subInfo}>{dn.customer_name || 'Unknown Customer'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Row label="Customer" value={dn.customer_name || '-'} />
        <Row label="Delivery Date" value={fmtDate(dn.delivery_date)} />
        <Row label="SO Reference" value={dn.so_no || dn.sales_order_id || '-'} />
        <Row label="Shipping Address" value={dn.shipping_address || '-'} />
      </View>

      {lines.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.lineItem}>
              <View style={styles.lineLeft}>
                <Text style={styles.lineName}>{line.product_name || line.description || `Item ${idx + 1}`}</Text>
                <Text style={styles.lineDetail}>{line.description || ''}</Text>
              </View>
              <Text style={styles.lineQty}>Qty: {line.quantity}</Text>
            </View>
          ))}
        </View>
      )}

      {dn.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{dn.notes}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate('DeliveryNoteForm', { deliveryNoteId: dn.id })}
      >
        <Text style={styles.editBtnText}>Edit Delivery Note</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 14 },
  headerCard: { backgroundColor: '#00695c', margin: 12, borderRadius: 12, padding: 20, elevation: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docNo: { fontSize: 20, fontWeight: '800', color: '#fff' },
  subInfo: { fontSize: 16, color: '#e0f2f1', marginTop: 8 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#00695c', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600', flex: 1, textAlign: 'right' },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  lineLeft: { flex: 1, marginRight: 12 },
  lineName: { fontSize: 13, fontWeight: '600', color: '#333' },
  lineDetail: { fontSize: 11, color: '#888', marginTop: 2 },
  lineQty: { fontSize: 14, fontWeight: '700', color: '#00695c' },
  notes: { fontSize: 13, color: '#666', lineHeight: 20 },
  editBtn: { backgroundColor: '#1a237e', marginHorizontal: 12, marginTop: 12, paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default DeliveryNoteDetailScreen;
