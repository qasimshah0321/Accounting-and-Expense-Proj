import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { billsAPI, vendorsAPI, productsAPI, taxesAPI } from '../../services/api';
import LineItemsEditor, { emptyLine, calcLineTotal } from '../../components/LineItemsEditor';
import SearchableDropdown from '../../components/SearchableDropdown';

const BillFormScreen = ({ route, navigation }) => {
  const editId = route.params?.billId;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);

  const [form, setForm] = useState({
    vendor_id: '',
    vendor_name: '',
    bill_no: '',
    vendor_invoice_no: '',
    bill_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
  });
  const [lineItems, setLineItems] = useState([emptyLine()]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vendRes, prodRes, taxRes] = await Promise.all([
        vendorsAPI.getAll(),
        productsAPI.getAll(),
        taxesAPI.getAll().catch(() => ({ data: { items: [] } })),
      ]);
      setVendors(vendRes.data?.vendors || vendRes.data?.items || []);
      setProducts(prodRes.data?.products || prodRes.data?.items || []);
      setTaxes((taxRes.data?.taxes || taxRes.data?.items || []).filter((t) => t.is_active !== false));

      if (isEdit) {
        const res = await billsAPI.getById(editId);
        const bill = res.data?.bill || res.data;
        setForm({
          vendor_id: bill.vendor_id || '',
          vendor_name: bill.vendor_name || '',
          bill_no: bill.bill_no || '',
          vendor_invoice_no: bill.vendor_invoice_no || '',
          bill_date: (bill.bill_date || '').slice(0, 10),
          due_date: (bill.due_date || '').slice(0, 10),
          notes: bill.notes || '',
        });
        const lines = bill.line_items || bill.items || [];
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
          const nn = await billsAPI.getNextNumber();
          setForm((f) => ({ ...f, bill_no: nn.data?.next_number || nn.data?.bill_no || '' }));
        } catch (_) {}
        const due = new Date(); due.setDate(due.getDate() + 30);
        setForm((f) => ({ ...f, due_date: due.toISOString().slice(0, 10) }));
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
      subtotal += base;
      discountAmount += discVal;
      taxAmount += (base - discVal) * (taxRate / 100);
    });
    return { subtotal, taxAmount, discountAmount, totalAmount: subtotal - discountAmount + taxAmount };
  };

  const handleSave = async (status = 'draft') => {
    if (!form.vendor_id) { Alert.alert('Validation', 'Select a vendor.'); return; }
    if (!lineItems[0]?.product_id) { Alert.alert('Validation', 'Add at least one line item.'); return; }

    setSaving(true);
    try {
      const totals = calcTotals();
      const payload = {
        vendor_id: form.vendor_id,
        bill_no: form.bill_no,
        vendor_invoice_no: form.vendor_invoice_no,
        bill_date: form.bill_date,
        due_date: form.due_date,
        notes: form.notes,
        status,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount,
        total_amount: totals.totalAmount,
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

      if (isEdit) { await billsAPI.update(editId, payload); }
      else { await billsAPI.create(payload); }

      Alert.alert('Success', `Bill ${isEdit ? 'updated' : 'created'}.`);
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
      await billsAPI.updateStatus(editId, newStatus);
      Alert.alert('Success', `Bill status updated to ${newStatus}.`);
      navigation.goBack();
    } catch (err) { Alert.alert('Error', err.message); }
  };

  const fmt = (v) => parseFloat(v || 0).toFixed(2);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;

  const totals = calcTotals();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Details</Text>

          <SearchableDropdown
            label="Vendor"
            items={vendors}
            selectedValue={form.vendor_id ? String(form.vendor_id) : ''}
            onSelect={(v) => setForm((f) => ({ ...f, vendor_id: String(v.id), vendor_name: v.name }))}
            labelKey="name"
            valueKey="id"
            subLabelKey="email"
            placeholder="Select vendor..."
          />

          <Text style={styles.label}>Bill Number</Text>
          <TextInput style={styles.readOnlyInput} value={form.bill_no} editable={false} />

          <Text style={styles.label}>Vendor Invoice #</Text>
          <TextInput style={styles.input} value={form.vendor_invoice_no} onChangeText={(v) => setForm((f) => ({ ...f, vendor_invoice_no: v }))} placeholder="Vendor ref" placeholderTextColor="#999" />

          <Text style={styles.label}>Bill Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.bill_date} onChangeText={(v) => setForm((f) => ({ ...f, bill_date: v }))} placeholder="2026-01-01" placeholderTextColor="#999" />

          <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.due_date} onChangeText={(v) => setForm((f) => ({ ...f, due_date: v }))} placeholder="2026-01-31" placeholderTextColor="#999" />
        </View>

        <View style={styles.section}>
          <LineItemsEditor items={lineItems} onChange={setLineItems} products={products} taxes={taxes} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Notes..." placeholderTextColor="#999" multiline />
        </View>

        <View style={styles.totalsSection}>
          <RowItem label="Subtotal" value={`$${fmt(totals.subtotal)}`} />
          <RowItem label="Discount" value={`-$${fmt(totals.discountAmount)}`} />
          <RowItem label="Tax" value={`$${fmt(totals.taxAmount)}`} />
          <View style={styles.divider} />
          <RowItem label="Total Amount" value={`$${fmt(totals.totalAmount)}`} bold />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#9e9e9e' }]} onPress={() => handleSave('draft')} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save Draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#c62828' }]} onPress={() => handleSave('approved')} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save & Approve'}</Text>
          </TouchableOpacity>
        </View>

        {isEdit && (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#2e7d32' }]} onPress={() => handleStatusAction('approved')}>
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#6a1b9a' }]} onPress={() => handleStatusAction('posted')}>
              <Text style={styles.btnText}>Post</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const RowItem = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#c62828', fontSize: 16 }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#c62828', marginBottom: 12 },
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

export default BillFormScreen;
