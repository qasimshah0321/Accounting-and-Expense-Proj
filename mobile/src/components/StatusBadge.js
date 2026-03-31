import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Unified StatusBadge used across all ERP screens.
 * Consistent color mapping for every document status in the system.
 * Uses pill-shaped badges with white text on colored backgrounds.
 */

const STATUS_MAP = {
  // Document lifecycle
  draft:          { bg: '#757575', label: 'Draft' },
  pending:        { bg: '#f57f17', label: 'Pending' },
  confirmed:      { bg: '#2e7d32', label: 'Confirmed' },
  approved:       { bg: '#2e7d32', label: 'Approved' },
  sent:           { bg: '#1565c0', label: 'Sent' },
  posted:         { bg: '#4a148c', label: 'Posted' },
  completed:      { bg: '#00695c', label: 'Completed' },
  cancelled:      { bg: '#424242', label: 'Cancelled' },
  rejected:       { bg: '#c62828', label: 'Rejected' },

  // Payment status
  paid:           { bg: '#1b5e20', label: 'Paid' },
  unpaid:         { bg: '#757575', label: 'Unpaid' },
  partially_paid: { bg: '#00695c', label: 'Partially Paid' },
  overdue:        { bg: '#b71c1c', label: 'Overdue' },

  // Fulfillment
  shipped:        { bg: '#0277bd', label: 'Shipped' },
  delivered:      { bg: '#00695c', label: 'Delivered' },
  received:       { bg: '#00695c', label: 'Received' },

  // Estimate-specific
  converted:      { bg: '#4a148c', label: 'Converted' },
  accepted:       { bg: '#2e7d32', label: 'Accepted' },
  declined:       { bg: '#c62828', label: 'Declined' },
  expired:        { bg: '#795548', label: 'Expired' },

  // Entity status
  active:         { bg: '#2e7d32', label: 'Active' },
  inactive:       { bg: '#757575', label: 'Inactive' },
};

const StatusBadge = ({ status, style, size = 'small' }) => {
  const key = (status || 'draft').toLowerCase().replace(/\s+/g, '_');
  const config = STATUS_MAP[key] || { bg: '#757575', label: key.replace(/_/g, ' ') };

  const isLarge = size === 'large';

  return (
    <View
      style={[
        styles.badge,
        isLarge && styles.badgeLarge,
        { backgroundColor: config.bg },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${config.label}`}
    >
      <Text style={[styles.text, isLarge && styles.textLarge]}>
        {config.label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textLarge: {
    fontSize: 12,
  },
});

export default StatusBadge;
