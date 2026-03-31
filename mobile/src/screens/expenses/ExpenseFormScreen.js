import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { expensesAPI, vendorsAPI, chartOfAccountsAPI } from '../../services/api';
import SearchableDropdown from '../../components/SearchableDropdown';

const PAYMENT_METHODS = ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'Other'];

const ExpenseFormScreen = ({ route, navigation }) => {
  const editId = route.params?.expenseId;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: '',
    amount: '',
    payment_method: 'Cash',
    vendor_id: '',
    vendor_name: '',
    account_id: '',
    account_name: '',
    description: '',
    reference_no: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vendRes, acctRes] = await Promise.all([
        vendorsAPI.getAll(),
        chartOfAccountsAPI.getAll().catch(() => ({ data: { items: [] } })),
      ]);
      setVendors(vendRes.data?.vendors || vendRes.data?.items || []);
      setAccounts(acctRes.data?.accounts || acctRes.data?.items || []);

      if (isEdit) {
        const res = await expensesAPI.getById(editId);
        const exp = res.data?.expense || res.data;
        setForm({
          expense_date: (exp.expense_date || exp.date || '').slice(0, 10),
          category: exp.category || '',
          amount: String(exp.amount || exp.total_amount || ''),
          payment_method: exp.payment_method || 'Cash',
          vendor_id: exp.vendor_id || '',
          vendor_name: exp.vendor_name || exp.payee || '',
          account_id: exp.account_id || '',
          account_name: exp.account_name || '',
          description: exp.description || '',
          reference_no: exp.reference_no || '',
        });
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      Alert.alert('Validation', 'Please enter an amount.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        expense_date: form.expense_date,
        date: form.expense_date,
        category: form.category,
        amount: parseFloat(form.amount),
        total_amount: parseFloat(form.amount),
        payment_method: form.payment_method,
        vendor_id: form.vendor_id || null,
        account_id: form.account_id || null,
        description: form.description,
        reference_no: form.reference_no,
        payee: form.vendor_name,
      };

      if (isEdit) { await expensesAPI.update(editId, payload); }
      else { await expensesAPI.create(payload); }

      Alert.alert('Success', `Expense ${isEdit ? 'updated' : 'created'}.`);
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
          <Text style={styles.sectionTitle}>Expense Details</Text>

          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={form.expense_date} onChangeText={(v) => setForm((f) => ({ ...f, expense_date: v }))} placeholder="2026-01-01" placeholderTextColor="#999" />

          <Text style={styles.label}>Category</Text>
          <TextInput style={styles.input} value={form.category} onChangeText={(v) => setForm((f) => ({ ...f, category: v }))} placeholder="e.g. Office Supplies, Travel" placeholderTextColor="#999" />

          <Text style={styles.label}>Amount</Text>
          <TextInput style={styles.input} value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))} keyboardType="numeric" placeholder="0.00" placeholderTextColor="#999" />

          <Text style={styles.label}>Payment Method</Text>
          <TouchableOpacity style={styles.picker} onPress={() => {
            const opts = PAYMENT_METHODS.map((m) => ({
              text: m, onPress: () => setForm((f) => ({ ...f, payment_method: m })),
            }));
            opts.push({ text: 'Cancel', style: 'cancel' });
            Alert.alert('Payment Method', '', opts);
          }}>
            <Text style={styles.pickerText}>{form.payment_method}</Text>
          </TouchableOpacity>

          <SearchableDropdown
            label="Vendor"
            items={[{ id: '', name: 'None', email: '' }, ...vendors]}
            selectedValue={form.vendor_id ? String(form.vendor_id) : ''}
            onSelect={(v) => setForm((f) => ({ ...f, vendor_id: v.id ? String(v.id) : '', vendor_name: v.id ? v.name : '' }))}
            labelKey="name"
            valueKey="id"
            subLabelKey="email"
            placeholder="Select vendor (optional)..."
          />

          <Text style={styles.label}>Account</Text>
          <TouchableOpacity style={styles.picker} onPress={() => {
            const expAccts = accounts.filter((a) => a.account_type === 'expense' || a.type === 'expense');
            const list = expAccts.length > 0 ? expAccts : accounts;
            const opts = list.slice(0, 30).map((a) => ({
              text: `${a.account_number || ''} ${a.name || a.account_name || ''}`.trim(),
              onPress: () => setForm((f) => ({ ...f, account_id: a.id, account_name: a.name || a.account_name || '' })),
            }));
            opts.unshift({ text: 'None', onPress: () => setForm((f) => ({ ...f, account_id: '', account_name: '' })) });
            opts.push({ text: 'Cancel', style: 'cancel' });
            Alert.alert('Select Account', '', opts);
          }}>
            <Text style={[styles.pickerText, !form.account_name && { color: '#999' }]}>
              {form.account_name || 'Select account (optional)...'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Reference #</Text>
          <TextInput style={styles.input} value={form.reference_no} onChangeText={(v) => setForm((f) => ({ ...f, reference_no: v }))} placeholder="Ref number" placeholderTextColor="#999" />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Description..." placeholderTextColor="#999" multiline />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#c62828' }]} onPress={handleSave} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving...' : (isEdit ? 'Update Expense' : 'Create Expense')}</Text>
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
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#c62828', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333' },
  picker: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  pickerText: { fontSize: 14, color: '#333' },
  buttonRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 12, gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', elevation: 2 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default ExpenseFormScreen;
