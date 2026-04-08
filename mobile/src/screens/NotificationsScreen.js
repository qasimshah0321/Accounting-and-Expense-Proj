import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView,
} from 'react-native';
import { useNotificationContext } from '../context/NotificationContext';
import EmptyState from '../components/EmptyState';

// Map notification types to icons and colors
const TYPE_CONFIG = {
  sales_order:       { icon: '\uD83D\uDCC4', color: '#1565c0', label: 'Sales Order' },
  invoice:           { icon: '\uD83D\uDCB3', color: '#2e7d32', label: 'Invoice' },
  payment:           { icon: '\uD83D\uDCB0', color: '#00695c', label: 'Payment' },
  purchase_order:    { icon: '\uD83D\uDCE6', color: '#e65100', label: 'Purchase Order' },
  bill:              { icon: '\uD83D\uDCCB', color: '#4527a0', label: 'Bill' },
  delivery_note:     { icon: '\uD83D\uDE9A', color: '#0277bd', label: 'Delivery Note' },
  estimate:          { icon: '\uD83D\uDCDD', color: '#558b2f', label: 'Estimate' },
  expense:           { icon: '\uD83D\uDCB8', color: '#c62828', label: 'Expense' },
  system:            { icon: '\u2699\uFE0F', color: '#546e7a', label: 'System' },
};

const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.system;

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const NotificationItem = React.memo(({ item, onPress }) => {
  const config = getTypeConfig(item.type);
  const isUnread = !item.is_read;

  return (
    <TouchableOpacity
      style={[styles.item, isUnread && styles.itemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityLabel={`${isUnread ? 'Unread' : 'Read'} notification: ${item.title}`}
      accessibilityRole="button"
    >
      {/* Unread indicator dot */}
      {isUnread && <View style={styles.unreadDot} />}

      {/* Type icon */}
      <View style={[styles.iconCircle, { backgroundColor: config.color + '18' }]}>
        <Text style={styles.iconEmoji}>{config.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.itemType, { color: config.color }]}>{config.label}</Text>
      </View>
    </TouchableOpacity>
  );
});

const NotificationsScreen = ({ navigation }) => {
  const { notifications, unreadCount, loading, refresh, markRead, markAllRead } = useNotificationContext();

  const handlePress = useCallback((item) => {
    if (!item.is_read) {
      markRead(item.id);
    }
    // Future: navigate to the relevant screen based on item.type + item.data
  }, [markRead]);

  const renderItem = useCallback(({ item }) => (
    <NotificationItem item={item} onPress={handlePress} />
  ), [handlePress]);

  const keyExtractor = useCallback((item) => item.id, []);

  // Sort: unread first, then by created_at descending
  const sorted = React.useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [notifications]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar with mark all read */}
      {unreadCount > 0 && (
        <View style={styles.headerBar}>
          <Text style={styles.headerText}>{unreadCount} unread</Text>
          <TouchableOpacity
            onPress={markAllRead}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Mark all notifications as read"
            accessibilityRole="button"
          >
            <Text style={styles.markAllBtn}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={sorted}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            colors={['#1a237e']}
            tintColor="#1a237e"
          />
        }
        contentContainerStyle={sorted.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <EmptyState
            icon="\uD83D\uDD14"
            title="No Notifications"
            subtitle="You're all caught up! Notifications will appear here."
          />
        }
        // Performance: avoid re-renders for off-screen items
        removeClippedSubviews
        maxToRenderPerBatch={15}
        windowSize={10}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e8eaf6',
    borderBottomWidth: 1,
    borderBottomColor: '#c5cae9',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a237e',
  },
  markAllBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3949ab',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemUnread: {
    backgroundColor: '#f3f4ff',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3949ab',
    position: 'absolute',
    top: 18,
    left: 6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  iconEmoji: {
    fontSize: 18,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: '#1a237e',
  },
  itemTime: {
    fontSize: 11,
    color: '#999',
  },
  itemBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  itemType: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default NotificationsScreen;
