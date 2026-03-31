import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersAPI } from '../../services/api';
import EmptyState from '../../components/EmptyState';
import { showToast } from '../../components/Toast';
import { SkeletonCard } from '../../components/SkeletonLoader';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

const STATUS_COLORS = {
  draft: '#9e9e9e', approved: '#2e7d32', sent: '#1565c0',
  received: '#00695c', cancelled: '#d32f2f',
};

const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const PurchaseOrderListScreen = ({ navigation }) => {
  const [orders, setOrders] = useState(() => cache.get(CACHE_KEYS.PURCHASE_ORDERS) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.PURCHASE_ORDERS));
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await purchaseOrdersAPI.getAll();
      const list = res.data?.purchase_orders || res.data?.items || [];
      cache.set(CACHE_KEYS.PURCHASE_ORDERS, list, TTL.SHORT);
      setOrders(list);
    } catch (err) {
      showToast(err.message || 'Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = cache.get(CACHE_KEYS.PURCHASE_ORDERS);
      if (cached) {
        setOrders(cached);
        setLoading(false);
        purchaseOrdersAPI.getAll()
          .then(res => {
            const list = res.data?.purchase_orders || res.data?.items || [];
            cache.set(CACHE_KEYS.PURCHASE_ORDERS, list, TTL.SHORT);
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
        return (o.po_no || o.purchase_order_no || '').toLowerCase().includes(s) ||
               (o.vendor_name || '').toLowerCase().includes(s);
      })
    : orders;

  const renderItem = ({ item }) => {
    const status = item.status || 'draft';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.getParent()?.navigate('PurchaseOrderDetail', { purchaseOrderId: item.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`PO ${item.po_no}, ${item.vendor_name}`}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.docNo}>{item.po_no || item.purchase_order_no || `PO-${item.id}`}</Text>
          <Text style={styles.vendor} numberOfLines={1}>{item.vendor_name || 'Unknown Vendor'}</Text>
          <Text style={styles.date}>{fmtDate(item.order_date || item.po_date)}</Text>
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
          <TextInput style={styles.searchInput} placeholder="Search purchase orders..." placeholderTextColor="#999" editable={false} />
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
          placeholder="Search purchase orders..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          accessibilityLabel="Search purchase orders"
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
            type="purchase-orders"
            title={search ? 'No results found' : 'No purchase orders yet'}
            subtitle={search ? `No POs matching "${search}"` : 'Create your first purchase order to get started'}
            buttonLabel={search ? undefined : '+ New Purchase Order'}
            onButtonPress={search ? undefined : () => navigation.navigate('PurchaseOrderForm', {})}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('PurchaseOrderForm', {})}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create new purchase order"
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
  docNo: { fontSize: 15, fontWeight: '700', color: '#e65100' },
  vendor: { fontSize: 13, color: '#555', marginTop: 2 },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#333' },
  badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#e65100', width: 56, height: 56,
    borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 5,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});

export default PurchaseOrderListScreen;
