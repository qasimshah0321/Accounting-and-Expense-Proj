import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { billsAPI } from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { showToast } from '../../components/Toast';
import { SkeletonCard } from '../../components/SkeletonLoader';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

const STATUS_COLORS = {
  draft: '#9e9e9e', approved: '#1565c0', posted: '#2e7d32', cancelled: '#d32f2f',
};
const PAYMENT_COLORS = {
  unpaid: '#e65100', partially_paid: '#f9a825', paid: '#2e7d32', overdue: '#d32f2f',
};

const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const BillListScreen = ({ navigation }) => {
  const [bills, setBills] = useState(() => cache.get(CACHE_KEYS.BILLS) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.BILLS));
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchBills = useCallback(async () => {
    try {
      const res = await billsAPI.getAll();
      const list = res.data?.bills || res.data?.items || [];
      cache.set(CACHE_KEYS.BILLS, list, TTL.SHORT);
      setBills(list);
    } catch (err) {
      showToast(err.message || 'Failed to load bills', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = cache.get(CACHE_KEYS.BILLS);
      if (cached) {
        setBills(cached);
        setLoading(false);
        billsAPI.getAll()
          .then(res => {
            const list = res.data?.bills || res.data?.items || [];
            cache.set(CACHE_KEYS.BILLS, list, TTL.SHORT);
            setBills(list);
          })
          .catch(() => {});
      } else {
        setLoading(true);
        fetchBills();
      }
    }, [fetchBills])
  );

  const onRefresh = () => { setRefreshing(true); fetchBills(); };

  const filtered = search.trim()
    ? bills.filter(b => {
        const s = search.toLowerCase();
        return (b.bill_no || '').toLowerCase().includes(s) ||
               (b.vendor_name || '').toLowerCase().includes(s);
      })
    : bills;

  const renderItem = ({ item }) => {
    const status = item.status || 'draft';
    const payStatus = item.payment_status || 'unpaid';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.getParent()?.navigate('BillDetail', { billId: item.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Bill ${item.bill_no}, ${item.vendor_name}`}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.docNo}>{item.bill_no || `BILL-${item.id}`}</Text>
          <Text style={styles.vendor} numberOfLines={1}>{item.vendor_name || 'Unknown Vendor'}</Text>
          <Text style={styles.date}>{fmtDate(item.bill_date)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.amount}>{fmt(item.total_amount)}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] || '#9e9e9e' }]}>
              <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: PAYMENT_COLORS[payStatus] || '#9e9e9e', marginLeft: 4 }]}>
              <Text style={styles.badgeText}>{payStatus.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput style={styles.searchInput} placeholder="Search bills..." placeholderTextColor="#999" editable={false} />
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar - outside FlatList to prevent re-mount on keystroke */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search bills..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          accessibilityLabel="Search bills"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>{'\u2715'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <EmptyState
            type="bills"
            title={search ? 'No results found' : 'No bills yet'}
            subtitle={search ? `No bills matching "${search}"` : 'Create your first bill to get started'}
            buttonLabel={search ? undefined : '+ New Bill'}
            onButtonPress={search ? undefined : () => navigation.navigate('BillForm', {})}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BillForm', {})}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create new bill"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  emptyContainer: { flexGrow: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 80 },
  skeletonList: { paddingHorizontal: 12, paddingTop: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: { flex: 1, paddingVertical: 11, fontSize: 14, color: '#333' },
  clearBtn: { padding: 4 },
  clearText: { color: '#999', fontSize: 14, fontWeight: '600' },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  docNo: { fontSize: 15, fontWeight: '700', color: '#c62828' },
  vendor: { fontSize: 13, color: '#555', marginTop: 2 },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#333' },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#c62828', width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 5,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});

export default BillListScreen;
