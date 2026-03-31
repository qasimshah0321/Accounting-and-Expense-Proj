import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { salesOrdersAPI, customersAPI, productsAPI, taxesAPI, shipViaAPI } from '../../services/api';
import LineItemsEditor, { emptyLine, calcLineTotal } from '../../components/LineItemsEditor';
import SearchableDropdown from '../../components/SearchableDropdown';

const SalesOrderFormScreen = ({ route, navigation }) => {
  const editId = route.params?.salesOrderId;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [shipVias, setShipVias] = useState([]);

  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    so_no: '',
    order_date: new Date().toISOString().slice(0, 10),
    delivery_date: '',
    ship_via_id: '',
    ship_via_name: '',
    notes: '',
    shipping_charges: '0',
  });
  const [lineItems, setLineItems] = useState([emptyLine()]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [custRes, prodRes, taxRes, svRes] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll(),
        taxesAPI.getAll().catch(() => ({ data: { items: [] } })),
        shipViaAPI.getAll().catch(() => ({ data: { items: [] } })),
      ]);
      setCustomers(custRes.data?.customers || custRes.data?.items || []);
      setProducts(prodRes.data?.products || prodRes.data?.items || []);
      setTaxes((taxRes.data?.taxes || taxRes.data?.items || []).filter((t) => t.is_active !== false));
      setShipVias((svRes.data?.ship_vias || svRes.data?.items || []).filter((s) => s.is_active !== false));

      if (isEdit) {
        const res = await salesOrdersAPI.getById(editId);
        const so = res.data?.sales_order || res.data;
        setForm({
          customer_id: so.customer_id || '',
          customer_name: so.customer_name || '',
          so_no: so.so_no || so.sales_order_no || '',
          order_date: (so.order_date || so.so_date || '').slice(0, 10),
          delivery_date: (so.delivery_date || so.expected_date || '').slice(0, 10),
          ship_via_id: so.ship_via_id || '',
          ship_via_name: so.ship_via_name || '',
          notes: so.notes || '',
          shipping_charges: String(so.shipping_charges || '0'),
        });
        const lines = so.line_items || so.items || [];
        if (lines.length > 0) {
          setLineItems(lines.map((l) => ({
            product_id: l.product_id || '',
            product_name: l.product_name || '',
            description: l.description || '',
            quantity: String(l.quantity || 1),
            unit_price: String(l.unit_price || 0),
            tax_id: l.tax_id || '',
            tax_rate: parseFloat(l.tax_rate) || 0,
            discount: String(l.discount || 0),
          })));
        }
      } else {
        try {
          const nn = await salesOrdersAPI.getNextNumber();
          setForm((f) => ({ ...f, so_no: nn.data?.next_number || nn.data?.so_no || '' }));
        } catch (_) {}
        const del = new Date();
        del.setDate(del.getDate() + 14);
        setForm((f) => ({ ...f, delivery_date: del.toISOString().slice(0, 10) }));
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcTotals = () => {
    let subtotal = 0, taxAmount = 0, discountAmount = 0;
    lineItems.forEach((line) => {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unit_price) || 0;
      const disc = parseFloat(line.discount) || 0;
      const taxRate = parseFloat(line.tax_rate) || 0;
      const base = qty * price;
      const discVal = base * (disc / 100);
      const afterDisc = base - discVal;
      subtotal += base;
      discountAmount += discVal;
      taxAmount += afterDisc * (taxRate / 100);
    });
    const shipping = parseFloat(form.shipping_charges) || 0;
    return { subtotal, taxAmount, discountAmount, grandTotal: subtotal - discountAmount + taxAmount + shipping };
  };

  const handleSave = async () => {
    if (!form.customer_id) { Alert.alert('Validation', 'Please select a customer.'); return; }
    if (!lineItems[0]?.product_id) { Alert.alert('Validation', 'Add at least one line item.'); return; }

    setSaving(true);
    try {
      const totals = calcTotals();
      const payload = {
        customer_id: form.customer_id,
        sales_order_no: form.so_no,
        order_date: form.order_date,
        expected_delivery_date: form.delivery_date || undefined,
        ...(form.ship_via_id && { ship_via_id: form.ship_via_id }),
        ...(form.notes.trim() && { notes: form.notes.trim() }),
        status: 'draft',
        line_items: lineItems
          .filter(l => l.description?.trim() || l.product_id)
          .map((l) => ({
            ...(l.product_id && { product_id: l.product_id }),
            description: l.description?.trim() || l.product_name || 'Item',
            ordered_qty: parseFloat(l.quantity) || 1,
            rate: parseFloat(l.unit_price) || 0,
            ...(l.tax_id && { tax_id: l.tax_id }),
            tax_rate: parseFloat(l.tax_rate) || 0,
            discount: parseFloat(l.discount) || 0,
          })),
      };

      if (isEdit) { await salesOrdersAPI.update(editId, payload); }
      else { await salesOrdersAPI.create(payload); }

      Alert.alert('Success', `Sales Order ${isEdit ? 'updated' : 'created'}.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (v) => parseFloat(v || 0).toFixed(2);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;

  const totals = calcTotals();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sales Order Details</Text>

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

          <Text style={styles.label}>SO Number</Text>
          <TextInput style={styles.readOnlyInput} value={form.so_no} editable={false} />

          <Text style={styles.label}>Order Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.order_date} onChangeText={(v) => setForm((f) => ({ ...f, order_date: v }))} placeholder="2026-01-01" placeholderTextColor="#999" />

          <Text style={styles.label}>Delivery Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.delivery_date} onChangeText={(v) => setForm((f) => ({ ...f, delivery_date: v }))} placeholder="2026-01-15" placeholderTextColor="#999" />

          <Text style={styles.label}>Ship Via</Text>
          <TouchableOpacity style={styles.picker} onPress={() => {
            const opts = shipVias.map((s) => ({
              text: s.name, onPress: () => setForm((f) => ({ ...f, ship_via_id: s.id, ship_via_name: s.name })),
            }));
            opts.unshift({ text: 'None', onPress: () => setForm((f) => ({ ...f, ship_via_id: '', ship_via_name: '' })) });
            opts.push({ text: 'Cancel', style: 'cancel' });
            Alert.alert('Select Ship Via', '', opts);
          }}>
            <Text style={[styles.pickerText, !form.ship_via_name && { color: '#999' }]}>
              {form.ship_via_name || 'Select shipping method...'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <LineItemsEditor items={lineItems} onChange={setLineItems} products={products} taxes={taxes} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Shipping Charges</Text>
          <TextInput style={styles.input} value={form.shipping_charges} onChangeText={(v) => setForm((f) => ({ ...f, shipping_charges: v }))} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#999" />
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Notes..." placeholderTextColor="#999" multiline />
        </View>

        <View style={styles.totalsSection}>
          <RowItem label="Subtotal" value={`$${fmt(totals.subtotal)}`} />
          <RowItem label="Discount" value={`-$${fmt(totals.discountAmount)}`} />
          <RowItem label="Tax" value={`$${fmt(totals.taxAmount)}`} />
          <RowItem label="Shipping" value={`$${fmt(parseFloat(form.shipping_charges) || 0)}`} />
          <View style={styles.divider} />
          <RowItem label="Grand Total" value={`$${fmt(totals.grandTotal)}`} bold />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#2e7d32' }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : (isEdit ? 'Update' : 'Create Sales Order')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const RowItem = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#2e7d32', fontSize: 16 }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2e7d32', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333' },
  picker: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  pickerText: { fontSize: 14, color: '#333' },
  totalsSection: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  buttonRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, gap: 10 },
  readOnlyInput: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#888' },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default SalesOrderFormScreen;
