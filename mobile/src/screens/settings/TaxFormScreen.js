import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { taxesAPI } from '../../services/api';

export default function TaxFormScreen({ route, navigation }) {
  const existing = route.params?.tax;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: existing?.name || '',
    rate: existing?.rate?.toString() || '',
    description: existing?.description || '',
  });

  useEffect(() => { navigation.setOptions({ title: existing ? 'Edit Tax' : 'New Tax' }); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('Validation', 'Tax name is required');
    if (!form.rate || isNaN(parseFloat(form.rate))) return Alert.alert('Validation', 'Enter a valid rate');
    try {
      setSaving(true);
      const payload = { ...form, rate: parseFloat(form.rate) };
      if (existing) await taxesAPI.update(existing.id, payload);
      else await taxesAPI.create(payload);
      navigation.goBack();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.label}>Tax Name *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. GST 10%" />

        <Text style={styles.label}>Rate (%) *</Text>
        <TextInput style={styles.input} value={form.rate} onChangeText={v => set('rate', v)} keyboardType="decimal-pad" placeholder="e.g. 10" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={v => set('description', v)} multiline numberOfLines={3} placeholder="Optional description..." />

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>{existing ? 'Update Tax' : 'Create Tax'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 10, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#1a237e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
