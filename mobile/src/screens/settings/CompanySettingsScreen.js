import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { companySettingsAPI, fbrAPI } from '../../services/api';

export default function CompanySettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '',
    city: '', state: '', postal_code: '', country: '',
    website: '', tax_number: '',
    grn_requirement: 'optional',
    // FBR
    fbr_enabled: false,
    fbr_pos_id: '',
    fbr_username: '',
    fbr_password: '',
    fbr_password_set: false,
    fbr_sandbox_mode: true,
    fbr_ntn: '',
  });
  const [fbrTesting, setFbrTesting] = useState(false);
  const [fbrTestResult, setFbrTestResult] = useState(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await companySettingsAPI.get();
      const s = res.data?.company || res.data || {};
      let fbr = {};
      try {
        const fbrRes = await fbrAPI.getConfig();
        fbr = fbrRes.data || {};
      } catch { /* FBR optional */ }
      setForm(f => ({
        ...f,
        ...s,
        fbr_enabled: !!fbr.fbr_enabled,
        fbr_pos_id: fbr.fbr_pos_id || '',
        fbr_username: fbr.fbr_username || '',
        fbr_password: '',
        fbr_password_set: !!fbr.fbr_password_set,
        fbr_sandbox_mode: fbr.fbr_sandbox_mode === undefined ? true : !!fbr.fbr_sandbox_mode,
        fbr_ntn: fbr.fbr_ntn || '',
      }));
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buildFbrPayload = () => {
    const payload = {
      fbr_enabled: !!form.fbr_enabled,
      fbr_pos_id: form.fbr_pos_id || null,
      fbr_username: form.fbr_username || null,
      fbr_sandbox_mode: !!form.fbr_sandbox_mode,
      fbr_ntn: form.fbr_ntn || null,
    };
    if (form.fbr_password && form.fbr_password.length > 0) {
      payload.fbr_password = form.fbr_password;
    }
    return payload;
  };

  const save = async () => {
    if (!form.name?.trim()) return Alert.alert('Validation', 'Company name is required');
    try {
      setSaving(true);
      // Strip FBR keys from the main profile update
      const { fbr_enabled, fbr_pos_id, fbr_username, fbr_password, fbr_password_set, fbr_sandbox_mode, fbr_ntn, ...profile } = form;
      await companySettingsAPI.update(profile);
      await fbrAPI.saveConfig(buildFbrPayload());
      if (form.fbr_password) set('fbr_password_set', true);
      set('fbr_password', '');
      Alert.alert('Success', 'Company settings saved');
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const testFbr = async () => {
    try {
      setFbrTesting(true);
      setFbrTestResult(null);
      await fbrAPI.saveConfig(buildFbrPayload());
      const res = await fbrAPI.testConnection();
      setFbrTestResult({ ok: true, message: res.message || 'Connection successful' });
    } catch (e) {
      setFbrTestResult({ ok: false, message: e.message });
    } finally {
      setFbrTesting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a237e" /></View>;

  const Field = ({ label, field, placeholder, keyboard, secure }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[field] || ''}
        onChangeText={v => set(field, v)}
        placeholder={placeholder || label}
        keyboardType={keyboard || 'default'}
        secureTextEntry={!!secure}
        autoCapitalize={secure ? 'none' : undefined}
      />
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

        <Text style={styles.label}>GRN Requirement</Text>
        <View style={styles.grnRow}>
          <TouchableOpacity
            style={[styles.grnOpt, form.grn_requirement === 'optional' && styles.grnOptActive]}
            onPress={() => set('grn_requirement', 'optional')}
          >
            <Text style={[styles.grnOptTitle, form.grn_requirement === 'optional' && styles.grnOptTitleActive]}>Optional</Text>
            <Text style={[styles.grnOptSub, form.grn_requirement === 'optional' && styles.grnOptSubActive]}>
              Bill directly from PO or via GRN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.grnOpt, form.grn_requirement === 'mandatory' && styles.grnOptActive]}
            onPress={() => set('grn_requirement', 'mandatory')}
          >
            <Text style={[styles.grnOptTitle, form.grn_requirement === 'mandatory' && styles.grnOptTitleActive]}>Mandatory</Text>
            <Text style={[styles.grnOptSub, form.grn_requirement === 'mandatory' && styles.grnOptSubActive]}>
              Bill only from received GRN
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── FBR Integration ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>FBR Integration (Pakistan)</Text>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable FBR Integration</Text>
          <Switch
            value={!!form.fbr_enabled}
            onValueChange={v => set('fbr_enabled', v)}
            trackColor={{ false: '#ccc', true: '#1a237e' }}
          />
        </View>
        <Text style={styles.help}>
          Submits sales invoices to the Pakistan Federal Board of Revenue POS system and prints an FBR QR on invoices.
        </Text>

        {form.fbr_enabled && (
          <>
            <Text style={styles.label}>Mode</Text>
            <View style={styles.grnRow}>
              <TouchableOpacity
                style={[styles.grnOpt, form.fbr_sandbox_mode && styles.grnOptActive]}
                onPress={() => set('fbr_sandbox_mode', true)}
              >
                <Text style={[styles.grnOptTitle, form.fbr_sandbox_mode && styles.grnOptTitleActive]}>Sandbox</Text>
                <Text style={[styles.grnOptSub, form.fbr_sandbox_mode && styles.grnOptSubActive]}>Testing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.grnOpt, !form.fbr_sandbox_mode && styles.grnOptActive]}
                onPress={() => set('fbr_sandbox_mode', false)}
              >
                <Text style={[styles.grnOptTitle, !form.fbr_sandbox_mode && styles.grnOptTitleActive]}>Production</Text>
                <Text style={[styles.grnOptSub, !form.fbr_sandbox_mode && styles.grnOptSubActive]}>Live</Text>
              </TouchableOpacity>
            </View>

            <Field label="POS ID" field="fbr_pos_id" keyboard="numeric" placeholder="12345" />
            <Field label="NTN" field="fbr_ntn" placeholder="1234567-8" />
            <Field label="FBR Username" field="fbr_username" />
            <Text style={styles.label}>
              FBR Password {form.fbr_password_set ? '(saved — leave blank to keep)' : ''}
            </Text>
            <TextInput
              style={styles.input}
              value={form.fbr_password}
              onChangeText={v => set('fbr_password', v)}
              placeholder={form.fbr_password_set ? '••••••••' : 'Enter FBR password'}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.testBtn, fbrTesting && { opacity: 0.6 }]}
              onPress={testFbr}
              disabled={fbrTesting}
            >
              {fbrTesting ? <ActivityIndicator color="#fff" /> : <Text style={styles.testTxt}>Test Connection</Text>}
            </TouchableOpacity>

            {fbrTestResult && (
              <View style={[styles.resultBox, fbrTestResult.ok ? styles.resultOk : styles.resultErr]}>
                <Text style={{ color: fbrTestResult.ok ? '#065f46' : '#991b1b', fontSize: 13 }}>
                  {fbrTestResult.message}
                </Text>
              </View>
            )}
          </>
        )}

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
  grnRow: { flexDirection: 'row', marginTop: 4, gap: 8 },
  grnOpt: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' },
  grnOptActive: { borderColor: '#1a237e', backgroundColor: '#e8eaf6' },
  grnOptTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  grnOptTitleActive: { color: '#1a237e' },
  grnOptSub: { fontSize: 11, color: '#888', marginTop: 4 },
  grnOptSubActive: { color: '#303f9f' },
  sectionHeader: { marginTop: 24, marginBottom: 4, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a237e' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  help: { fontSize: 11, color: '#666', marginTop: 4, lineHeight: 16 },
  testBtn: { backgroundColor: '#0ea5e9', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  testTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultBox: { padding: 10, borderRadius: 6, marginTop: 10 },
  resultOk: { backgroundColor: '#d1fae5' },
  resultErr: { backgroundColor: '#fee2e2' },
});
