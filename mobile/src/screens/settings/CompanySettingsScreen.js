import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { companySettingsAPI } from '../../services/api';

export default function CompanySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '',
    city: '', state: '', postal_code: '', country: '',
    website: '', tax_number: '',
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await companySettingsAPI.get();
      const s = res.data?.company || res.data || {};
      setForm(f => ({ ...f, ...s }));
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) return Alert.alert('Validation', 'Company name is required');
    try {
      setSaving(true);
      await companySettingsAPI.update(form);
      Alert.alert('Success', 'Company settings saved');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;

  const Field = ({ label, field, placeholder, keyboard }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={form[field] || ''} onChangeText={v => set(field, v)}
        placeholder={placeholder || label} keyboardType={keyboard || 'default'} />
    </>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Field label="Company Name *" field="name" />
        <Field label="Email" field="email" keyboard="email-address" />
        <Field label="Phone" field="phone" keyboard="phone-pad" />
        <Field label="Address" field="address" />
        <Field label="City" field="city" />
        <Field label="State / Province" field="state" />
        <Field label="Postal Code" field="postal_code" />
        <Field label="Country" field="country" />
        <Field label="Website" field="website" keyboard="url" />
        <Field label="Tax Number / ABN" field="tax_number" />

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Save Settings</Text>}
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
  saveBtn: { backgroundColor: '#1a237e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
