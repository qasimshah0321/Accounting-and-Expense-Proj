import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { customersAPI, paymentTermsToNumber, numberToPaymentTerms } from '../../services/api';

const PAYMENT_TERMS_OPTIONS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 60'];

const CustomerFormScreen = ({ route, navigation }) => {
  const existing = route.params?.customer;
  const isEdit = !!existing;

  const [form, setForm] = useState({
    name: existing?.name || '',
    email: existing?.email || '',
    phone: existing?.phone || '',
    contact_person: existing?.contact_person || '',
    billing_address: existing?.billing_address || '',
    city: existing?.city || '',
    state: existing?.state || '',
    postal_code: existing?.postal_code || '',
    country: existing?.country || '',
    payment_terms: isEdit ? numberToPaymentTerms(existing?.payment_terms) : 'Net 30',
    credit_limit: existing?.credit_limit ? String(existing.credit_limit) : '',
    notes: existing?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Customer name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        contact_person: form.contact_person.trim() || null,
        billing_address: form.billing_address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        postal_code: form.postal_code.trim() || null,
        country: form.country.trim() || null,
        payment_terms: paymentTermsToNumber(form.payment_terms),
        credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null,
        notes: form.notes.trim() || null,
      };

      if (isEdit) {
        await customersAPI.update(existing.id, payload);
      } else {
        await customersAPI.create(payload);
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
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <Text style={styles.label}>Customer Name *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => update('name', v)} placeholder="Enter customer name" placeholderTextColor="#999" />

        <Text style={styles.label}>Contact Person</Text>
        <TextInput style={styles.input} value={form.contact_person} onChangeText={(v) => update('contact_person', v)} placeholder="Contact person" placeholderTextColor="#999" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={form.email} onChangeText={(v) => update('email', v)} placeholder="email@example.com" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={form.phone} onChangeText={(v) => update('phone', v)} placeholder="Phone number" placeholderTextColor="#999" keyboardType="phone-pad" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>

        <Text style={styles.label}>Billing Address</Text>
        <TextInput style={[styles.input, { height: 60, textAlignVertical: 'top' }]} value={form.billing_address} onChangeText={(v) => update('billing_address', v)} placeholder="Street address" placeholderTextColor="#999" multiline />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={(v) => update('city', v)} placeholder="City" placeholderTextColor="#999" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>State</Text>
            <TextInput style={styles.input} value={form.state} onChangeText={(v) => update('state', v)} placeholder="State" placeholderTextColor="#999" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Postal Code</Text>
            <TextInput style={styles.input} value={form.postal_code} onChangeText={(v) => update('postal_code', v)} placeholder="ZIP" placeholderTextColor="#999" />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Country</Text>
            <TextInput style={styles.input} value={form.country} onChangeText={(v) => update('country', v)} placeholder="Country" placeholderTextColor="#999" />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Terms</Text>

        <Text style={styles.label}>Payment Terms</Text>
        <View style={styles.termsRow}>
          {PAYMENT_TERMS_OPTIONS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.termChip, form.payment_terms === t && styles.termChipActive]}
              onPress={() => update('payment_terms', t)}
            >
              <Text style={[styles.termChipText, form.payment_terms === t && styles.termChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Credit Limit</Text>
        <TextInput style={styles.input} value={form.credit_limit} onChangeText={(v) => update('credit_limit', v)} placeholder="0.00" placeholderTextColor="#999" keyboardType="numeric" />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.notes} onChangeText={(v) => update('notes', v)} placeholder="Internal notes" placeholderTextColor="#999" multiline />
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEdit ? 'Update Customer' : 'Create Customer'}</Text>}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a237e', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1 },
  termsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  termChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  termChipActive: { backgroundColor: '#1a237e', borderColor: '#1a237e' },
  termChipText: { fontSize: 12, color: '#666', fontWeight: '600' },
  termChipTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#1a237e',
    marginHorizontal: 12,
    marginTop: 20,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default CustomerFormScreen;
