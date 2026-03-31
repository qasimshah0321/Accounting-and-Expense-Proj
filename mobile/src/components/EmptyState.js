import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Reusable empty state for all list screens.
 * Shows a large emoji icon, title, subtitle, and optional CTA button.
 */

const ICONS = {
  invoices: '\uD83D\uDCC4',       // document
  'sales-orders': '\uD83D\uDCCB',  // clipboard
  bills: '\uD83D\uDCB3',           // credit card
  'purchase-orders': '\uD83D\uDCE6', // package
  customers: '\uD83D\uDC65',       // people
  vendors: '\uD83C\uDFED',         // factory
  products: '\uD83D\uDCE6',        // package
  estimates: '\uD83D\uDCCA',       // chart
  expenses: '\uD83D\uDCB8',        // money with wings
  payments: '\uD83D\uDCB0',        // money bag
  taxes: '\uD83C\uDFE6',           // bank
  default: '\uD83D\uDCC2',         // folder
};

const EmptyState = ({
  icon,
  title = 'No items yet',
  subtitle = 'Get started by creating your first entry',
  buttonLabel,
  onButtonPress,
  type = 'default',
}) => {
  const displayIcon = icon || ICONS[type] || ICONS.default;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{displayIcon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonLabel && onButtonPress ? (
        <TouchableOpacity
          style={styles.button}
          onPress={onButtonPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default EmptyState;
