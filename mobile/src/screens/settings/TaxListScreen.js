import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { taxesAPI } from '../../services/api';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

export default function TaxListScreen({ navigation }) {
  const [taxes, setTaxes] = useState(() => cache.get(CACHE_KEYS.TAXES) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.TAXES));
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await taxesAPI.getAll();
      const list = res.data?.taxes || res.data || [];
      cache.set(CACHE_KEYS.TAXES, list, TTL.LONG);
      setTaxes(list);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    const cached = cache.get(CACHE_KEYS.TAXES);
    if (cached) {
      setTaxes(cached);
      setLoading(false);
      taxesAPI.getAll()
        .then(res => {
          const list = res.data?.taxes || res.data || [];
          cache.set(CACHE_KEYS.TAXES, list, TTL.LONG);
          setTaxes(list);
        })
        .catch(() => {});
    } else {
      load();
    }
  }, [load]));

  const handleToggle = async (id) => {
    try { await taxesAPI.toggleActive(id); load(); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const handleSetDefault = async (id) => {
    try { await taxesAPI.setDefault(id); load(); Alert.alert('Success', 'Default tax updated'); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Tax', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await taxesAPI.delete(id); load(); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.rate}>{parseFloat(item.rate || 0).toFixed(2)}%</Text>
        </View>
        <View style={styles.badges}>
          {item.is_default && <View style={styles.defaultBadge}><Text style={styles.defaultTxt}>Default</Text></View>}
          <Switch value={!!item.is_active} onValueChange={() => handleToggle(item.id)} trackColor={{ true: '#1a237e' }} />
        </View>
      </View>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TaxForm', { tax: item })}>
          <Text style={styles.actionTxt}>Edit</Text>
        </TouchableOpacity>
        {!item.is_default && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetDefault(item.id)}>
            <Text style={styles.actionTxt}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
          <Text style={[styles.actionTxt, { color: '#c62828' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;

  return (
    <View style={styles.container}>
      <FlatList data={taxes} keyExtractor={i => String(i.id)} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={<Text style={styles.empty}>No taxes configured</Text>}
        contentContainerStyle={{ padding: 12 }} />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('TaxForm', {})}>
        <Text style={styles.fabTxt}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#1a237e' },
  rate: { fontSize: 18, fontWeight: '800', color: '#333', marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  defaultBadge: { backgroundColor: '#1a237e', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  defaultTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 13, color: '#666', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { paddingVertical: 4 },
  actionTxt: { color: '#1a237e', fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1a237e', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabTxt: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
