import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Modal, FlatList,
} from 'react-native';
import { invoicesAPI, customersAPI, productsAPI, taxesAPI, salesOrdersAPI } from '../../services/api';
import LineItemsEditor, { emptyLine, calcLineTotal } from '../../components/LineItemsEditor';
import SearchableDropdown from '../../components/SearchableDropdown';

// Convert LineItemsEditor's internal format → backend payload format
const toPayloadLine = (l) => {
  const qty = parseFloat(l.quantity) || 1;
  const rate = parseFloat(l.unit_price) || 0;
  const discPct = parseFloat(l.discount) || 0;
  const discAmt = qty * rate * (discPct / 100);
  const taxRate = parseFloat(l.tax_rate) || 0;
  const taxAmt = (qty * rate - discAmt) * (taxRate / 100);
  return {
    product_id: l.product_id || null,
    sku: l.sku || undefined,
    description: l.description,
    quantity: qty,
    rate,
    discount_per_item: parseFloat(discAmt.toFixed(4)),
    tax_id: l.tax_id || null,
    tax_rate: taxRate,
    tax_amount: parseFloat(taxAmt.toFixed(4)),
    sales_order_line_item_id: l.sales_order_line_item_id || undefined,
  };
};

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

  // SO Picker state
  const [soPickerVisible, setSoPickerVisible] = useState(false);
  const [soPickerItems, setSoPickerItems] = useState([]);   // full SO objects with line_items
  const [soPickerLoading, setSoPickerLoading] = useState(false);
  const [selectedSoIds, setSelectedSoIds] = useState([]);

  // Invoice type modal
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [linkedSoData, setLinkedSoData] = useState([]);

  // Partial invoice modal
  const [partialModalVisible, setPartialModalVisible] = useState(false);
  const [partialItems, setPartialItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [custRes, prodRes, taxRes] = await Promise.all([
        customersAPI.getAll(),
        productsAPI.getAll(),
        taxesAPI.getAll().catch(() => ({ data: { taxes: [] } })),
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
            product_name: l.description || '',
            description: l.description || '',
            quantity: String(l.quantity || 1),
            unit_price: String(l.rate || l.unit_price || 0),
            tax_id: l.tax_id || '',
            tax_rate: parseFloat(l.tax_rate) || 0,
            discount: '0',
            sku: l.sku || '',
            sales_order_line_item_id: l.sales_order_line_item_id || null,
          })));
        }
      } else {
        try {
          const nn = await invoicesAPI.getNextNumber();
          setForm((f) => ({ ...f, invoice_no: nn.data?.next_number || nn.data?.invoice_no || '' }));
        } catch (_) {}
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

  // When customer is selected, fetch their confirmed SOs
  const handleCustomerSelect = useCallback(async (customer) => {
    setForm((f) => ({ ...f, customer_id: String(customer.id), customer_name: customer.name }));
    if (!customer.id) return;

    setSoPickerLoading(true);
    try {
      const res = await salesOrdersAPI.getByCustomer(customer.id);
      const orders = res.data?.sales_orders || res.data?.orders || res.data || [];

      // Only confirmed/in_progress SOs that still have backlog
      const confirmed = orders.filter(
        (o) => o.status === 'confirmed' || o.status === 'in_progress'
      );
      if (confirmed.length === 0) return;

      // Fetch full details (includes line_items with invoiced_qty)
      const detailed = await Promise.all(
        confirmed.map((o) =>
          salesOrdersAPI.getById(o.id).then((r) => r.data?.order || r.data || null).catch(() => null)
        )
      );

      // Filter SOs that still have at least one line item with backlog
      const withBacklog = detailed.filter((so) => {
        if (!so) return false;
        return (so.line_items || []).some(
          (li) => (parseFloat(li.ordered_qty) || 0) > (parseFloat(li.invoiced_qty) || 0)
        );
      });

      if (withBacklog.length > 0) {
        setSoPickerItems(withBacklog);
        setSelectedSoIds([]);
        setSoPickerVisible(true);
      }
    } catch (_) {
      // Non-critical — user can still create invoice manually
    } finally {
      setSoPickerLoading(false);
    }
  }, []);

  const toggleSoSelection = (soId) => {
    setSelectedSoIds((prev) =>
      prev.includes(soId) ? prev.filter((id) => id !== soId) : [...prev, soId]
    );
  };

  const handleSoPickerProceed = () => {
    if (selectedSoIds.length === 0) {
      Alert.alert('Select SO', 'Please select at least one sales order.');
      return;
    }
    const selected = soPickerItems.filter((so) => selectedSoIds.includes(so.id));
    setLinkedSoData(selected);
    // Set reference_no to first SO number
    if (selected[0]?.sales_order_no) {
      setForm((f) => ({ ...f, reference_no: selected[0].sales_order_no }));
    }
    setSoPickerVisible(false);
    setTypeModalVisible(true);
  };

  // Full invoice: invoice all remaining backlog
  const handleFullInvoice = () => {
    setTypeModalVisible(false);
    const items = [];
    for (const so of linkedSoData) {
      for (const li of (so.line_items || [])) {
        const ordered = parseFloat(li.ordered_qty) || 0;
        const invoiced = parseFloat(li.invoiced_qty) || 0;
        const qty = ordered - invoiced;
        if (qty > 0) {
          items.push({
            product_id: li.product_id || '',
            product_name: li.description || '',
            description: li.description || '',
            quantity: String(qty),
            unit_price: String(parseFloat(li.rate) || 0),
            tax_id: li.tax_id || '',
            tax_rate: parseFloat(li.tax_rate) || 0,
            discount: '0',
            sku: li.sku || '',
            sales_order_line_item_id: li.id,
          });
        }
      }
    }
    if (items.length > 0) setLineItems(items);
  };

  // Partial invoice: let user specify qty per line item
  const handlePartialInvoice = () => {
    setTypeModalVisible(false);
    const items = [];
    for (const so of linkedSoData) {
      for (const li of (so.line_items || [])) {
        const ordered = parseFloat(li.ordered_qty) || 0;
        const invoiced = parseFloat(li.invoiced_qty) || 0;
        const backlog = ordered - invoiced;
        if (backlog > 0) {
          items.push({
            soLineItemId: li.id,
            soNo: so.sales_order_no || '',
            description: li.description || '',
            sku: li.sku || '',
            product_id: li.product_id || '',
            tax_id: li.tax_id || '',
            tax_rate: parseFloat(li.tax_rate) || 0,
            rate: parseFloat(li.rate) || 0,
            ordered,
            invoiced,
            backlog,
            invoiceQty: String(backlog), // default to full backlog, user can edit down
          });
        }
      }
    }
    setPartialItems(items);
    setPartialModalVisible(true);
  };

  const applyPartialInvoice = () => {
    const valid = partialItems.filter((pi) => parseFloat(pi.invoiceQty) > 0);
    if (valid.length === 0) {
      Alert.alert('Validation', 'Enter invoice quantity for at least one item.');
      return;
    }
    const items = valid.map((pi) => ({
      product_id: pi.product_id || '',
      product_name: pi.description || '',
      description: pi.description || '',
      quantity: String(Math.min(parseFloat(pi.invoiceQty) || 0, pi.backlog)),
      unit_price: String(pi.rate),
      tax_id: pi.tax_id || '',
      tax_rate: pi.tax_rate || 0,
      discount: '0',
      sku: pi.sku || '',
      sales_order_line_item_id: pi.soLineItemId,
    }));
    setLineItems(items);
    setPartialModalVisible(false);
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

  const handleSave = async (status = 'draft') => {
    if (!form.customer_id) { Alert.alert('Validation', 'Please select a customer.'); return; }
    const validItems = lineItems.filter((l) => l.description?.trim());
    if (validItems.length === 0) { Alert.alert('Validation', 'Add at least one line item.'); return; }

    setSaving(true);
    try {
      const payload = {
        customer_id: form.customer_id,
        invoice_no: form.invoice_no,
        invoice_date: form.invoice_date,
        due_date: form.due_date,
        notes: form.notes,
        shipping_charges: parseFloat(form.shipping_charges) || 0,
        status,
        line_items: validItems.map(toPayloadLine),
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
    return <View style={styles.centered}><ActivityIndicator size="large" color="#1a237e" /></View>;
  }

  const totals = calcTotals();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>

          <SearchableDropdown
            label="Customer"
            items={customers}
            selectedValue={form.customer_id ? String(form.customer_id) : ''}
            onSelect={handleCustomerSelect}
            labelKey="name"
            valueKey="id"
            subLabelKey="email"
            placeholder="Select customer..."
          />
          {soPickerLoading && (
            <View style={styles.soLoadingRow}>
              <ActivityIndicator size="small" color="#1a237e" />
              <Text style={styles.soLoadingText}>Checking open sales orders...</Text>
            </View>
          )}

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
          <LineItemsEditor items={lineItems} onChange={setLineItems} products={products} taxes={taxes} />
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

      {/* ── SO Picker Modal ── */}
      <Modal visible={soPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Sales Orders</Text>
            <TouchableOpacity onPress={() => setSoPickerVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>Select one or more SOs to invoice</Text>
          <FlatList
            data={soPickerItems}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            renderItem={({ item }) => {
              const isSelected = selectedSoIds.includes(item.id);
              const totalBacklog = (item.line_items || []).reduce((s, li) => {
                return s + Math.max(0, (parseFloat(li.ordered_qty) || 0) - (parseFloat(li.invoiced_qty) || 0));
              }, 0);
              return (
                <TouchableOpacity
                  style={[styles.soItem, isSelected && styles.soItemSelected]}
                  onPress={() => toggleSoSelection(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.soCheckbox}>
                    <Text style={styles.soCheckboxText}>{isSelected ? '☑' : '☐'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.soItemNo}>{item.sales_order_no}</Text>
                    <Text style={styles.soItemSub}>
                      {(item.line_items || []).length} item(s) · Backlog qty: {totalBacklog}
                    </Text>
                    <Text style={[styles.soItemStatus, { color: '#1a237e' }]}>
                      Status: {item.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#9e9e9e', flex: 1 }]}
              onPress={() => setSoPickerVisible(false)}
            >
              <Text style={styles.btnText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#1a237e', flex: 2 }]}
              onPress={handleSoPickerProceed}
            >
              <Text style={styles.btnText}>
                Proceed ({selectedSoIds.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Invoice Type Modal ── */}
      <Modal visible={typeModalVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.typeCard}>
            <Text style={styles.typeTitle}>Invoice Type</Text>
            <Text style={styles.typeSub}>
              How would you like to invoice the {linkedSoData.length} selected order{linkedSoData.length !== 1 ? 's' : ''}?
            </Text>
            <TouchableOpacity
              style={[styles.typeBtn, { backgroundColor: '#1a237e' }]}
              onPress={handleFullInvoice}
            >
              <Text style={styles.typeBtnText}>📄  Full Invoice</Text>
              <Text style={styles.typeBtnSub}>Invoice all remaining backlog</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, { backgroundColor: '#3949ab' }]}
              onPress={handlePartialInvoice}
            >
              <Text style={styles.typeBtnText}>✏️  Partial Invoice</Text>
              <Text style={styles.typeBtnSub}>Choose quantity per line item</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTypeModalVisible(false)} style={styles.typeCancelBtn}>
              <Text style={styles.typeCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Partial Invoice Modal ── */}
      <Modal visible={partialModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Partial Invoice</Text>
            <TouchableOpacity onPress={() => setPartialModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>Enter quantity to invoice for each item</Text>
          <ScrollView style={{ flex: 1 }}>
            {partialItems.map((pi, idx) => (
              <View key={idx} style={styles.partialRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.partialDesc} numberOfLines={1}>{pi.description}</Text>
                  <Text style={styles.partialMeta}>SO: {pi.soNo}</Text>
                  <View style={styles.partialCounts}>
                    <Text style={styles.partialCount}>Ordered: {pi.ordered}</Text>
                    <Text style={styles.partialCount}>Invoiced: {pi.invoiced}</Text>
                    <Text style={[styles.partialCount, { color: '#1a237e', fontWeight: '700' }]}>
                      Backlog: {pi.backlog}
                    </Text>
                  </View>
                </View>
                <View style={styles.partialQtyBox}>
                  <Text style={styles.partialQtyLabel}>Invoice Qty</Text>
                  <TextInput
                    style={styles.partialQtyInput}
                    value={pi.invoiceQty}
                    onChangeText={(v) => {
                      const capped = Math.min(parseFloat(v) || 0, pi.backlog);
                      setPartialItems((prev) =>
                        prev.map((p, i) => i === idx ? { ...p, invoiceQty: String(capped || v) } : p)
                      );
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#9e9e9e', flex: 1 }]}
              onPress={() => setPartialModalVisible(false)}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#2e7d32', flex: 2 }]}
              onPress={applyPartialInvoice}
            >
              <Text style={styles.btnText}>Apply to Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10,
    borderRadius: 10, padding: 16, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a237e', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#888',
  },
  soLoadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  soLoadingText: { fontSize: 12, color: '#666' },
  totalsSection: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10,
    borderRadius: 10, padding: 16, elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  buttonRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal shared
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1a237e', paddingHorizontal: 20, paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalClose: { fontSize: 20, color: '#fff', fontWeight: '700' },
  modalSub: {
    fontSize: 13, color: '#555', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#e8eaf6',
  },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },

  // SO Picker
  soItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  soItemSelected: { backgroundColor: '#e8eaf6' },
  soCheckbox: { marginRight: 12 },
  soCheckboxText: { fontSize: 22, color: '#1a237e' },
  soItemNo: { fontSize: 15, fontWeight: '700', color: '#1a237e' },
  soItemSub: { fontSize: 12, color: '#666', marginTop: 2 },
  soItemStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Type modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  typeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%',
    elevation: 8,
  },
  typeTitle: { fontSize: 18, fontWeight: '800', color: '#1a237e', textAlign: 'center', marginBottom: 6 },
  typeSub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20 },
  typeBtn: {
    borderRadius: 12, padding: 16, marginBottom: 10, alignItems: 'center',
  },
  typeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  typeBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  typeCancelBtn: { alignItems: 'center', paddingVertical: 12 },
  typeCancelText: { color: '#666', fontSize: 14, fontWeight: '600' },

  // Partial modal
  partialRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14,
    elevation: 1,
  },
  partialDesc: { fontSize: 14, fontWeight: '700', color: '#1a237e' },
  partialMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  partialCounts: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  partialCount: { fontSize: 12, color: '#555' },
  partialQtyBox: { marginLeft: 12, alignItems: 'center' },
  partialQtyLabel: { fontSize: 11, color: '#555', marginBottom: 4 },
  partialQtyInput: {
    width: 70, borderWidth: 2, borderColor: '#1a237e', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, fontWeight: '700',
    color: '#1a237e', textAlign: 'center',
  },
});

export default InvoiceFormScreen;
