import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { deliveryNotesAPI, customersAPI, productsAPI, salesOrdersAPI } from '../../services/api';
import SearchableDropdown from '../../components/SearchableDropdown';

const DeliveryNoteFormScreen = ({ route, navigation }) => {
  const editId = route.params?.deliveryNoteId;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    delivery_note_no: '',
    delivery_date: new Date().toISOString().slice(0, 10),
    sales_order_id: '',
    so_no: '',
    shipping_address: '',
    notes: '',
  });

  const [items, setItems] = useState([{ product_id: '', product_name: '', description: '', quantity: '1' }]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll(),
      ]);
      setCustomers(custRes.data?.customers || custRes.data?.items || []);
      setProducts(prodRes.data?.products || prodRes.data?.items || []);

      if (isEdit) {
        const res = await deliveryNotesAPI.getById(editId);
        const dn = res.data?.delivery_note || res.data;
        setForm({
          customer_id: dn.customer_id || '',
          customer_name: dn.customer_name || '',
          delivery_note_no: dn.delivery_note_no || dn.dn_no || '',
          delivery_date: (dn.delivery_date || '').slice(0, 10),
          sales_order_id: dn.sales_order_id || '',
          so_no: dn.so_no || '',
          shipping_address: dn.shipping_address || '',
          notes: dn.notes || '',
        });
        const lines = dn.line_items || dn.items || [];
        if (lines.length > 0) {
          setItems(lines.map((l) => ({
            product_id: l.product_id || '',
            product_name: l.product_name || '',
            description: l.description || '',
            quantity: String(l.quantity || 1),
          })));
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'product_id' && value) {
      const prod = products.find((p) => String(p.id) === String(value));
      if (prod) {
        updated[idx].product_name = prod.name || '';
        updated[idx].description = prod.description || '';
      }
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { product_id: '', product_name: '', description: '', quantity: '1' }]);
  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.customer_id) { Alert.alert('Validation', 'Select a customer.'); return; }

    setSaving(true);
    try {
      const payload = {
        customer_id: form.customer_id,
        delivery_note_no: form.delivery_note_no,
        delivery_date: form.delivery_date,
        sales_order_id: form.sales_order_id || null,
        shipping_address: form.shipping_address,
        notes: form.notes,
        line_items: items.map((l) => ({
          product_id: l.product_id || null,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
        })),
      };

      if (isEdit) { await deliveryNotesAPI.update(editId, payload); }
      else { await deliveryNotesAPI.create(payload); }

      Alert.alert('Success', `Delivery Note ${isEdit ? 'updated' : 'created'}.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Note Details</Text>

          <SearchableDropdown
            label="Customer"
            items={customers}
            selectedValue={form.customer_id ? String(form.customer_id) : ''}
            onSelect={(c) => setForm((f) => ({ ...f, customer_id: String(c.id), customer_name: c.name }))}
            labelKey="name"
            valueKey="id"
            subLabelKey="email"
            placeholder="Select customer..."
          />

          <Text style={styles.label}>Delivery Note #</Text>
          <TextInput style={styles.readOnlyInput} value={form.delivery_note_no} editable={false} />

          <Text style={styles.label}>Delivery Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.delivery_date} onChangeText={(v) => setForm((f) => ({ ...f, delivery_date: v }))} placeholder="2026-01-01" placeholderTextColor="#999" />

          <Text style={styles.label}>Shipping Address</Text>
          <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={form.shipping_address} onChangeText={(v) => setForm((f) => ({ ...f, shipping_address: v }))} placeholder="Address..." placeholderTextColor="#999" multiline />

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Notes..." placeholderTextColor="#999" multiline />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items to Deliver</Text>
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIndex}>#{idx + 1}</Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(idx)}>
                    <Text style={styles.removeBtn}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              <SearchableDropdown
                label="Product"
                items={products}
                selectedValue={item.product_id ? String(item.product_id) : ''}
                onSelect={(prod) => updateItem(idx, 'product_id', String(prod.id))}
                labelKey="name"
                valueKey="id"
                placeholder="Select product..."
                renderItem={(p) => (
                  <View>
                    <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>{p.name}</Text>
                    {p.description ? <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.description}</Text> : null}
                  </View>
                )}
              />
              <TextInput style={[styles.input, { marginTop: 6 }]} value={item.description} onChangeText={(v) => updateItem(idx, 'description', v)} placeholder="Description" placeholderTextColor="#999" />
              <TextInput style={[styles.input, { marginTop: 6 }]} value={String(item.quantity)} onChangeText={(v) => updateItem(idx, 'quantity', v)} keyboardType="numeric" placeholder="Qty" placeholderTextColor="#999" />
            </View>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <Text style={styles.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#00695c' }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : (isEdit ? 'Update' : 'Create Delivery Note')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#00695c', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333' },
  picker: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  pickerText: { fontSize: 14, color: '#333' },
  itemCard: { backgroundColor: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemIndex: { fontSize: 13, fontWeight: '700', color: '#00695c' },
  removeBtn: { fontSize: 13, color: '#d32f2f', fontWeight: '600' },
  addBtn: { backgroundColor: '#e0f2f1', borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#b2dfdb', borderStyle: 'dashed' },
  addBtnText: { color: '#00695c', fontSize: 14, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, gap: 10 },
  readOnlyInput: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#888' },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default DeliveryNoteFormScreen;
