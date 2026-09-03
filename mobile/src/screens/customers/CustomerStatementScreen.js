import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { customersAPI } from '../../services/api';

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const fmt = (v) => {
  const n = parseFloat(v || 0);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const CustomerStatementScreen = ({ route, navigation }) => {
  const { customerId, customerName } = route.params || {};
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: customerName ? `${customerName} Statement` : 'Customer Statement' });
  }, [customerName, navigation]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customersAPI.getStatement(customerId, startDate, endDate);
      setData(res.data || res);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [customerId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const opening = parseFloat(data?.opening_balance || 0);
  const closing = parseFloat(data?.closing_balance || 0);
  const transactions = data?.transactions || [];
  const aging = data?.aging || {};

  // Running balance calculation
  let running = opening;
  const rows = transactions.map((t) => {
    const debit = parseFloat(t.debit || 0);
    const credit = parseFloat(t.credit || 0);
    running = running + debit - credit;
    return { ...t, debit, credit, running };
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Date Range</Text>
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>From</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>To</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />
          </View>
        </View>
        <TouchableOpacity style={styles.applyBtn} onPress={load}>
          <Text style={styles.applyTxt}>Apply</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 30 }} />
      ) : (
        <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#1a237e' }]}>
              <Text style={styles.summaryLabel}>Opening Balance</Text>
              <Text style={styles.summaryVal}>{fmt(opening)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#2e7d32' }]}>
              <Text style={styles.summaryLabel}>Closing Balance</Text>
              <Text style={styles.summaryVal}>{fmt(closing)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transactions</Text>
            {rows.length === 0 ? (
              <Text style={styles.empty}>No transactions in this period</Text>
            ) : (
              <>
                <View style={styles.txHeader}>
                  <Text style={[styles.txHeadCell, { flex: 1.4 }]}>Date</Text>
                  <Text style={[styles.txHeadCell, { flex: 2 }]}>Ref / Type</Text>
                  <Text style={[styles.txHeadCell, { flex: 1.3, textAlign: 'right' }]}>Debit</Text>
                  <Text style={[styles.txHeadCell, { flex: 1.3, textAlign: 'right' }]}>Credit</Text>
                  <Text style={[styles.txHeadCell, { flex: 1.4, textAlign: 'right' }]}>Balance</Text>
                </View>
                {rows.map((t, i) => (
                  <View key={i} style={styles.txRow}>
                    <Text style={[styles.txCell, { flex: 1.4 }]}>{fmtDate(t.date || t.transaction_date)}</Text>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.txCell} numberOfLines={1}>{t.reference || t.reference_no || '-'}</Text>
                      <Text style={styles.txType}>{t.type || (t.debit > 0 ? 'Invoice' : 'Payment')}</Text>
                    </View>
                    <Text style={[styles.txCell, { flex: 1.3, textAlign: 'right', color: '#c62828' }]}>
                      {t.debit ? fmt(t.debit) : '-'}
                    </Text>
                    <Text style={[styles.txCell, { flex: 1.3, textAlign: 'right', color: '#2e7d32' }]}>
                      {t.credit ? fmt(t.credit) : '-'}
                    </Text>
                    <Text style={[styles.txCell, { flex: 1.4, textAlign: 'right', fontWeight: '700' }]}>
                      {fmt(t.running)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aging Summary</Text>
            <AgingRow label="Current" value={aging.current} />
            <AgingRow label="1 - 30 days" value={aging['1_30'] || aging.days_1_30} />
            <AgingRow label="31 - 60 days" value={aging['31_60'] || aging.days_31_60} />
            <AgingRow label="61 - 90 days" value={aging['61_90'] || aging.days_61_90} />
            <AgingRow label="90+ days" value={aging['90_plus'] || aging.days_over_90} />
          </View>

          <View style={{ height: 30 }} />
        </>
      )}
    </ScrollView>
  );
};

const AgingRow = ({ label, value }) => (
  <View style={styles.agingRow}>
    <Text style={styles.agingLabel}>{label}</Text>
    <Text style={styles.agingValue}>{fmt(value)}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  filterCard: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 16, elevation: 2 },
  filterTitle: { fontSize: 14, fontWeight: '700', color: '#1a237e', marginBottom: 8 },
  dateRow: { flexDirection: 'row' },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  applyBtn: { backgroundColor: '#1a237e', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  applyTxt: { color: '#fff', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 6 },
  summaryCard: { flex: 1, padding: 14, borderRadius: 10, margin: 4, elevation: 2 },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  summaryVal: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 12, borderRadius: 10, padding: 14, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1a237e', marginBottom: 10 },
  txHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 6, marginBottom: 4 },
  txHeadCell: { fontSize: 11, fontWeight: '700', color: '#666' },
  txRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  txCell: { fontSize: 12, color: '#333' },
  txType: { fontSize: 10, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', padding: 20 },
  agingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  agingLabel: { fontSize: 13, color: '#555' },
  agingValue: { fontSize: 13, fontWeight: '700', color: '#333' },
});

export default CustomerStatementScreen;
