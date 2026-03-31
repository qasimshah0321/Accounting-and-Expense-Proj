import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { estimatesAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

const EstimateListScreen = ({ navigation }) => {
  const [estimates, setEstimates] = useState(() => cache.get(CACHE_KEYS.ESTIMATES) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.ESTIMATES));
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchEstimates = useCallback(async () => {
    try {
      const res = await estimatesAPI.getAll();
      const list = res.data?.estimates || res.data?.items || [];
      cache.set(CACHE_KEYS.ESTIMATES, list, TTL.SHORT);
      setEstimates(list);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const cached = cache.get(CACHE_KEYS.ESTIMATES);
    if (cached) {
      setEstimates(cached);
      setLoading(false);
      estimatesAPI.getAll()
        .then(res => {
          const list = res.data?.estimates || res.data?.items || [];
          cache.set(CACHE_KEYS.ESTIMATES, list, TTL.SHORT);
          setEstimates(list);
        })
        .catch(() => {});
    } else {
      setLoading(true);
      fetchEstimates();
    }
  }, [fetchEstimates]));

  const onRefresh = () => { setRefreshing(true); fetchEstimates(); };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const filtered = search
    ? estimates.filter((e) => {
        const s = search.toLowerCase();
        return (e.estimate_no || '').toLowerCase().includes(s) || (e.customer_name || '').toLowerCase().includes(s);
      })
    : estimates;

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.getParent()?.navigate('EstimateDetail', { estimateId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.docNo}>{item.estimate_no || `EST-${item.id}`}</Text>
        <Text style={styles.customer} numberOfLines={1}>{item.customer_name || 'Unknown'}</Text>
        <Text style={styles.date}>{fmtDate(item.estimate_date)}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.amount}>{fmt(item.grand_total)}</Text>
        <StatusBadge status={item.status} style={{ marginTop: 6 }} />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search estimates..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
        contentContainerStyle={filtered.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No estimates found</Text>}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.getParent()?.navigate('EstimateForm')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 80 },
  searchInput: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, marginBottom: 4,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: '#ddd', color: '#333',
  },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  docNo: { fontSize: 15, fontWeight: '700', color: '#6a1b9a' },
  customer: { fontSize: 13, color: '#555', marginTop: 2 },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#333' },
  emptyText: { color: '#999', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#6a1b9a', alignItems: 'center',
    justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
});

export default EstimateListScreen;
