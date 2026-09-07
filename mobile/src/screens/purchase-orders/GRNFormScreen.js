import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { grnAPI, vendorsAPI, purchaseOrdersAPI, productsAPI, taxesAPI } from '../../services/api';
import LineItemsEditor, { emptyLine } from '../../components/LineItemsEditor';
import SearchableDropdown from '../../components/SearchableDropdown';

const GRNFormScreen = ({ route, navigation }) => {
  const editGrn = route.params?.grn;
  const isEdit = !!editGrn;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);

  const [form, setForm] = useState({
    vendor_id: editGrn?.vendor_id || '',
    vendor_name: editGrn?.vendor_name || '',
    purchase_order_id: editGrn?.purchase_order_id || '',
    po_no: editGrn?.po_no || '',
    grn_no: editGrn?.grn_no || '',
    grn_date: editGrn?.grn_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    expected_delivery_date: editGrn?.expected_delivery_date?.slice(0, 10) || '',
    notes: editGrn?.notes || '',
  });

  const [lineItems, setLineItems] = useState(
    editGrn?.line_items?.length
      ? editGrn.line_items.map((l) => ({
          product_id: l.product_id || '',
          product_name: l.product_name || '',
          description: l.description || '',
          quantity: String(l.received_qty || l.quantity || 1),
          unit_price: String(l.rate || l.unit_price || 0),
          tax_id: l.tax_id || '',
          tax_rate: parseFloat(l.tax_rate) || 0,
          discount: String(l.discount || 0),
        }))
      : [emptyLine()]
  );

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vRes, poRes, pRes, tRes] = await Promise.all([
        vendorsAPI.getAll(),
        purchaseOrdersAPI.getAll(),
        productsAPI.getAll(),
        taxesAPI.getAll().catch(() => ({ data: {} })),
      ]);
      setVendors(vRes.data?.vendors || vRes.data?.items || []);
      setPurchaseOrders(poRes.data?.purchase_orders || poRes.data?.items || []);
      setProducts(pRes.data?.products || pRes.data?.items || []);
      setTaxes((tRes.data?.taxes || tRes.data?.items || []).filter((t) => !!t.is_active));

      if (!isEdit) {
        try {
          const nn = await grnAPI.getNextNumber();
          setForm((f) => ({ ...f, grn_no: nn.data?.next_number || nn.data?.grn_no || '' }));
        } catch (_) {}
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); }
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
    return { subtotal, taxAmount, discountAmount, grandTotal: subtotal - discountAmount + taxAmount };
  };

  const onSelectPO = (po) => {
    setForm((f) => ({
      ...f,
      purchase_order_id: po.id,
      po_no: po.po_no || po.purchase_order_no || '',
      vendor_id: po.vendor_id || f.vendor_id,
      vendor_name: po.vendor_name || f.vendor_name,
    }));
    // Auto-populate line items from PO
    if (Array.isArray(po.line_items) && po.line_items.length) {
      setLineItems(po.line_items.map((l) => ({
        product_id: l.product_id || '',
        product_name: l.product_name || '',
        description: l.description || '',
        quantity: String(l.ordered_qty || l.quantity || 1),
        unit_price: String(l.rate || l.unit_price || 0),
        tax_id: l.tax_id || '',
        tax_rate: parseFloat(l.tax_rate) || 0,
        discount: String(l.discount || 0),
      })));
    }
  };

  const handleSave = async () => {
    if (!form.vendor_id) return Alert.alert('Validation', 'Select a vendor.');
    if (!lineItems[0]?.product_id && !lineItems[0]?.description) return Alert.alert('Validation', 'Add at least one line item.');

    setSaving(true);
    try {
      const payload = {
        vendor_id: form.vendor_id,
        ...(form.purchase_order_id && { purchase_order_id: form.purchase_order_id }),
        grn_no: form.grn_no,
        grn_date: form.grn_date,
        ...(form.expected_delivery_date && { expected_delivery_date: form.expected_delivery_date }),
        ...(form.notes.trim() && { notes: form.notes.trim() }),
        status: 'draft',
        line_items: lineItems
          .filter((l) => l.description?.trim() || l.product_id)
          .map((l) => ({
            ...(l.product_id && { product_id: l.product_id }),
            description: l.description?.trim() || l.product_name || 'Item',
            received_qty: parseFloat(l.quantity) || 1,
            rate: parseFloat(l.unit_price) || 0,
            ...(l.tax_id && { tax_id: l.tax_id }),
            tax_rate: parseFloat(l.tax_rate) || 0,
            discount: parseFloat(l.discount) || 0,
          })),
      };

      if (isEdit) await grnAPI.update(editGrn.id, payload);
      else await grnAPI.create(payload);

      Alert.alert('Success', `GRN ${isEdit ? 'updated' : 'created'}`);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#e65100" /></View>;

  const totals = calcTotals();
  const fmt = (v) => parseFloat(v || 0).toFixed(2);
  const filteredPOs = form.vendor_id
    ? purchaseOrders.filter((po) => String(po.vendor_id) === String(form.vendor_id))
    : purchaseOrders;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GRN Details</Text>

          <SearchableDropdown
            label="Vendor *"
            items={vendors}
            selectedValue={form.vendor_id ? String(form.vendor_id) : ''}
            onSelect={(v) => setForm((f) => ({ ...f, vendor_id: String(v.id), vendor_name: v.name }))}
            labelKey="name"
            valueKey="id"
            placeholder="Select vendor..."
          />

          <SearchableDropdown
            label="PO Reference (optional)"
            items={filteredPOs.map((po) => ({ ...po, name: po.po_no || po.purchase_order_no, email: po.vendor_name }))}
            selectedValue={form.purchase_order_id ? String(form.purchase_order_id) : ''}
            onSelect={onSelectPO}
            labelKey="name"
            valueKey="id"
            subLabelKey="email"
            placeholder="Select purchase order..."
          />

          <Text style={styles.label}>GRN Number</Text>
          <TextInput style={styles.readOnlyInput} value={form.grn_no} editable={false} />

          <Text style={styles.label}>GRN Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.grn_date} onChangeText={(v) => setForm((f) => ({ ...f, grn_date: v }))} placeholder="2026-01-01" />

          <Text style={styles.label}>Expected Delivery Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.expected_delivery_date} onChangeText={(v) => setForm((f) => ({ ...f, expected_delivery_date: v }))} placeholder="2026-01-15" />
        </View>

        <View style={styles.section}>
          <LineItemsEditor items={lineItems} onChange={setLineItems} products={products} taxes={taxes} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder="Notes..." multiline />
        </View>

        <View style={styles.totalsSection}>
          <RowItem label="Subtotal" value={`$${fmt(totals.subtotal)}`} />
          <RowItem label="Discount" value={`-$${fmt(totals.discountAmount)}`} />
          <RowItem label="Tax" value={`$${fmt(totals.taxAmount)}`} />
          <View style={styles.divider} />
          <RowItem label="Grand Total" value={`$${fmt(totals.grandTotal)}`} bold />
        </View>

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving...' : isEdit ? 'Update GRN' : 'Create GRN'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const RowItem = ({ label, value, bold }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, bold && { fontWeight: '700' }]}>{label}</Text>
    <Text style={[styles.rowValue, bold && { fontWeight: '800', color: '#e65100', fontSize: 16 }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#e65100', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  readOnlyInput: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#888' },
  totalsSection: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, borderRadius: 10, padding: 16, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  btn: { marginHorizontal: 12, marginTop: 14, backgroundColor: '#e65100', paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default GRNFormScreen;
