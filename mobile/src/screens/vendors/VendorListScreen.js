import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { vendorsAPI } from '../../services/api';

const fuzzyFilter = (items, query, keys) => {
  if (!query.trim()) return items;
  const q = query.toLowerCase().trim();
  return items.filter(item =>
    keys.some(key => {
      const val = (item[key] || '').toLowerCase();
      if (val.includes(q)) return true;
      let ti = 0;
      for (const ch of q) {
        const pos = val.indexOf(ch, ti);
        if (pos === -1) return false;
        ti = pos + 1;
      }
      return true;
    })
  );
};

const VendorListScreen = ({ navigation }) => {
  const [allVendors, setAllVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const vendors = useMemo(() => fuzzyFilter(allVendors, search, ['name', 'email', 'phone']), [allVendors, search]);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await vendorsAPI.getAll();
      const list = res.data?.vendors || res.data?.items || [];
      setAllVendors(list);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchVendors();
    }, [fetchVendors])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVendors();
  };

  const handleDelete = (id, name) => {
    Alert.alert('Delete Vendor', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vendorsAPI.delete(id);
            setAllVendors((prev) => prev.filter((v) => v.id !== id));
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('VendorForm', { vendor: item })}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.detail} numberOfLines={1}>{item.email || 'No email'}</Text>
        {item.phone && <Text style={styles.detail}>{item.phone}</Text>}
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>X</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search vendors..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={vendors}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
        contentContainerStyle={vendors.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No vendors found</Text>}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('VendorForm', {})}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', elevation: 2 },
  searchInput: {
    backgroundColor: '#f0f0f0', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333',
  },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 80 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 14, marginBottom: 8, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#e65100',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#333' },
  detail: { fontSize: 12, color: '#888', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#d32f2f', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#999', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#e65100', alignItems: 'center',
    justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});

export default VendorListScreen;
