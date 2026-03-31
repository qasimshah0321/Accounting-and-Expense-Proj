import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { reportsAPI } from '../../services/api';

const RANGES = ['This Month', 'Last Month', 'This Quarter', 'This Year'];

function getDateRange(label) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (label === 'This Month') return { start: new Date(y, m, 1), end: new Date(y, m+1, 0) };
  if (label === 'Last Month') return { start: new Date(y, m-1, 1), end: new Date(y, m, 0) };
  if (label === 'This Quarter') {
    const q = Math.floor(m / 3);
    return { start: new Date(y, q*3, 1), end: new Date(y, q*3+3, 0) };
  }
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
}

const fmt = (d) => d.toISOString().slice(0,10);

export default function ReportsScreen() {
  const [tab, setTab] = useState('P&L');
  const [range, setRange] = useState('This Month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const { start, end } = getDateRange(range);
      const params = `start_date=${fmt(start)}&end_date=${fmt(end)}`;
      let res;
      if (tab === 'P&L') res = await reportsAPI.getProfitLoss(params);
      else if (tab === 'Sales') res = await reportsAPI.getSalesSummary(params);
      else res = await reportsAPI.getPurchasesSummary(params);
      setData(res.data || res);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); setRefreshing(false); }
  }, [tab, range]);

  React.useEffect(() => { load(); }, [tab, range]);

  const Card = ({ label, value, color = '#1a237e' }) => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );

  const renderPL = () => {
    if (!data) return null;
    const revenue = parseFloat(data.total_revenue || data.revenue || 0);
    const expenses = parseFloat(data.total_expenses || data.expenses || 0);
    const net = revenue - expenses;
    return (
      <>
        <Card label="Total Revenue" value={`$${revenue.toFixed(2)}`} color="#2e7d32" />
        <Card label="Total Expenses" value={`$${expenses.toFixed(2)}`} color="#c62828" />
        <Card label="Net Income" value={`$${net.toFixed(2)}`} color={net >= 0 ? '#1a237e' : '#c62828'} />
        {data.revenue_breakdown && Object.entries(data.revenue_breakdown).map(([k, v]) => (
          <View key={k} style={styles.row}><Text style={styles.rowLabel}>{k}</Text><Text style={styles.rowValue}>${parseFloat(v).toFixed(2)}</Text></View>
        ))}
      </>
    );
  };

  const renderSales = () => {
    if (!data) return null;
    const total = parseFloat(data.total_sales || data.total || 0);
    const count = data.invoice_count || data.count || 0;
    return (
      <>
        <Card label="Total Sales" value={`$${total.toFixed(2)}`} color="#2e7d32" />
        <Card label="Invoice Count" value={String(count)} />
        {(data.by_customer || data.customers || []).slice(0,10).map((c, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.rowLabel}>{c.customer_name || c.name}</Text>
            <Text style={styles.rowValue}>${parseFloat(c.total || 0).toFixed(2)}</Text>
          </View>
        ))}
      </>
    );
  };

  const renderPurchases = () => {
    if (!data) return null;
    const total = parseFloat(data.total_purchases || data.total || 0);
    const count = data.bill_count || data.count || 0;
    return (
      <>
        <Card label="Total Purchases" value={`$${total.toFixed(2)}`} color="#e65100" />
        <Card label="Bill Count" value={String(count)} />
        {(data.by_vendor || data.vendors || []).slice(0,10).map((v, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.rowLabel}>{v.vendor_name || v.name}</Text>
            <Text style={styles.rowValue}>${parseFloat(v.total || 0).toFixed(2)}</Text>
          </View>
        ))}
      </>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabs}>
        {['P&L', 'Sales', 'Purchases'].map(t => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date range */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangeBar} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {RANGES.map(r => (
          <TouchableOpacity key={r} style={[styles.rangeChip, range === r && styles.rangeActive]} onPress={() => setRange(r)}>
            <Text style={[styles.rangeTxt, range === r && styles.rangeTxtActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {loading ? (
          <ActivityIndicator size="large" color="#1a237e" style={{ marginTop: 60 }} />
        ) : (
          <>
            <Text style={styles.periodLabel}>{range} Report</Text>
            {tab === 'P&L' && renderPL()}
            {tab === 'Sales' && renderSales()}
            {tab === 'Purchases' && renderPurchases()}
            {!data && !loading && <Text style={styles.empty}>No data available</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabs: { flexDirection: 'row', backgroundColor: '#1a237e' },
  tabBtn: { flex: 1, padding: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#fff' },
  tabTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' },
  tabTxtActive: { color: '#fff' },
  rangeBar: { backgroundColor: '#fff', paddingVertical: 8, maxHeight: 50 },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e8eaf6', marginRight: 8 },
  rangeActive: { backgroundColor: '#1a237e' },
  rangeTxt: { color: '#1a237e', fontSize: 13, fontWeight: '600' },
  rangeTxtActive: { color: '#fff' },
  periodLabel: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, elevation: 2 },
  cardLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 6 },
  rowLabel: { fontSize: 14, color: '#333', flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#1a237e' },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', fontSize: 15 },
});
