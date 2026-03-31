import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { productsAPI, productTypeToBackend, productTypeToFrontend } from '../../services/api';

const PRODUCT_TYPES = ['Services', 'Inventory item', 'Non-Inventory'];

const ProductFormScreen = ({ route, navigation }) => {
  const existing = route.params?.product;
  const isEdit = !!existing;

  const [form, setForm] = useState({
    name: existing?.name || '',
    sku: existing?.sku || '',
    product_type: isEdit ? productTypeToFrontend(existing?.product_type) : 'Services',
    description: existing?.description || '',
    selling_price: existing?.selling_price ? String(existing.selling_price) : '',
    cost_price: existing?.cost_price ? String(existing.cost_price) : '',
    unit_of_measure: existing?.unit_of_measure || '',
    reorder_level: existing?.reorder_level ? String(existing.reorder_level) : '',
    is_active: existing?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Product name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        product_type: productTypeToBackend(form.product_type),
        description: form.description.trim() || null,
        selling_price: form.selling_price ? parseFloat(form.selling_price) : 0,
        cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
        unit_of_measure: form.unit_of_measure.trim() || null,
        reorder_level: form.reorder_level ? parseInt(form.reorder_level, 10) : 0,
        is_active: form.is_active,
      };
      if (isEdit) {
        await productsAPI.update(existing.id, payload);
      } else {
        await productsAPI.create(payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product Details</Text>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => update('name', v)} placeholder="Product name" placeholderTextColor="#999" />

        <Text style={styles.label}>SKU</Text>
        <TextInput style={styles.input} value={form.sku} onChangeText={(v) => update('sku', v)} placeholder="SKU / Item code" placeholderTextColor="#999" />

        <Text style={styles.label}>Type</Text>
        <View style={styles.termsRow}>
          {PRODUCT_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.termChip, form.product_type === t && styles.termChipActive]}
              onPress={() => update('product_type', t)}
            >
              <Text style={[styles.termChipText, form.product_type === t && styles.termChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={form.description} onChangeText={(v) => update('description', v)} placeholder="Description" placeholderTextColor="#999" multiline />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Selling Price</Text>
            <TextInput style={styles.input} value={form.selling_price} onChangeText={(v) => update('selling_price', v)} placeholder="0.00" placeholderTextColor="#999" keyboardType="numeric" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Cost Price</Text>
            <TextInput style={styles.input} value={form.cost_price} onChangeText={(v) => update('cost_price', v)} placeholder="0.00" placeholderTextColor="#999" keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Unit of Measure</Text>
            <TextInput style={styles.input} value={form.unit_of_measure} onChangeText={(v) => update('unit_of_measure', v)} placeholder="e.g. pcs, kg" placeholderTextColor="#999" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Reorder Level</Text>
            <TextInput style={styles.input} value={form.reorder_level} onChangeText={(v) => update('reorder_level', v)} placeholder="0" placeholderTextColor="#999" keyboardType="numeric" />
          </View>
        </View>
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Update Product' : 'Create Product'}</Text>}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 10,
    padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#6a1b9a', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  termsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  termChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  termChipActive: { backgroundColor: '#6a1b9a', borderColor: '#6a1b9a' },
  termChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  termChipTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#6a1b9a', marginHorizontal: 12, marginTop: 20,
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ProductFormScreen;
