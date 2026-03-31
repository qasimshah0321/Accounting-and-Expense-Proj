import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { invoicesAPI, salesOrdersAPI, estimatesAPI } from '../services/api';
import { cache, CACHE_KEYS, TTL } from '../services/cache';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

/**
 * Sales Hub — 2-column grid of colorful module cards.
 * Each card shows: icon, module name, count of open items.
 * Provides at-a-glance view of all sales workflows.
 */

// Derive counts from cached list data if available
const getCountsFromCache = () => ({
  invoices: (cache.get(CACHE_KEYS.INVOICES) || []).length,
  salesOrders: (cache.get(CACHE_KEYS.SALES_ORDERS) || []).length,
  estimates: (cache.get(CACHE_KEYS.ESTIMATES) || []).length,
  deliveryNotes: (cache.get(CACHE_KEYS.DELIVERY_NOTES) || []).length,
  payments: (cache.get(CACHE_KEYS.CUSTOMER_PAYMENTS) || []).length,
});

const SalesHubScreen = ({ navigation }) => {
  const [counts, setCounts] = useState(() => getCountsFromCache());

  useFocusEffect(
    useCallback(() => {
      // Show cached counts immediately
      const cached = getCountsFromCache();
      if (cached.invoices || cached.salesOrders || cached.estimates) {
        setCounts(cached);
      }
      // Background refresh
      const loadCounts = async () => {
        try {
          const [invRes, soRes, estRes] = await Promise.all([
            invoicesAPI.getAll().catch(() => ({ data: { invoices: [] } })),
            salesOrdersAPI.getAll().catch(() => ({ data: { sales_orders: [] } })),
            estimatesAPI.getAll().catch(() => ({ data: { estimates: [] } })),
          ]);
          const invList = invRes.data?.invoices || invRes.data?.items || [];
          const soList = soRes.data?.sales_orders || soRes.data?.items || [];
          const estList = estRes.data?.estimates || estRes.data?.items || [];
          // Update list caches so downstream screens benefit
          cache.set(CACHE_KEYS.INVOICES, invList, TTL.SHORT);
          cache.set(CACHE_KEYS.SALES_ORDERS, soList, TTL.SHORT);
          cache.set(CACHE_KEYS.ESTIMATES, estList, TTL.SHORT);
          setCounts({
            invoices: invList.length,
            salesOrders: soList.length,
            estimates: estList.length,
            deliveryNotes: (cache.get(CACHE_KEYS.DELIVERY_NOTES) || []).length,
            payments: (cache.get(CACHE_KEYS.CUSTOMER_PAYMENTS) || []).length,
          });
        } catch (_) {}
      };
      loadCounts();
    }, [])
  );

  const modules = [
    {
      title: 'Invoices', icon: '\uD83D\uDCC4', count: counts.invoices,
      color: '#1565c0', bg: '#e3f2fd', screen: 'InvoiceList',
    },
    {
      title: 'Sales Orders', icon: '\uD83D\uDCCB', count: counts.salesOrders,
      color: '#2e7d32', bg: '#e8f5e9', screen: 'SalesOrderList',
    },
    {
      title: 'Estimates', icon: '\uD83D\uDCCA', count: counts.estimates,
      color: '#f57f17', bg: '#fff8e1', screen: 'EstimateList',
    },
    {
      title: 'Delivery Notes', icon: '\uD83D\uDE9A', count: counts.deliveryNotes,
      color: '#00838f', bg: '#e0f7fa', screen: 'DeliveryNoteList',
    },
    {
      title: 'Payments', icon: '\uD83D\uDCB0', count: counts.payments,
      color: '#4527a0', bg: '#ede7f6', screen: 'CustomerPaymentList',
    },
    {
      title: 'Products', icon: '\uD83D\uDCE6', count: null,
      color: '#6a1b9a', bg: '#f3e5f5', screen: 'ProductList',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Sales Module</Text>
      <Text style={styles.subheading}>Manage your sales workflow</Text>

      <View style={styles.grid}>
        {modules.map((mod) => (
          <TouchableOpacity
            key={mod.screen}
            style={[styles.card, { backgroundColor: mod.bg }]}
            onPress={() => navigation.navigate(mod.screen)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${mod.title}, ${mod.count !== null ? mod.count + ' items' : ''}`}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardIcon}>{mod.icon}</Text>
              {mod.count !== null && mod.count > 0 ? (
                <View style={[styles.countBadge, { backgroundColor: mod.color }]}>
                  <Text style={styles.countText}>{mod.count}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.cardTitle, { color: mod.color }]}>{mod.title}</Text>
            <Text style={styles.cardSub}>
              {mod.count !== null ? `${mod.count} total` : 'View all'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Create */}
      <View style={styles.quickSection}>
        <Text style={styles.quickTitle}>Quick Create</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: '#1565c0' }]}
            onPress={() => navigation.navigate('InvoiceForm', {})}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnText}>+ New Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: '#2e7d32' }]}
            onPress={() => navigation.navigate('SalesOrderForm', {})}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnText}>+ Sales Order</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subheading: {
    fontSize: 14,
    color: '#888',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardIcon: { fontSize: 32 },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#888' },
  // --- Quick Create ---
  quickSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  quickTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  quickBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

export default SalesHubScreen;
