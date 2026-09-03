import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { reportsAPI } from '../../services/api';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const AgingPayablesScreen = () => {
  const [asOf, setAsOf] = useState(today());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.getPayablesAging(asOf);
      setData(res.data || res);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || data?.summary || {};
  const vendors = data?.vendors || data?.items || [];
  const totalOutstanding = parseFloat(totals.total || totals.total_outstanding || 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.filter}>
        <Text style={styles.label}>As Of Date</Text>
        <TextInput style={styles.input} value={asOf} onChangeText={setAsOf} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
        <TouchableOpacity style={styles.applyBtn} onPress={load}><Text style={styles.applyTxt}>Refresh</Text></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e65100" style={{ marginTop: 30 }} />
      ) : (
        <>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Outstanding (Payables)</Text>
            <Text style={styles.totalVal}>{fmt(totalOutstanding)}</Text>
          </View>

          <View style={styles.bucketRow}>
            <Bucket label="Current" value={totals.current} color="#2e7d32" />
            <Bucket label="1-30" value={totals['1_30'] || totals.days_1_30} color="#fbc02d" />
            <Bucket label="31-60" value={totals['31_60'] || totals.days_31_60} color="#f57c00" />
          </View>
          <View style={styles.bucketRow}>
            <Bucket label="61-90" value={totals['61_90'] || totals.days_61_90} color="#e64a19" />
            <Bucket label="90+" value={totals['90_plus'] || totals.days_over_90} color="#c62828" />
            <View style={{ flex: 1 }} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Vendor</Text>
            {vendors.length === 0 ? (
              <Text style={styles.empty}>No outstanding payables</Text>
            ) : vendors.map((v, idx) => {
              const isOpen = !!expanded[idx];
              const bills = v.bills || v.open_bills || [];
              return (
                <View key={idx} style={styles.vendCard}>
                  <TouchableOpacity onPress={() => setExpanded((x) => ({ ...x, [idx]: !isOpen }))}>
                    <View style={styles.vendHeader}>
                      <Text style={styles.vendName} numberOfLines={1}>{v.vendor_name || v.name || 'Unknown'}</Text>
                      <Text style={styles.vendTotal}>{fmt(v.total || v.total_outstanding)}</Text>
                    </View>
                    <View style={styles.vendBuckets}>
                      <MiniBucket label="Cur" value={v.current} />
                      <MiniBucket label="1-30" value={v['1_30'] || v.days_1_30} />
                      <MiniBucket label="31-60" value={v['31_60'] || v.days_31_60} />
                      <MiniBucket label="61-90" value={v['61_90'] || v.days_61_90} />
                      <MiniBucket label="90+" value={v['90_plus'] || v.days_over_90} />
                    </View>
                  </TouchableOpacity>
                  {isOpen && bills.length > 0 && (
                    <View style={styles.invList}>
                      {bills.map((b, ii) => (
                        <View key={ii} style={styles.invRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.invNo}>{b.bill_no || b.document_no}</Text>
                            <Text style={styles.invDate}>{fmtDate(b.bill_date || b.date)} • Due {fmtDate(b.due_date)}</Text>
                          </View>
                          <Text style={styles.invAmt}>{fmt(b.amount_due || b.balance)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={{ height: 30 }} />
        </>
      )}
    </ScrollView>
  );
};

const Bucket = ({ label, value, color }) => (
  <View style={[styles.bucket, { borderLeftColor: color }]}>
    <Text style={styles.bucketLabel}>{label}</Text>
    <Text style={[styles.bucketVal, { color }]}>{fmt(value)}</Text>
  </View>
);

const MiniBucket = ({ label, value }) => (
  <View style={styles.miniBucket}>
    <Text style={styles.miniLabel}>{label}</Text>
    <Text style={styles.miniVal}>{parseFloat(value || 0) > 0 ? fmt(value) : '-'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  filter: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 14, elevation: 2 },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14 },
  applyBtn: { backgroundColor: '#e65100', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  applyTxt: { color: '#fff', fontWeight: '700' },
  totalCard: { backgroundColor: '#e65100', margin: 12, borderRadius: 12, padding: 18, elevation: 3 },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  totalVal: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  bucketRow: { flexDirection: 'row', marginHorizontal: 8 },
  bucket: { flex: 1, backgroundColor: '#fff', margin: 4, padding: 12, borderRadius: 8, borderLeftWidth: 4, elevation: 1 },
  bucketLabel: { fontSize: 11, color: '#888' },
  bucketVal: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 14, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#e65100', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#999', padding: 20 },
  vendCard: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 10 },
  vendHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  vendName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#333' },
  vendTotal: { fontSize: 14, fontWeight: '800', color: '#c62828' },
  vendBuckets: { flexDirection: 'row', marginTop: 6 },
  miniBucket: { flex: 1 },
  miniLabel: { fontSize: 10, color: '#888' },
  miniVal: { fontSize: 11, color: '#333', fontWeight: '600', marginTop: 2 },
  invList: { marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#e0e0e0' },
  invRow: { flexDirection: 'row', paddingVertical: 4 },
  invNo: { fontSize: 12, fontWeight: '700', color: '#e65100' },
  invDate: { fontSize: 10, color: '#888', marginTop: 1 },
  invAmt: { fontSize: 12, fontWeight: '700', color: '#333' },
});

export default AgingPayablesScreen;
