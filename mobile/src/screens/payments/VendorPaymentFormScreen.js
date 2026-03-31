import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { vendorPaymentsAPI, vendorsAPI, billsAPI } from '../../services/api';
import SearchableDropdown from '../../components/SearchableDropdown';

const METHODS = ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Other'];

export default function VendorPaymentFormScreen({ route, navigation }) {
  const existing = route.params?.payment;
  const [vendors, setVendors] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendor_id: existing?.vendor_id || '',
    vendor_name: existing?.vendor_name || '',
    payment_date: existing?.payment_date?.slice(0,10) || new Date().toISOString().slice(0,10),
    amount: existing?.amount?.toString() || '',
    payment_method: existing?.payment_method || 'Cash',
    reference_no: existing?.reference_no || '',
    notes: existing?.notes || '',
    bill_id: existing?.bill_id || '',
  });

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit Payment' : 'New Vendor Payment' });
    loadVendors();
  }, []);

  useEffect(() => {
    if (form.vendor_id) loadBills(form.vendor_id);
  }, [form.vendor_id]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await vendorsAPI.getAll();
      setVendors(res.data?.vendors || []);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const loadBills = async (vendorId) => {
    try {
      const res = await billsAPI.getAll();
      const all = res.data?.bills || [];
      setBills(all.filter(b => String(b.vendor_id) === String(vendorId) && b.amount_due > 0));
    } catch {}
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const save = async () => {
    if (!form.vendor_id) return Alert.alert('Validation', 'Please select a vendor');
    if (!form.amount || parseFloat(form.amount) <= 0) return Alert.alert('Validation', 'Enter a valid amount');
    try {
      setSaving(true);
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        vendor_id: parseInt(form.vendor_id),
        bill_id: form.bill_id ? parseInt(form.bill_id) : null,
      };
      if (existing) await vendorPaymentsAPI.update(existing.id, payload);
      else await vendorPaymentsAPI.create(payload);
      navigation.goBack();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <SearchableDropdown
          label="Vendor *"
          items={vendors}
          selectedValue={form.vendor_id ? String(form.vendor_id) : ''}
          onSelect={(v) => { set('vendor_id', v.id); set('vendor_name', v.name); }}
          labelKey="name"
          valueKey="id"
          subLabelKey="email"
          placeholder="Select vendor..."
        />

        <Text style={styles.label}>Payment Date *</Text>
        <TextInput style={styles.input} value={form.payment_date} onChangeText={v => set('payment_date', v)} placeholder="YYYY-MM-DD" />

        <Text style={styles.label}>Amount *</Text>
        <TextInput style={styles.input} value={form.amount} onChangeText={v => set('amount', v)} keyboardType="decimal-pad" placeholder="0.00" />

        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.row}>
          {METHODS.map(m => (
            <TouchableOpacity key={m} style={[styles.chip, form.payment_method === m && styles.chipActive]} onPress={() => set('payment_method', m)}>
              <Text style={[styles.chipTxt, form.payment_method === m && styles.chipTxtActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Reference No</Text>
        <TextInput style={styles.input} value={form.reference_no} onChangeText={v => set('reference_no', v)} placeholder="Check #, Transaction ID..." />

        {bills.length > 0 && (
          <>
            <Text style={styles.label}>Apply to Bill (optional)</Text>
            <TouchableOpacity style={[styles.chip, !form.bill_id && styles.chipActive]} onPress={() => set('bill_id', '')}>
              <Text style={[styles.chipTxt, !form.bill_id && styles.chipTxtActive]}>None</Text>
            </TouchableOpacity>
            {bills.map(b => (
              <TouchableOpacity key={b.id} style={[styles.billRow, String(form.bill_id) === String(b.id) && styles.billRowActive]}
                onPress={() => set('bill_id', b.id)}>
                <Text style={styles.billNo}>{b.bill_no}</Text>
                <Text style={styles.billAmt}>Due: ${parseFloat(b.amount_due || 0).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.textarea]} value={form.notes} onChangeText={v => set('notes', v)} multiline numberOfLines={3} placeholder="Optional notes..." />

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{existing ? 'Update Payment' : 'Record Payment'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 10, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerBox: { marginBottom: 4 },
  chip: { backgroundColor: '#e8eaf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 6 },
  chipActive: { backgroundColor: '#1a237e' },
  chipTxt: { color: '#1a237e', fontSize: 13 },
  chipTxtActive: { color: '#fff' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#ddd' },
  billRowActive: { borderColor: '#1a237e', backgroundColor: '#e8eaf6' },
  billNo: { fontSize: 14, fontWeight: '600', color: '#333' },
  billAmt: { fontSize: 14, color: '#c62828' },
  saveBtn: { backgroundColor: '#1a237e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
