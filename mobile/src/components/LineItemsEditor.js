import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import SearchableDropdown from './SearchableDropdown';

const emptyLine = () => ({
  product_id: '',
  product_name: '',
  description: '',
  quantity: '1',
  unit_price: '0',
  tax_id: '',
  tax_rate: 0,
  discount: '0',
});

const calcLineTotal = (line) => {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unit_price) || 0;
  const disc = parseFloat(line.discount) || 0;
  const taxRate = parseFloat(line.tax_rate) || 0;
  const base = qty * price;
  const afterDisc = base * (1 - disc / 100);
  const afterTax = afterDisc * (1 + taxRate / 100);
  return afterTax;
};

const calcSubtotal = (items) => {
  return items.reduce((sum, line) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    const disc = parseFloat(line.discount) || 0;
    return sum + qty * price * (1 - disc / 100);
  }, 0);
};

const LineItemsEditor = ({ items, onChange, products = [], taxes = [] }) => {

  const updateLine = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    // If product selected, fill in defaults
    if (field === 'product_id' && value) {
      const prod = products.find((p) => String(p.id) === String(value));
      if (prod) {
        updated[index].product_name = prod.name || '';
        updated[index].description = prod.description || '';
        updated[index].unit_price = String(prod.selling_price || prod.unit_price || prod.cost_price || '0');
      }
    }

    // If tax selected, store tax rate
    if (field === 'tax_id' && value) {
      const tax = taxes.find((t) => String(t.id) === String(value));
      if (tax) {
        updated[index].tax_rate = parseFloat(tax.rate) || 0;
      }
    }

    onChange(updated);
  };

  const addLine = () => {
    onChange([...items, emptyLine()]);
  };

  const removeLine = (index) => {
    if (items.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one line item is required.');
      return;
    }
    Alert.alert('Remove Item', 'Remove this line item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const updated = items.filter((_, i) => i !== index);
          onChange(updated);
        },
      },
    ]);
  };

  const fmt = (v) => parseFloat(v || 0).toFixed(2);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Line Items</Text>

      {items.map((line, idx) => (
        <View key={idx} style={styles.lineCard}>
          <View style={styles.lineHeader}>
            <Text style={styles.lineIndex}>#{idx + 1}</Text>
            <TouchableOpacity onPress={() => removeLine(idx)}>
              <Text style={styles.removeBtn}>Remove</Text>
            </TouchableOpacity>
          </View>

          {/* Product Selection */}
          <SearchableDropdown
            label="Product"
            items={products}
            selectedValue={line.product_id ? String(line.product_id) : ''}
            onSelect={(prod) => updateLine(idx, 'product_id', String(prod.id))}
            labelKey="name"
            valueKey="id"
            placeholder="Select product..."
            renderItem={(item) => (
              <View>
                <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  ${parseFloat(item.selling_price || item.unit_price || 0).toFixed(2)} · {item.product_type || 'product'}
                </Text>
              </View>
            )}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.input}
            value={line.description}
            onChangeText={(v) => updateLine(idx, 'description', v)}
            placeholder="Description"
            placeholderTextColor="#999"
          />

          <View style={styles.rowFields}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Qty</Text>
              <TextInput
                style={styles.input}
                value={String(line.quantity)}
                onChangeText={(v) => updateLine(idx, 'quantity', v)}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Unit Price</Text>
              <TextInput
                style={styles.input}
                value={String(line.unit_price)}
                onChangeText={(v) => updateLine(idx, 'unit_price', v)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.rowFields}>
            <View style={styles.fieldHalf}>
              <SearchableDropdown
                label="Tax"
                items={[{ id: '', name: 'No Tax', rate: 0 }, ...taxes]}
                selectedValue={line.tax_id ? String(line.tax_id) : ''}
                onSelect={(tax) => {
                  updateLine(idx, 'tax_id', tax.id || '');
                  updateLine(idx, 'tax_rate', parseFloat(tax.rate) || 0);
                }}
                labelKey="name"
                valueKey="id"
                placeholder="No Tax"
                renderItem={(item) => (
                  <View>
                    <Text style={{ fontSize: 14, color: '#333' }}>{item.name}</Text>
                    {item.rate > 0 && <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{item.rate}% tax rate</Text>}
                  </View>
                )}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Discount %</Text>
              <TextInput
                style={styles.input}
                value={String(line.discount)}
                onChangeText={(v) => updateLine(idx, 'discount', v)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.lineTotalRow}>
            <Text style={styles.lineTotalLabel}>Line Total:</Text>
            <Text style={styles.lineTotalValue}>${fmt(calcLineTotal(line))}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addBtn} onPress={addLine}>
        <Text style={styles.addBtnText}>+ Add Line Item</Text>
      </TouchableOpacity>

      <View style={styles.subtotalRow}>
        <Text style={styles.subtotalLabel}>Subtotal (before tax):</Text>
        <Text style={styles.subtotalValue}>${fmt(calcSubtotal(items))}</Text>
      </View>
    </View>
  );
};

export { emptyLine, calcLineTotal, calcSubtotal };

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', color: '#1a237e', marginBottom: 10 },
  lineCard: {
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineIndex: { fontSize: 13, fontWeight: '700', color: '#1a237e' },
  removeBtn: { fontSize: 13, color: '#d32f2f', fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  pickerWrapper: { marginBottom: 2 },
  pickerTrigger: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: { fontSize: 14, color: '#333' },
  rowFields: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },
  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  lineTotalLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  lineTotalValue: { fontSize: 14, fontWeight: '700', color: '#1a237e' },
  addBtn: {
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#c5cae9',
    borderStyle: 'dashed',
  },
  addBtnText: { color: '#1a237e', fontSize: 14, fontWeight: '700' },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  subtotalLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  subtotalValue: { fontSize: 15, fontWeight: '800', color: '#1a237e' },
});

export default LineItemsEditor;
