import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { billsAPI, purchaseOrdersAPI } from '../services/api';
import { cache, CACHE_KEYS, TTL } from '../services/cache';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

/**
 * Purchases Hub — 2-column grid of colorful module cards.
 * Each card shows: icon, module name, count of open items.
 */

const getCountsFromCache = () => ({
  bills: (cache.get(CACHE_KEYS.BILLS) || []).length,
  purchaseOrders: (cache.get(CACHE_KEYS.PURCHASE_ORDERS) || []).length,
  expenses: (cache.get(CACHE_KEYS.EXPENSES) || []).length,
  payments: (cache.get(CACHE_KEYS.VENDOR_PAYMENTS) || []).length,
});

const PurchasesHubScreen = ({ navigation }) => {
  const [counts, setCounts] = useState(() => getCountsFromCache());

  useFocusEffect(
    useCallback(() => {
      // Show cached counts immediately
      const cached = getCountsFromCache();
      if (cached.bills || cached.purchaseOrders) {
        setCounts(cached);
      }
      // Background refresh
      const loadCounts = async () => {
        try {
          const [billRes, poRes] = await Promise.all([
            billsAPI.getAll().catch(() => ({ data: { bills: [] } })),
            purchaseOrdersAPI.getAll().catch(() => ({ data: { purchase_orders: [] } })),
          ]);
          const billList = billRes.data?.bills || billRes.data?.items || [];
          const poList = poRes.data?.purchase_orders || poRes.data?.items || [];
          cache.set(CACHE_KEYS.BILLS, billList, TTL.SHORT);
          cache.set(CACHE_KEYS.PURCHASE_ORDERS, poList, TTL.SHORT);
          setCounts({
            bills: billList.length,
            purchaseOrders: poList.length,
            expenses: (cache.get(CACHE_KEYS.EXPENSES) || []).length,
            payments: (cache.get(CACHE_KEYS.VENDOR_PAYMENTS) || []).length,
          });
        } catch (_) {}
      };
      loadCounts();
    }, [])
  );

  const modules = [
    {
      title: 'Bills', icon: '\uD83D\uDCB3', count: counts.bills,
      color: '#c62828', bg: '#fce4ec', screen: 'BillList',
    },
    {
      title: 'Purchase Orders', icon: '\uD83D\uDCE6', count: counts.purchaseOrders,
      color: '#e65100', bg: '#fff3e0', screen: 'PurchaseOrderList',
    },
    {
      title: 'Expenses', icon: '\uD83D\uDCB8', count: counts.expenses,
      color: '#4e342e', bg: '#efebe9', screen: 'ExpenseList',
    },
    {
      title: 'Payments', icon: '\uD83D\uDCB0', count: counts.payments,
      color: '#1b5e20', bg: '#e8f5e9', screen: 'VendorPaymentList',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.heading}>Purchases Module</Text>
      <Text style={styles.subheading}>Manage your procurement workflow</Text>

      <View style={styles.grid}>
        {modules.map((mod) => (
          <TouchableOpacity
            key={mod.screen}
            style={[styles.card, { backgroundColor: mod.bg }]}
            onPress={() => navigation.navigate(mod.screen)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${mod.title}, ${mod.count} items`}
          >
            <View style={styles.cardTop}>
              <Text style={styles.cardIcon}>{mod.icon}</Text>
              {mod.count > 0 ? (
                <View style={[styles.countBadge, { backgroundColor: mod.color }]}>
                  <Text style={styles.countText}>{mod.count}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.cardTitle, { color: mod.color }]}>{mod.title}</Text>
            <Text style={styles.cardSub}>{mod.count} total</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Create */}
      <View style={styles.quickSection}>
        <Text style={styles.quickTitle}>Quick Create</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: '#c62828' }]}
            onPress={() => navigation.navigate('BillForm', {})}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnText}>+ New Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: '#e65100' }]}
            onPress={() => navigation.navigate('PurchaseOrderForm', {})}
            activeOpacity={0.8}
          >
            <Text style={styles.quickBtnText}>+ Purchase Order</Text>
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
  quickSection: { paddingHorizontal: 16, marginTop: 24 },
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

export default PurchasesHubScreen;
