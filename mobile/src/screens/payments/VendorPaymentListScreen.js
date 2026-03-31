import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { vendorPaymentsAPI } from '../../services/api';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

export default function VendorPaymentListScreen({ navigation }) {
  const [payments, setPayments] = useState(() => cache.get(CACHE_KEYS.VENDOR_PAYMENTS) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.VENDOR_PAYMENTS));
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await vendorPaymentsAPI.getAll();
      const list = res.data?.vendor_payments || res.data?.payments || res.data || [];
      const safeList = Array.isArray(list) ? list : [];
      cache.set(CACHE_KEYS.VENDOR_PAYMENTS, safeList, TTL.SHORT);
      setPayments(safeList);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    const cached = cache.get(CACHE_KEYS.VENDOR_PAYMENTS);
    if (cached) {
      setPayments(cached);
      setLoading(false);
      vendorPaymentsAPI.getAll()
        .then(res => {
          const list = res.data?.vendor_payments || res.data?.payments || res.data || [];
          const safeList = Array.isArray(list) ? list : [];
          cache.set(CACHE_KEYS.VENDOR_PAYMENTS, safeList, TTL.SHORT);
          setPayments(safeList);
        })
        .catch(() => {});
    } else {
      load();
    }
  }, [load]));

  const handleDelete = (id) => {
    Alert.alert('Delete Payment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await vendorPaymentsAPI.delete(id); load(); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('VendorPaymentForm', { payment: item })}>
      <View style={styles.cardRow}>
        <Text style={styles.vendorName}>{item.vendor_name || 'Vendor'}</Text>
        <Text style={styles.amount}>${parseFloat(item.amount || 0).toFixed(2)}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.meta}>{item.payment_method || 'Cash'} • {item.payment_date?.slice(0,10) || ''}</Text>
        {item.reference_no ? <Text style={styles.ref}>Ref: {item.reference_no}</Text> : null}
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteTxt}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={<Text style={styles.empty}>No payments found</Text>}
        contentContainerStyle={{ padding: 12 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('VendorPaymentForm', {})}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  vendorName: { fontSize: 15, fontWeight: '700', color: '#1a237e' },
  amount: { fontSize: 15, fontWeight: '700', color: '#e65100' },
  meta: { fontSize: 12, color: '#666' },
  ref: { fontSize: 12, color: '#888' },
  deleteBtn: { alignSelf: 'flex-end', marginTop: 6 },
  deleteTxt: { color: '#c62828', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1a237e', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabTxt: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
