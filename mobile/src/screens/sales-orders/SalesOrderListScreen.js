import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { salesOrdersAPI } from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { showToast } from '../../components/Toast';
import { SkeletonCard } from '../../components/SkeletonLoader';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

const STATUS_COLORS = {
  draft: '#9e9e9e', approved: '#2e7d32', sent: '#1565c0',
  completed: '#00695c', cancelled: '#d32f2f',
};

const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const SalesOrderListScreen = ({ navigation }) => {
  const [orders, setOrders] = useState(() => cache.get(CACHE_KEYS.SALES_ORDERS) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.SALES_ORDERS));
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await salesOrdersAPI.getAll();
      const list = res.data?.sales_orders || res.data?.items || [];
      cache.set(CACHE_KEYS.SALES_ORDERS, list, TTL.SHORT);
      setOrders(list);
    } catch (err) {
      showToast(err.message || 'Failed to load sales orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = cache.get(CACHE_KEYS.SALES_ORDERS);
      if (cached) {
        setOrders(cached);
        setLoading(false);
        salesOrdersAPI.getAll()
          .then(res => {
            const list = res.data?.sales_orders || res.data?.items || [];
            cache.set(CACHE_KEYS.SALES_ORDERS, list, TTL.SHORT);
            setOrders(list);
          })
          .catch(() => {});
      } else {
        setLoading(true);
        fetchOrders();
      }
    }, [fetchOrders])
  );

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  const filtered = search.trim()
    ? orders.filter(o => {
        const s = search.toLowerCase();
        return (o.so_no || o.sales_order_no || '').toLowerCase().includes(s) ||
               (o.customer_name || '').toLowerCase().includes(s);
      })
    : orders;

  const renderItem = ({ item }) => {
    const status = item.status || 'draft';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          const parent = navigation.getParent();
          const grandParent = parent?.getParent?.();
          (grandParent || parent)?.navigate('SalesOrderDetail', { salesOrderId: item.id });
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Sales Order ${item.so_no}, ${item.customer_name}`}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.docNo}>{item.so_no || item.sales_order_no || `SO-${item.id}`}</Text>
          <Text style={styles.customer} numberOfLines={1}>{item.customer_name || 'Unknown Customer'}</Text>
          <Text style={styles.date}>{fmtDate(item.order_date || item.so_date)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.amount}>{fmt(item.grand_total)}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] || '#9e9e9e' }]}>
            <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
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
          <TextInput style={styles.searchInput} placeholder="Search sales orders..." placeholderTextColor="#999" editable={false} />
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
          placeholder="Search sales orders..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          accessibilityLabel="Search sales orders"
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
            type="sales-orders"
            title={search ? 'No results found' : 'No sales orders yet'}
            subtitle={search ? `No orders matching "${search}"` : 'Create your first sales order to get started'}
            buttonLabel={search ? undefined : '+ New Sales Order'}
            onButtonPress={search ? undefined : () => navigation.navigate('SalesOrderForm', {})}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SalesOrderForm', {})}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create new sales order"
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
  docNo: { fontSize: 15, fontWeight: '700', color: '#2e7d32' },
  customer: { fontSize: 13, color: '#555', marginTop: 2 },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#333' },
  badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#2e7d32', width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 5,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});

export default SalesOrderListScreen;
