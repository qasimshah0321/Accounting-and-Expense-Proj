import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { shipViaAPI } from '../../services/api';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

export default function ShipViaListScreen({ navigation }) {
  const [items, setItems] = useState(() => cache.get(CACHE_KEYS.SHIP_VIA) || []);
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.SHIP_VIA));
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await shipViaAPI.getAll();
      const list = res.data?.ship_via || res.data || [];
      cache.set(CACHE_KEYS.SHIP_VIA, list, TTL.LONG);
      setItems(list);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    const cached = cache.get(CACHE_KEYS.SHIP_VIA);
    if (cached) {
      setItems(cached);
      setLoading(false);
      shipViaAPI.getAll()
        .then(res => {
          const list = res.data?.ship_via || res.data || [];
          cache.set(CACHE_KEYS.SHIP_VIA, list, TTL.LONG);
          setItems(list);
        })
        .catch(() => {});
    } else {
      load();
    }
  }, [load]));

  const handleToggle = async (id) => {
    try { await shipViaAPI.toggleActive(id); load(); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await shipViaAPI.delete(id); load(); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          {item.carrier ? <Text style={styles.carrier}>{item.carrier}</Text> : null}
        </View>
        <Switch value={!!item.is_active} onValueChange={() => handleToggle(item.id)} trackColor={{ true: '#1a237e' }} />
      </View>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate('ShipViaForm', { shipVia: item })}>
          <Text style={styles.actionTxt}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={[styles.actionTxt, { color: '#c62828' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;

  return (
    <View style={styles.container}>
      <FlatList data={items} keyExtractor={i => String(i.id)} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={<Text style={styles.empty}>No shipping methods</Text>}
        contentContainerStyle={{ padding: 12 }} />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ShipViaForm', {})}>
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
  carrier: { fontSize: 13, color: '#555', marginTop: 2 },
  desc: { fontSize: 13, color: '#666', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  actionTxt: { color: '#1a237e', fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 60, color: '#999', fontSize: 15 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#1a237e', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabTxt: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
