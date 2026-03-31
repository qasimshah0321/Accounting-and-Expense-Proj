import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { expensesAPI } from '../../services/api';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

const ExpenseListScreen = ({ navigation }) => {
  const [expenses, setExpenses] = useState(() => cache.get(CACHE_KEYS.EXPENSES) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.EXPENSES));
  const [refreshing, setRefreshing] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await expensesAPI.getAll();
      const list = res.data?.expenses || res.data?.items || [];
      cache.set(CACHE_KEYS.EXPENSES, list, TTL.SHORT);
      setExpenses(list);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const cached = cache.get(CACHE_KEYS.EXPENSES);
    if (cached) {
      setExpenses(cached);
      setLoading(false);
      expensesAPI.getAll()
        .then(res => {
          const list = res.data?.expenses || res.data?.items || [];
          cache.set(CACHE_KEYS.EXPENSES, list, TTL.SHORT);
          setExpenses(list);
        })
        .catch(() => {});
    } else {
      setLoading(true);
      fetchExpenses();
    }
  }, [fetchExpenses]));
  const onRefresh = () => { setRefreshing(true); fetchExpenses(); };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.getParent()?.navigate('ExpenseForm', { expenseId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.category}>{item.category || 'Uncategorized'}</Text>
        <Text style={styles.vendor} numberOfLines={1}>{item.vendor_name || item.payee || '-'}</Text>
        <Text style={styles.date}>{fmtDate(item.expense_date || item.date)}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.amount}>{fmt(item.amount || item.total_amount)}</Text>
        <Text style={styles.method}>{item.payment_method || '-'}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
        contentContainerStyle={expenses.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No expenses found</Text>}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.getParent()?.navigate('ExpenseForm')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 80 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  category: { fontSize: 15, fontWeight: '700', color: '#c62828' },
  vendor: { fontSize: 13, color: '#555', marginTop: 2 },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', color: '#c62828' },
  method: { fontSize: 11, color: '#888', marginTop: 4 },
  emptyText: { color: '#999', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#c62828', alignItems: 'center',
    justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
});

export default ExpenseListScreen;
