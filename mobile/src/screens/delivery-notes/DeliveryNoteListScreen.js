import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { deliveryNotesAPI } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

const DeliveryNoteListScreen = ({ navigation }) => {
  const [notes, setNotes] = useState(() => cache.get(CACHE_KEYS.DELIVERY_NOTES) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.DELIVERY_NOTES));
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await deliveryNotesAPI.getAll();
      const list = res.data?.delivery_notes || res.data?.items || [];
      cache.set(CACHE_KEYS.DELIVERY_NOTES, list, TTL.SHORT);
      setNotes(list);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const cached = cache.get(CACHE_KEYS.DELIVERY_NOTES);
    if (cached) {
      setNotes(cached);
      setLoading(false);
      deliveryNotesAPI.getAll()
        .then(res => {
          const list = res.data?.delivery_notes || res.data?.items || [];
          cache.set(CACHE_KEYS.DELIVERY_NOTES, list, TTL.SHORT);
          setNotes(list);
        })
        .catch(() => {});
    } else {
      setLoading(true);
      fetchNotes();
    }
  }, [fetchNotes]));
  const onRefresh = () => { setRefreshing(true); fetchNotes(); };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.getParent()?.navigate('DeliveryNoteDetail', { deliveryNoteId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.docNo}>{item.delivery_note_no || item.dn_no || `DN-${item.id}`}</Text>
        <Text style={styles.customer} numberOfLines={1}>{item.customer_name || 'Unknown'}</Text>
        <Text style={styles.date}>{fmtDate(item.delivery_date || item.created_at)}</Text>
      </View>
      <View style={styles.cardRight}>
        <StatusBadge status={item.status || 'draft'} />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
        contentContainerStyle={notes.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No delivery notes found</Text>}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.getParent()?.navigate('DeliveryNoteForm')}
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
  docNo: { fontSize: 15, fontWeight: '700', color: '#00695c' },
  customer: { fontSize: 13, color: '#555', marginTop: 2 },
  date: { fontSize: 11, color: '#999', marginTop: 2 },
  emptyText: { color: '#999', fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 20, right: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#00695c', alignItems: 'center',
    justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
});

export default DeliveryNoteListScreen;
