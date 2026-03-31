import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { productsAPI, productTypeToFrontend } from '../../services/api';
import { cache, CACHE_KEYS, TTL } from '../../services/cache';

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

const ProductListScreen = ({ navigation }) => {
  const [allProducts, setAllProducts] = useState(() => cache.get(CACHE_KEYS.PRODUCTS) || []);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.PRODUCTS));
  const [refreshing, setRefreshing] = useState(false);

  const products = useMemo(() => fuzzyFilter(allProducts, search, ['name', 'description']), [allProducts, search]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productsAPI.getAll();
      const list = res.data?.products || res.data?.items || [];
      cache.set(CACHE_KEYS.PRODUCTS, list, TTL.LONG);
      setAllProducts(list);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cached = cache.get(CACHE_KEYS.PRODUCTS);
      if (cached) {
        setAllProducts(cached);
        setLoading(false);
        // Background refresh
        productsAPI.getAll()
          .then(res => {
            const list = res.data?.products || res.data?.items || [];
            cache.set(CACHE_KEYS.PRODUCTS, list, TTL.LONG);
            setAllProducts(list);
          })
          .catch(() => {});
      } else {
        setLoading(true);
        fetchProducts();
      }
    }, [fetchProducts])
  );

  const onRefresh = () => { setRefreshing(true); fetchProducts(); };

  const handleDelete = (id, name) => {
    Alert.alert('Delete Product', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await productsAPI.delete(id); setAllProducts((p) => p.filter((x) => x.id !== id)); }
          catch (err) { Alert.alert('Error', err.message); }
        },
      },
    ]);
  };

  const fmt = (v) => parseFloat(v || 0).toFixed(2);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductForm', { product: item })}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, item.product_type === 'service' ? { backgroundColor: '#6a1b9a' } : item.product_type === 'non-inventory' ? { backgroundColor: '#00695c' } : {}]}>
        <Text style={styles.avatarText}>{item.product_type === 'service' ? 'S' : item.product_type === 'non-inventory' ? 'N' : 'I'}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.detail}>{productTypeToFrontend(item.product_type)} | SKU: {item.sku || '-'}</Text>
        <Text style={styles.price}>Sell: ${fmt(item.selling_price)} | Cost: ${fmt(item.cost_price)}</Text>
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
          style={styles.searchInput} placeholder="Search products..." placeholderTextColor="#999"
          value={search} onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
        contentContainerStyle={products.length === 0 ? styles.centered : styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No products found</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ProductForm', {})} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', elevation: 2 },
  searchInput: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333' },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 80 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 14, marginBottom: 8, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#1a237e',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#333' },
  detail: { fontSize: 11, color: '#888', marginTop: 2 },
  price: { fontSize: 12, color: '#1a237e', marginTop: 3, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  deleteText: { color: '#d32f2f', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#999', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#6a1b9a', alignItems: 'center',
    justifyContent: 'center', elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});

export default ProductListScreen;
