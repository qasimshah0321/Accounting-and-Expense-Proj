import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { reportsAPI } from '../../services/api';

const today = () => new Date().toISOString().slice(0, 10);
const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const AgingReceivablesScreen = () => {
  const [asOf, setAsOf] = useState(today());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await reportsAPI.getReceivablesAging(asOf);
      setData(res.data || res);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || data?.summary || {};
  const customers = data?.customers || data?.items || [];
  const totalOutstanding = parseFloat(totals.total || totals.total_outstanding || 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.filter}>
        <Text style={styles.label}>As Of Date</Text>
        <TextInput style={styles.input} value={asOf} onChangeText={setAsOf} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
        <TouchableOpacity style={styles.applyBtn} onPress={load}><Text style={styles.applyTxt}>Refresh</Text></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 30 }} />
      ) : (
        <>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Outstanding</Text>
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
            <Text style={styles.sectionTitle}>By Customer</Text>
            {customers.length === 0 ? (
              <Text style={styles.empty}>No outstanding receivables</Text>
            ) : customers.map((c, idx) => {
              const isOpen = !!expanded[idx];
              const invoices = c.invoices || c.open_invoices || [];
              return (
                <View key={idx} style={styles.custCard}>
                  <TouchableOpacity onPress={() => setExpanded((x) => ({ ...x, [idx]: !isOpen }))}>
                    <View style={styles.custHeader}>
                      <Text style={styles.custName} numberOfLines={1}>{c.customer_name || c.name || 'Unknown'}</Text>
                      <Text style={styles.custTotal}>{fmt(c.total || c.total_outstanding)}</Text>
                    </View>
                    <View style={styles.custBuckets}>
                      <MiniBucket label="Cur" value={c.current} />
                      <MiniBucket label="1-30" value={c['1_30'] || c.days_1_30} />
                      <MiniBucket label="31-60" value={c['31_60'] || c.days_31_60} />
                      <MiniBucket label="61-90" value={c['61_90'] || c.days_61_90} />
                      <MiniBucket label="90+" value={c['90_plus'] || c.days_over_90} />
                    </View>
                  </TouchableOpacity>
                  {isOpen && invoices.length > 0 && (
                    <View style={styles.invList}>
                      {invoices.map((inv, ii) => (
                        <View key={ii} style={styles.invRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.invNo}>{inv.invoice_no || inv.document_no}</Text>
                            <Text style={styles.invDate}>{fmtDate(inv.invoice_date || inv.date)} • Due {fmtDate(inv.due_date)}</Text>
                          </View>
                          <Text style={styles.invAmt}>{fmt(inv.amount_due || inv.balance)}</Text>
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
  applyBtn: { backgroundColor: '#1a237e', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  applyTxt: { color: '#fff', fontWeight: '700' },
  totalCard: { backgroundColor: '#1a237e', margin: 12, borderRadius: 12, padding: 18, elevation: 3 },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  totalVal: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  bucketRow: { flexDirection: 'row', marginHorizontal: 8 },
  bucket: { flex: 1, backgroundColor: '#fff', margin: 4, padding: 12, borderRadius: 8, borderLeftWidth: 4, elevation: 1 },
  bucketLabel: { fontSize: 11, color: '#888' },
  bucketVal: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 14, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a237e', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#999', padding: 20 },
  custCard: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 10 },
  custHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  custName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#333' },
  custTotal: { fontSize: 14, fontWeight: '800', color: '#c62828' },
  custBuckets: { flexDirection: 'row', marginTop: 6 },
  miniBucket: { flex: 1 },
  miniLabel: { fontSize: 10, color: '#888' },
  miniVal: { fontSize: 11, color: '#333', fontWeight: '600', marginTop: 2 },
  invList: { marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#e0e0e0' },
  invRow: { flexDirection: 'row', paddingVertical: 4 },
  invNo: { fontSize: 12, fontWeight: '700', color: '#1a237e' },
  invDate: { fontSize: 10, color: '#888', marginTop: 1 },
  invAmt: { fontSize: 12, fontWeight: '700', color: '#333' },
});

export default AgingReceivablesScreen;
