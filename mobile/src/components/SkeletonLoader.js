import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * Skeleton loading placeholder for cards and list items.
 * Provides a shimmer effect using animated opacity.
 */
const SkeletonBlock = ({ width, height = 14, borderRadius = 6, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

/** Skeleton for a standard list card (doc number, name, amount) */
const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <SkeletonBlock width={100} height={16} />
      <SkeletonBlock width={160} height={12} style={{ marginTop: 8 }} />
      <SkeletonBlock width={80} height={10} style={{ marginTop: 6 }} />
    </View>
    <View style={styles.cardRight}>
      <SkeletonBlock width={70} height={16} />
      <SkeletonBlock width={56} height={20} borderRadius={10} style={{ marginTop: 8 }} />
    </View>
  </View>
);

/** Skeleton for KPI dashboard cards */
const SkeletonKPI = () => (
  <View style={styles.kpiCard}>
    <SkeletonBlock width={80} height={10} />
    <SkeletonBlock width={100} height={22} style={{ marginTop: 8 }} />
  </View>
);

/** Skeleton for a contact/entity card (avatar + info) */
const SkeletonContactCard = () => (
  <View style={styles.card}>
    <SkeletonBlock width={42} height={42} borderRadius={21} style={{ marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      <SkeletonBlock width={140} height={14} />
      <SkeletonBlock width={180} height={10} style={{ marginTop: 6 }} />
      <SkeletonBlock width={100} height={10} style={{ marginTop: 4 }} />
    </View>
  </View>
);

/** Full skeleton loader with configurable count */
const SkeletonLoader = ({ type = 'card', count = 5 }) => {
  const Component = type === 'kpi' ? SkeletonKPI : type === 'contact' ? SkeletonContactCard : SkeletonCard;
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={type === 'kpi' ? styles.kpiRow : styles.listContainer}>
      {items.map((i) => <Component key={i} />)}
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#e0e0e0',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  cardRight: { alignItems: 'flex-end' },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  kpiCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 12,
  },
});

export { SkeletonBlock, SkeletonCard, SkeletonKPI, SkeletonContactCard };
export default SkeletonLoader;
