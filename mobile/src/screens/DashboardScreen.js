import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { reportsAPI, customersAPI, vendorsAPI, invoicesAPI, billsAPI } from '../services/api';
import SkeletonLoader from '../components/SkeletonLoader';
import StatusBadge from '../components/StatusBadge';
import { showToast } from '../components/Toast';
import { cache, CACHE_KEYS, TTL } from '../services/cache';

const { width } = Dimensions.get('window');

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const fmt = (val) => {
  const num = parseFloat(val) || 0;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const fmtFull = (val) => {
  const num = parseFloat(val) || 0;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(() => cache.get(CACHE_KEYS.DASHBOARD)?.dash || null);
  const [counts, setCounts] = useState(() => cache.get(CACHE_KEYS.DASHBOARD)?.counts || { customers: 0, vendors: 0 });
  const [recentInvoices, setRecentInvoices] = useState(() => cache.get(CACHE_KEYS.DASHBOARD)?.recentInvoices || []);
  const [recentBills, setRecentBills] = useState(() => cache.get(CACHE_KEYS.DASHBOARD)?.recentBills || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.DASHBOARD));
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, custRes, vendRes, invRes, billRes] = await Promise.all([
        reportsAPI.getDashboard().catch(() => ({ data: {} })),
        customersAPI.getAll().catch(() => ({ data: { customers: [] } })),
        vendorsAPI.getAll().catch(() => ({ data: { vendors: [] } })),
        invoicesAPI.getAll().catch(() => ({ data: { invoices: [] } })),
        billsAPI.getAll().catch(() => ({ data: { bills: [] } })),
      ]);
      const dash = dashRes.data || {};
      const computedCounts = {
        customers: dash.total_customers || custRes.data?.pagination?.total || custRes.data?.customers?.length || 0,
        vendors: dash.total_vendors || vendRes.data?.pagination?.total || vendRes.data?.vendors?.length || 0,
      };
      const invList = invRes.data?.invoices || invRes.data?.items || [];
      const billList = billRes.data?.bills || billRes.data?.items || [];
      const slicedInv = invList.slice(0, 3);
      const slicedBills = billList.slice(0, 2);

      setData(dash);
      setCounts(computedCounts);
      setRecentInvoices(slicedInv);
      setRecentBills(slicedBills);

      // Cache dashboard composite + populate list caches
      cache.set(CACHE_KEYS.DASHBOARD, { dash, counts: computedCounts, recentInvoices: slicedInv, recentBills: slicedBills }, TTL.MEDIUM);
      cache.set(CACHE_KEYS.INVOICES, invList, TTL.SHORT);
      cache.set(CACHE_KEYS.BILLS, billList, TTL.SHORT);
      const custList = custRes.data?.customers || custRes.data?.items || [];
      const vendList = vendRes.data?.vendors || vendRes.data?.items || [];
      cache.set(CACHE_KEYS.CUSTOMERS, custList, TTL.SHORT);
      cache.set(CACHE_KEYS.VENDORS, vendList, TTL.SHORT);
    } catch (err) {
      showToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = cache.get(CACHE_KEYS.DASHBOARD);
      if (cached) {
        setData(cached.dash);
        setCounts(cached.counts);
        setRecentInvoices(cached.recentInvoices);
        setRecentBills(cached.recentBills);
        setLoading(false);
        // Background refresh — no spinner
        fetchData();
      } else {
        setLoading(true);
        fetchData();
      }
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Quick action cards
  const quickActions = [
    { label: '+ Invoice', icon: '\uD83D\uDCC4', color: '#1565c0', bg: '#e3f2fd', onPress: () => navigation.navigate('Sales', { screen: 'InvoiceForm' }) },
    { label: '+ Order', icon: '\uD83D\uDCCB', color: '#2e7d32', bg: '#e8f5e9', onPress: () => navigation.navigate('Sales', { screen: 'SalesOrderForm' }) },
    { label: '+ Bill', icon: '\uD83D\uDCB3', color: '#c62828', bg: '#fce4ec', onPress: () => navigation.navigate('Purchases', { screen: 'BillForm' }) },
    { label: '+ PO', icon: '\uD83D\uDCE6', color: '#e65100', bg: '#fff3e0', onPress: () => navigation.navigate('Purchases', { screen: 'PurchaseOrderForm' }) },
  ];

  if (loading && !refreshing) {
    return (
      <ScrollView style={styles.container}>
        <View style={[styles.welcomeBar, { paddingTop: Math.max(insets.top + 12, 20) }]}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.first_name || 'User'}</Text>
          </View>
        </View>
        <View style={styles.kpiRow}>
          <SkeletonLoader type="kpi" count={2} />
        </View>
        <View style={styles.kpiRow}>
          <SkeletonLoader type="kpi" count={2} />
        </View>
        <SkeletonLoader type="card" count={4} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Bar */}
      <View style={[styles.welcomeBar, { paddingTop: Math.max(insets.top + 12, 20) }]}>
        <View style={styles.welcomeLeft}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{user?.first_name || user?.username || 'User'}</Text>
        </View>
      </View>

      {/* KPI Cards Row 1: Revenue & Expenses */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: '#e8f5e9' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Revenue</Text>
            <View style={[styles.trendBadge, { backgroundColor: '#c8e6c9' }]}>
              <Text style={[styles.trendText, { color: '#2e7d32' }]}>{'\u2191'} MTD</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#2e7d32' }]}>{fmt(data?.month_sales)}</Text>
          <Text style={styles.kpiSub}>This month</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#fce4ec' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Expenses</Text>
            <View style={[styles.trendBadge, { backgroundColor: '#ffcdd2' }]}>
              <Text style={[styles.trendText, { color: '#c62828' }]}>{'\u2193'} MTD</Text>
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#c62828' }]}>{fmt(data?.month_expenses)}</Text>
          <Text style={styles.kpiSub}>This month</Text>
        </View>
      </View>

      {/* KPI Cards Row 2: Receivables & Payables */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: '#e3f2fd' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Receivables</Text>
            <Text style={styles.kpiCount}>{data?.open_invoices || 0} open</Text>
          </View>
          <Text style={[styles.kpiValue, { color: '#1565c0' }]}>{fmt(data?.total_receivables)}</Text>
          <Text style={styles.kpiSub}>Outstanding</Text>
        </View>
        <View style={[styles.kpiCard, { backgroundColor: '#fff3e0' }]}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Payables</Text>
            <Text style={[styles.kpiCount, { color: '#e65100' }]}>{data?.overdue_bills || 0} overdue</Text>
          </View>
          <Text style={[styles.kpiValue, { color: '#e65100' }]}>{fmt(data?.total_payables)}</Text>
          <Text style={styles.kpiSub}>Outstanding</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsRow}
      >
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={[styles.quickActionCard, { backgroundColor: action.bg }]}
            onPress={action.onPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={styles.quickActionIcon}>{action.icon}</Text>
            <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary Counters */}
      <View style={styles.countersRow}>
        <TouchableOpacity
          style={[styles.counterCard, { backgroundColor: '#f3e5f5' }]}
          onPress={() => navigation.navigate('Customers')}
          activeOpacity={0.7}
        >
          <Text style={[styles.counterValue, { color: '#6a1b9a' }]}>{counts.customers}</Text>
          <Text style={styles.counterLabel}>Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.counterCard, { backgroundColor: '#e0f2f1' }]}
          onPress={() => navigation.navigate('Customers')}
          activeOpacity={0.7}
        >
          <Text style={[styles.counterValue, { color: '#00695c' }]}>{counts.vendors}</Text>
          <Text style={styles.counterLabel}>Vendors</Text>
        </TouchableOpacity>
        <View style={[styles.counterCard, { backgroundColor: '#e3f2fd' }]}>
          <Text style={[styles.counterValue, { color: '#1565c0' }]}>{data?.open_invoices || 0}</Text>
          <Text style={styles.counterLabel}>Open Inv.</Text>
        </View>
        <View style={[styles.counterCard, { backgroundColor: '#fff3e0' }]}>
          <Text style={[styles.counterValue, { color: '#e65100' }]}>{data?.overdue_bills || 0}</Text>
          <Text style={styles.counterLabel}>Overdue</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>
      <View style={styles.activitySection}>
        {recentInvoices.length === 0 && recentBills.length === 0 ? (
          <View style={styles.noActivity}>
            <Text style={styles.noActivityText}>No recent transactions</Text>
          </View>
        ) : null}
        {recentInvoices.map((inv) => (
          <TouchableOpacity
            key={`inv-${inv.id}`}
            style={styles.activityCard}
            onPress={() => navigation.getParent?.()?.navigate?.('InvoiceDetail', { invoiceId: inv.id }) || navigation.navigate('Sales', { screen: 'InvoiceList' })}
            activeOpacity={0.7}
          >
            <View style={[styles.activityIcon, { backgroundColor: '#e3f2fd' }]}>
              <Text style={styles.activityIconText}>{'\u2191'}</Text>
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {inv.invoice_no || `INV-${inv.id}`}
              </Text>
              <Text style={styles.activitySub} numberOfLines={1}>
                {inv.customer_name || 'Customer'} {'\u2022'} {fmtDate(inv.invoice_date)}
              </Text>
            </View>
            <View style={styles.activityRight}>
              <Text style={styles.activityAmount}>{fmtFull(inv.grand_total)}</Text>
              <StatusBadge status={inv.status} />
            </View>
          </TouchableOpacity>
        ))}
        {recentBills.map((bill) => (
          <TouchableOpacity
            key={`bill-${bill.id}`}
            style={styles.activityCard}
            onPress={() => navigation.getParent?.()?.navigate?.('BillDetail', { billId: bill.id }) || navigation.navigate('Purchases', { screen: 'BillList' })}
            activeOpacity={0.7}
          >
            <View style={[styles.activityIcon, { backgroundColor: '#fce4ec' }]}>
              <Text style={styles.activityIconText}>{'\u2193'}</Text>
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {bill.bill_no || `BILL-${bill.id}`}
              </Text>
              <Text style={styles.activitySub} numberOfLines={1}>
                {bill.vendor_name || 'Vendor'} {'\u2022'} {fmtDate(bill.bill_date)}
              </Text>
            </View>
            <View style={styles.activityRight}>
              <Text style={styles.activityAmount}>{fmtFull(bill.total_amount)}</Text>
              <StatusBadge status={bill.status} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  // --- Welcome Bar ---
  welcomeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a237e',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  welcomeLeft: {},
  greeting: { color: '#9fa8da', fontSize: 14, fontWeight: '500' },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  // --- KPI Cards ---
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 12,
  },
  kpiCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiCount: { fontSize: 10, fontWeight: '600', color: '#888' },
  trendBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: { fontSize: 10, fontWeight: '700' },
  kpiValue: { fontSize: 24, fontWeight: '800' },
  kpiSub: { fontSize: 11, color: '#888', marginTop: 4 },
  // --- Quick Actions ---
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  quickActionsRow: {
    paddingHorizontal: 12,
    gap: 10,
  },
  quickActionCard: {
    width: (width - 72) / 4,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionIcon: { fontSize: 24, marginBottom: 6 },
  quickActionLabel: { fontSize: 11, fontWeight: '700' },
  // --- Counters ---
  countersRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 8,
  },
  counterCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  counterValue: { fontSize: 20, fontWeight: '800' },
  counterLabel: { fontSize: 10, fontWeight: '600', color: '#888', marginTop: 4 },
  // --- Recent Activity ---
  activitySection: {
    paddingHorizontal: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIconText: { fontSize: 18, fontWeight: '700', color: '#555' },
  activityInfo: { flex: 1, marginRight: 8 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  activitySub: { fontSize: 12, color: '#888', marginTop: 2 },
  activityRight: { alignItems: 'flex-end' },
  activityAmount: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  noActivity: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noActivityText: { color: '#999', fontSize: 14 },
});

export default DashboardScreen;
