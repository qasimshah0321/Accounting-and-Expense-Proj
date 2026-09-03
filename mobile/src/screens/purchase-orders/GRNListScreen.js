import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { grnAPI } from '../../services/api';

const STATUS_COLORS = {
  draft: '#9e9e9e',
  submitted: '#1565c0',
  received: '#2e7d32',
  cancelled: '#d32f2f',
};

const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const GRNListScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await grnAPI.getAll();
      const list = res.data?.goods_received_notes || res.data?.items || res.data?.grns || [];
      setItems(list);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }) => {
    const status = item.status || 'draft';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('GRNDetail', { grnId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.docNo}>{item.grn_no || `GRN-${item.id}`}</Text>
          <Text style={styles.vendor} numberOfLines={1}>{item.vendor_name || 'Unknown Vendor'}</Text>
          <Text style={styles.date}>{fmtDate(item.grn_date || item.received_date)}</Text>
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#e65100" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e65100']} />}
        contentContainerStyle={items.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No goods received notes yet</Text>}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('GRNForm', {})}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, paddingBottom: 80 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, elevation: 2,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  docNo: { fontSize: 15, fontWeight: '700', color: '#e65100' },
  vendor: { fontSize: 13, color: '#555', marginTop: 2 },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#333' },
  badge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { color: '#999', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, backgroundColor: '#e65100',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});

export default GRNListScreen;
