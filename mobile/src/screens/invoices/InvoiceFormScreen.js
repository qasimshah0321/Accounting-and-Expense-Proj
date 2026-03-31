import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { invoicesAPI, customersAPI, productsAPI, taxesAPI } from '../../services/api';
import LineItemsEditor, { emptyLine, calcLineTotal } from '../../components/LineItemsEditor';
import SearchableDropdown from '../../components/SearchableDropdown';

const InvoiceFormScreen = ({ route, navigation }) => {
  const editId = route.params?.invoiceId;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);

  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    invoice_no: '',
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
    shipping_charges: '0',
  });
  const [lineItems, setLineItems] = useState([emptyLine()]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custRes, prodRes, taxRes] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll(),
        taxesAPI.getAll().catch(() => ({ data: { taxes: [], items: [] } })),
      ]);
      setCustomers(custRes.data?.customers || custRes.data?.items || []);
      setProducts(prodRes.data?.products || prodRes.data?.items || []);
      const taxList = taxRes.data?.taxes || taxRes.data?.items || [];
      setTaxes(taxList.filter((t) => t.is_active !== false));

      if (isEdit) {
        const res = await invoicesAPI.getById(editId);
        const inv = res.data?.invoice || res.data;
        setForm({
          customer_id: inv.customer_id || '',
          customer_name: inv.customer_name || '',
          invoice_no: inv.invoice_no || '',
          invoice_date: (inv.invoice_date || '').slice(0, 10),
          due_date: (inv.due_date || '').slice(0, 10),
          notes: inv.notes || '',
          shipping_charges: String(inv.shipping_charges || '0'),
        });
        const lines = inv.line_items || inv.items || [];
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
          const nn = await invoicesAPI.getNextNumber();
          setForm((f) => ({ ...f, invoice_no: nn.data?.next_number || nn.data?.invoice_no || '' }));
        } catch (_) {}
        // Default due date 30 days from now
        const due = new Date();
        due.setDate(due.getDate() + 30);
        setForm((f) => ({ ...f, due_date: due.toISOString().slice(0, 10) }));
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    lineItems.forEach((line) => {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unit_price) || 0;
      const disc = parseFloat(line.discount) || 0;
      const taxRate = parseFloat(line.tax_rate) || 0;
      const base = qty * price;
      const discVal = base * (disc / 100);
      const afterDisc = base - discVal;
      const taxVal = afterDisc * (taxRate / 100);
      subtotal += base;
      discountAmount += discVal;
      taxAmount += taxVal;
    });
    const shipping = parseFloat(form.shipping_charges) || 0;
    const grandTotal = subtotal - discountAmount + taxAmount + shipping;
    return { subtotal, taxAmount, discountAmount, grandTotal };
  };

  const handleSave = async (status = 'draft') => {
    if (!form.customer_id) {
      Alert.alert('Validation', 'Please select a customer.');
      return;
    }
    if (lineItems.length === 0 || !lineItems[0].product_id) {
      Alert.alert('Validation', 'Please add at least one line item with a product.');
      return;
    }

    setSaving(true);
    try {
      const totals = calcTotals();
      const payload = {
        customer_id: form.customer_id,
        invoice_no: form.invoice_no,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        notes: form.notes,
        shipping_charges: parseFloat(form.shipping_charges) || 0,
        status,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount,
        grand_total: totals.grandTotal,
        line_items: lineItems.map((l) => ({
          product_id: l.product_id || null,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          tax_id: l.tax_id || null,
          tax_rate: parseFloat(l.tax_rate) || 0,
          discount: parseFloat(l.discount) || 0,
          total: calcLineTotal(l),
        })),
      };

      if (isEdit) {
        await invoicesAPI.update(editId, payload);
      } else {
        await invoicesAPI.create(payload);
      }
      Alert.alert('Success', `Invoice ${isEdit ? 'updated' : 'created'} successfully.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusAction = async (newStatus) => {
    if (!isEdit) return;
    try {
      await invoicesAPI.updateStatus(editId, newStatus);
      Alert.alert('Success', `Invoice status updated to ${newStatus}.`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const fmt = (v) => parseFloat(v || 0).toFixed(2);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  const totals = calcTotals();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>

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

          <Text style={styles.label}>Invoice Number</Text>
          <TextInput style={styles.readOnlyInput} value={form.invoice_no} editable={false} />

          <Text style={styles.label}>Invoice Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={form.invoice_date}
            onChangeText={(v) => setForm((f) => ({ ...f, invoice_date: v }))}
            placeholder="2026-01-01"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={form.due_date}
            onChangeText={(v) => setForm((f) => ({ ...f, due_date: v }))}
            placeholder="2026-01-31"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <LineItemsEditor
            items={lineItems}
            onChange={setLineItems}
            products={products}
            taxes={taxes}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Shipping Charges</Text>
          <TextInput
            style={styles.input}
            value={form.shipping_charges}
            onChangeText={(v) => setForm((f) => ({ ...f, shipping_charges: v }))}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.notes}
            onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder="Additional notes..."
            placeholderTextColor="#999"
            multiline
          />
        </View>

        <View style={styles.totalsSection}>
          <Row label="Subtotal" value={`$${fmt(totals.subtotal)}`} />
          <Row label="Discount" value={`-$${fmt(totals.discountAmount)}`} />
          <Row label="Tax" value={`$${fmt(totals.taxAmount)}`} />
          <Row label="Shipping" value={`$${fmt(parseFloat(form.shipping_charges) || 0)}`} />
          <View style={styles.divider} />
          <Row label="Grand Total" value={`$${fmt(totals.grandTotal)}`} bold />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#9e9e9e' }]}
            onPress={() => handleSave('draft')}
            disabled={saving}
          >
            <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save Draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#1a237e' }]}
            onPress={() => handleSave('sent')}
            disabled={saving}
          >
            <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save & Send'}</Text>
          </TouchableOpacity>
        </View>

        {isEdit && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#2e7d32' }]}
              onPress={() => handleStatusAction('approved')}
            >
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#1565c0' }]}
              onPress={() => handleStatusAction('sent')}
            >
              <Text style={styles.btnText}>Mark Sent</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Row = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#1a237e', fontSize: 16 }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10,
    padding: 16, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a237e', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333',
  },
  picker: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  pickerText: { fontSize: 14, color: '#333' },
  totalsSection: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10,
    padding: 16, elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  buttonRow: {
    flexDirection: 'row', marginHorizontal: 12, marginTop: 12, gap: 10,
  },
  readOnlyInput: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#888' },
  btn: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default InvoiceFormScreen;
