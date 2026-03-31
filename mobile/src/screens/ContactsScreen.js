import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { customersAPI, vendorsAPI } from '../services/api';
import EmptyState from '../components/EmptyState';
import { showToast } from '../components/Toast';
import SkeletonLoader from '../components/SkeletonLoader';
import { cache, CACHE_KEYS, TTL } from '../services/cache';

const { width } = Dimensions.get('window');

const ContactsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState(() => cache.get(CACHE_KEYS.CUSTOMERS) || []);
  const [vendors, setVendors] = useState(() => cache.get(CACHE_KEYS.VENDORS) || []);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(() => !cache.get(CACHE_KEYS.CUSTOMERS) && !cache.get(CACHE_KEYS.VENDORS));
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (query = '') => {
    try {
      const [custRes, vendRes] = await Promise.all([
        customersAPI.getAll(query).catch(() => ({ data: { customers: [] } })),
        vendorsAPI.getAll(query).catch(() => ({ data: { vendors: [] } })),
      ]);
      const custList = custRes.data?.customers || custRes.data?.items || [];
      const vendList = vendRes.data?.vendors || vendRes.data?.items || [];
      if (!query) {
        cache.set(CACHE_KEYS.CUSTOMERS, custList, TTL.SHORT);
        cache.set(CACHE_KEYS.VENDORS, vendList, TTL.SHORT);
      }
      setCustomers(custList);
      setVendors(vendList);
    } catch (err) {
      showToast('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cachedCust = cache.get(CACHE_KEYS.CUSTOMERS);
      const cachedVend = cache.get(CACHE_KEYS.VENDORS);
      if (cachedCust || cachedVend) {
        if (cachedCust) setCustomers(cachedCust);
        if (cachedVend) setVendors(cachedVend);
        setLoading(false);
        // Background refresh
        Promise.all([
          customersAPI.getAll().catch(() => ({ data: { customers: [] } })),
          vendorsAPI.getAll().catch(() => ({ data: { vendors: [] } })),
        ]).then(([custRes, vendRes]) => {
          const custList = custRes.data?.customers || custRes.data?.items || [];
          const vendList = vendRes.data?.vendors || vendRes.data?.items || [];
          cache.set(CACHE_KEYS.CUSTOMERS, custList, TTL.SHORT);
          cache.set(CACHE_KEYS.VENDORS, vendList, TTL.SHORT);
          setCustomers(custList);
          setVendors(vendList);
        }).catch(() => {});
      } else {
        setLoading(true);
        fetchData(search);
      }
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(search); };

  const handleSearch = (text) => {
    setSearch(text);
    // Debounced search could be added here; for now filter locally
  };

  const handleDelete = (type, id, name) => {
    const api = type === 'customers' ? customersAPI : vendorsAPI;
    const label = type === 'customers' ? 'Customer' : 'Vendor';
    Alert.alert(`Delete ${label}`, `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(id);
            if (type === 'customers') setCustomers(prev => prev.filter(c => c.id !== id));
            else setVendors(prev => prev.filter(v => v.id !== id));
            showToast(`${label} deleted`, 'success');
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      },
    ]);
  };

  const data = activeTab === 'customers' ? customers : vendors;
  const filtered = search.trim()
    ? data.filter(item => {
        const s = search.toLowerCase();
        return (item.name || '').toLowerCase().includes(s) ||
               (item.email || '').toLowerCase().includes(s) ||
               (item.phone || '').includes(s);
      })
    : data;

  const renderItem = ({ item }) => {
    const isCustomer = activeTab === 'customers';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate(isCustomer ? 'CustomerForm' : 'VendorForm', isCustomer ? { customer: item } : { vendor: item })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${isCustomer ? 'customer' : 'vendor'}`}
      >
        <View style={[styles.avatar, { backgroundColor: isCustomer ? '#1a237e' : '#e65100' }]}>
          <Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.detail} numberOfLines={1}>{item.email || 'No email'}</Text>
          {item.phone ? <Text style={styles.detail}>{item.phone}</Text> : null}
          {item.city ? (
            <Text style={styles.location} numberOfLines={1}>{item.city}{item.state ? `, ${item.state}` : ''}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(activeTab, item.id, item.name)}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Delete ${item.name}`}
        >
          <Text style={styles.deleteIcon}>{'\u2715'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const addNew = () => {
    if (activeTab === 'customers') navigation.navigate('CustomerForm', {});
    else navigation.navigate('VendorForm', {});
  };

  return (
    <View style={styles.container}>
      {/* Toggle Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customers' && styles.tabActive]}
          onPress={() => setActiveTab('customers')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'customers' && styles.tabTextActive]}>
            Customers ({customers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vendors' && styles.tabActive]}
          onPress={() => setActiveTab('vendors')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'vendors' && styles.tabTextActive]}>
            Vendors ({vendors.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>{'\uD83D\uDD0D'}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor="#999"
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            accessibilityLabel={`Search ${activeTab}`}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>{'\u2715'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <SkeletonLoader type="contact" count={6} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1a237e']} />}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <EmptyState
              type={activeTab}
              title={search ? 'No results found' : `No ${activeTab} yet`}
              subtitle={search ? `No ${activeTab} matching "${search}"` : `Create your first ${activeTab === 'customers' ? 'customer' : 'vendor'} to get started`}
              buttonLabel={search ? undefined : `+ New ${activeTab === 'customers' ? 'Customer' : 'Vendor'}`}
              onButtonPress={search ? undefined : addNew}
            />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: activeTab === 'customers' ? '#1a237e' : '#e65100' }]}
        onPress={addNew}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Add new ${activeTab === 'customers' ? 'customer' : 'vendor'}`}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  // --- Tabs ---
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#1a237e',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
  },
  tabTextActive: {
    color: '#1a237e',
    fontWeight: '800',
  },
  // --- Search ---
  searchBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.5 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  clearBtn: { padding: 4 },
  clearText: { color: '#999', fontSize: 14, fontWeight: '600' },
  // --- List ---
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 80 },
  emptyContainer: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardBody: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#333' },
  detail: { fontSize: 12, color: '#888', marginTop: 2 },
  location: { fontSize: 11, color: '#aaa', marginTop: 2 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: { color: '#c62828', fontSize: 13, fontWeight: '700' },
  // --- FAB ---
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});

export default ContactsScreen;
