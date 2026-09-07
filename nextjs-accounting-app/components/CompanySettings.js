'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './CompanySettings.module.css'
import * as api from '../lib/api'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'PKR', 'INR', 'SGD']

const emptyProfile = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  currency: 'USD',
  website: '',
  tax_number: '',
  dn_requirement: 'optional',
  grn_requirement: 'optional',
  invoice_import_enabled: true,
  // Only one of FBR / PRA can be active at a time — see active_tax_authority.
  active_tax_authority: 'none', // 'none' | 'fbr' | 'pra'
  fbr_enabled: false,
  fbr_sandbox_mode: true,
  fbr_ntn: '',
  fbr_security_token: '',
  fbr_token_set: false,
  fbr_seller_business_name: '',
  fbr_seller_province: '',
  fbr_seller_address: '',
  fbr_business_activity: '',
  fbr_sector: '',
  fbr_default_scenario_id: '',
  pra_enabled: false,
  pra_sandbox_mode: true,
  pra_pntn: '',
  pra_sandbox_pos_id: '',
  pra_sandbox_token: '',
  pra_sandbox_token_set: false,
  pra_production_pos_id: '',
  pra_production_token: '',
  pra_production_token_set: false,
}

export default function CompanySettings({ isOpen, onClose, onCurrencyChange }) {
  const [form, setForm] = useState({ ...emptyProfile })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [fbrTesting, setFbrTesting] = useState(false)
  const [fbrSyncing, setFbrSyncing] = useState(false)
  const [fbrTestResult, setFbrTestResult] = useState(null) // { ok, message }
  const [praTesting, setPraTesting] = useState(false)
  const [praTestResult, setPraTestResult] = useState(null) // { ok, message }

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getCompanyProfile()
      const data = res.data || {}
      // Load FBR / PRA config separately (stored on companies table; exposed via /fbr/config, /pra/config)
      let fbr = {}
      try {
        const fbrRes = await api.getFBRConfig()
        fbr = fbrRes.data || {}
      } catch { /* ignore — FBR is optional */ }
      let pra = {}
      try {
        const praRes = await api.getPRAConfig()
        pra = praRes.data || {}
      } catch { /* ignore — PRA is optional */ }
      const activeTaxAuthority = data.tax_authority || (fbr.fbr_enabled ? 'fbr' : pra.pra_enabled ? 'pra' : 'none')
      setForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        country: data.country || '',
        currency: data.currency || 'USD',
        website: data.website || '',
        tax_number: data.tax_number || '',
        dn_requirement: data.dn_requirement || 'optional',
        grn_requirement: data.grn_requirement || 'optional',
        invoice_import_enabled: data.invoice_import_enabled === undefined ? true : !!data.invoice_import_enabled,
        active_tax_authority: activeTaxAuthority,
        fbr_enabled: !!fbr.fbr_enabled,
        fbr_sandbox_mode: fbr.fbr_sandbox_mode === undefined ? true : !!fbr.fbr_sandbox_mode,
        fbr_ntn: fbr.fbr_ntn || '',
        fbr_security_token: '',
        fbr_token_set: !!fbr.fbr_token_set,
        fbr_seller_business_name: fbr.fbr_seller_business_name || '',
        fbr_seller_province: fbr.fbr_seller_province || '',
        fbr_seller_address: fbr.fbr_seller_address || '',
        fbr_business_activity: fbr.fbr_business_activity || '',
        fbr_sector: fbr.fbr_sector || '',
        fbr_default_scenario_id: fbr.fbr_default_scenario_id || '',
        pra_enabled: !!pra.pra_enabled,
        pra_sandbox_mode: pra.pra_sandbox_mode === undefined ? true : !!pra.pra_sandbox_mode,
        pra_pntn: pra.pra_pntn || '',
        pra_sandbox_pos_id: pra.pra_sandbox_pos_id || '',
        pra_sandbox_token: '',
        pra_sandbox_token_set: !!pra.pra_sandbox_token_set,
        pra_production_pos_id: pra.pra_production_pos_id || '',
        pra_production_token: '',
        pra_production_token_set: !!pra.pra_production_token_set,
      })
      setFbrTestResult(null)
      setPraTestResult(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadProfile()
      setSuccessMsg('')
    }
  }, [isOpen, loadProfile])

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  if (!isOpen) return null

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Core profile (excludes FBR fields)
      const profileData = {
        name: form.name, email: form.email, phone: form.phone,
        address: form.address, city: form.city, state: form.state,
        postal_code: form.postal_code, country: form.country,
        currency: form.currency, website: form.website,
        tax_number: form.tax_number,
        dn_requirement: form.dn_requirement,
        grn_requirement: form.grn_requirement,
        invoice_import_enabled: form.invoice_import_enabled,
      }
      await api.updateCompanyProfile(profileData)
      // FBR / PRA config — enabled flags derive from the single active-authority
      // selector, so only one is ever active at a time (enforced again server-side).
      const fbrData = buildFbrPayload()
      const praData = buildPraPayload()
      await api.saveFBRConfig(fbrData)
      await api.savePRAConfig(praData)
      setSuccessMsg('Company settings saved')
      if (onCurrencyChange) onCurrencyChange(form.currency)
      // Clear token fields + mark as set if new ones were saved
      setForm(prev => ({
        ...prev,
        fbr_security_token: fbrData.fbr_security_token ? '' : prev.fbr_security_token,
        fbr_token_set: fbrData.fbr_security_token ? true : prev.fbr_token_set,
        pra_sandbox_token: praData.pra_sandbox_token ? '' : prev.pra_sandbox_token,
        pra_sandbox_token_set: praData.pra_sandbox_token ? true : prev.pra_sandbox_token_set,
        pra_production_token: praData.pra_production_token ? '' : prev.pra_production_token,
        pra_production_token_set: praData.pra_production_token ? true : prev.pra_production_token_set,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Builds the FBR config payload; only includes the security token when the
  // user typed a new one (it is write-only — never returned by the API).
  const buildFbrPayload = () => {
    const data = {
      fbr_enabled: form.active_tax_authority === 'fbr',
      fbr_sandbox_mode: !!form.fbr_sandbox_mode,
      fbr_ntn: form.fbr_ntn || null,
      fbr_seller_business_name: form.fbr_seller_business_name || null,
      fbr_seller_province: form.fbr_seller_province || null,
      fbr_seller_address: form.fbr_seller_address || null,
      fbr_business_activity: form.fbr_business_activity || null,
      fbr_sector: form.fbr_sector || null,
      fbr_default_scenario_id: form.fbr_default_scenario_id || null,
    }
    if (form.fbr_security_token && form.fbr_security_token.length > 0) {
      data.fbr_security_token = form.fbr_security_token
    }
    return data
  }

  // Builds the PRA config payload; only includes tokens when the user typed
  // new ones (write-only — never returned by the API).
  const buildPraPayload = () => {
    const data = {
      pra_enabled: form.active_tax_authority === 'pra',
      pra_sandbox_mode: !!form.pra_sandbox_mode,
      pra_pntn: form.pra_pntn || null,
      pra_sandbox_pos_id: form.pra_sandbox_pos_id || null,
      pra_production_pos_id: form.pra_production_pos_id || null,
    }
    if (form.pra_sandbox_token && form.pra_sandbox_token.length > 0) {
      data.pra_sandbox_token = form.pra_sandbox_token
    }
    if (form.pra_production_token && form.pra_production_token.length > 0) {
      data.pra_production_token = form.pra_production_token
    }
    return data
  }

  const handleTestFBR = async () => {
    setFbrTesting(true)
    setFbrTestResult(null)
    try {
      // Save first so the server has the latest token before testing
      const fbrData = buildFbrPayload()
      await api.saveFBRConfig(fbrData)
      await api.savePRAConfig(buildPraPayload())
      if (fbrData.fbr_security_token) setForm(prev => ({ ...prev, fbr_security_token: '', fbr_token_set: true }))
      const res = await api.testFBRConnection()
      setFbrTestResult({ ok: true, message: res.message || 'Connection successful' })
    } catch (err) {
      setFbrTestResult({ ok: false, message: err.message })
    } finally {
      setFbrTesting(false)
    }
  }

  const handleSyncReference = async () => {
    setFbrSyncing(true)
    setFbrTestResult(null)
    try {
      const fbrData = buildFbrPayload()
      await api.saveFBRConfig(fbrData)
      if (fbrData.fbr_security_token) setForm(prev => ({ ...prev, fbr_security_token: '', fbr_token_set: true }))
      const res = await api.syncFBRReference()
      const counts = res.data || {}
      const summary = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', ')
      setFbrTestResult({ ok: true, message: `Reference data synced — ${summary || 'no records'}` })
    } catch (err) {
      setFbrTestResult({ ok: false, message: err.message })
    } finally {
      setFbrSyncing(false)
    }
  }

  const handleTestPRA = async () => {
    setPraTesting(true)
    setPraTestResult(null)
    try {
      // Save first so the server has the latest POS ID / token before testing
      const praData = buildPraPayload()
      await api.savePRAConfig(praData)
      await api.saveFBRConfig(buildFbrPayload())
      setForm(prev => ({
        ...prev,
        pra_sandbox_token: praData.pra_sandbox_token ? '' : prev.pra_sandbox_token,
        pra_sandbox_token_set: praData.pra_sandbox_token ? true : prev.pra_sandbox_token_set,
        pra_production_token: praData.pra_production_token ? '' : prev.pra_production_token,
        pra_production_token_set: praData.pra_production_token ? true : prev.pra_production_token_set,
      }))
      const res = await api.testPRAConnection()
      setPraTestResult({ ok: true, message: res.message || 'Connection successful' })
    } catch (err) {
      setPraTestResult({ ok: false, message: err.message })
    } finally {
      setPraTesting(false)
    }
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Company Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}><i className="fas fa-times" /></button>
        </div>

        <div className={styles.body}>
          {loading && (
            <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          )}

          {error && (
            <div className={`${styles.banner} ${styles.bannerError}`}>
              <i className="fas fa-times-circle" />
              {error}
            </div>
          )}
          {successMsg && (
            <div className={`${styles.banner} ${styles.bannerSuccess}`}>
              <i className="fas fa-check-circle" />
              {successMsg}
            </div>
          )}

          {!loading && (
            <>
              {/* Avatar + Company Identity */}
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  {(form.name || 'Z').substring(0, 2).toUpperCase()}
                  <div className={styles.avatarOverlay}><i className="fas fa-camera" /></div>
                </div>
                <div className={styles.avatarInfo}>
                  <h3>{form.name || 'Your Company'}</h3>
                  <p>Click avatar to change logo (coming soon)</p>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-building" />
                  <span className={styles.sectionTitle}>Company Identity</span>
                </div>
                <div className={styles.fieldFull}>
                  <label>Company Name</label>
                  <input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} placeholder="Your Company Name" />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-phone" />
                  <span className={styles.sectionTitle}>Contact Details</span>
                </div>
                <div className={styles.grid3}>
                  <div className={styles.field}>
                    <label>Email</label>
                    <input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="contact@company.com" />
                  </div>
                  <div className={styles.field}>
                    <label>Phone</label>
                    <input value={form.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="+1 555-0100" />
                  </div>
                  <div className={styles.field}>
                    <label>Website</label>
                    <input value={form.website || ''} onChange={e => handleChange('website', e.target.value)} placeholder="www.company.com" />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-map-marker-alt" />
                  <span className={styles.sectionTitle}>Address</span>
                </div>
                <div className={styles.fieldFull} style={{marginBottom:'12px'}}>
                  <label>Street Address</label>
                  <input value={form.address || ''} onChange={e => handleChange('address', e.target.value)} placeholder="123 Main Street" />
                </div>
                <div className={styles.grid3} style={{marginBottom:'12px'}}>
                  <div className={styles.field}>
                    <label>City</label>
                    <input value={form.city || ''} onChange={e => handleChange('city', e.target.value)} placeholder="New York" />
                  </div>
                  <div className={styles.field}>
                    <label>State</label>
                    <input value={form.state || ''} onChange={e => handleChange('state', e.target.value)} placeholder="NY" />
                  </div>
                  <div className={styles.field}>
                    <label>Postal Code</label>
                    <input value={form.postal_code || ''} onChange={e => handleChange('postal_code', e.target.value)} placeholder="10001" />
                  </div>
                </div>
                <div className={styles.fieldFull}>
                  <label>Country</label>
                  <input value={form.country || ''} onChange={e => handleChange('country', e.target.value)} placeholder="United States" />
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-dollar-sign" />
                  <span className={styles.sectionTitle}>Financial</span>
                </div>
                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label>Currency</label>
                    <select value={form.currency || 'USD'} onChange={e => handleChange('currency', e.target.value)}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Tax ID / Registration No.</label>
                    <input value={form.tax_number || ''} onChange={e => handleChange('tax_number', e.target.value)} placeholder="12-3456789" />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-route" />
                  <span className={styles.sectionTitle}>Sales Workflow Configuration</span>
                </div>
                <div className={styles.fieldFull}>
                  <label>Delivery Note Requirement</label>
                  <select value={form.dn_requirement || 'optional'} onChange={e => handleChange('dn_requirement', e.target.value)}>
                    <option value="optional">Optional - Invoice directly from Sales Orders or manually</option>
                    <option value="mandatory">Mandatory - Invoice only from approved Delivery Notes</option>
                  </select>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                    {form.dn_requirement === 'mandatory'
                      ? 'Mandatory mode: Invoices can only be created from shipped/delivered Delivery Notes. Inventory is deducted when Delivery Notes are shipped (not at invoice approval).'
                      : 'Optional mode: Invoices can be created directly from Sales Orders or entered manually. Inventory is deducted at invoice approval if no Delivery Note was used.'}
                  </p>
                </div>
                <div className={styles.fieldFull}>
                  <label>Invoice Import from Image/PDF</label>
                  <select value={form.invoice_import_enabled ? 'shown' : 'hidden'} onChange={e => handleChange('invoice_import_enabled', e.target.value === 'shown')}>
                    <option value="shown">Show - Users can import invoice data from an image or PDF</option>
                    <option value="hidden">Hide - Remove the Import button from the Invoice form</option>
                  </select>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                    Controls whether the "Import from Image/PDF" button appears on the Invoice form for this company.
                  </p>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-dolly" />
                  <span className={styles.sectionTitle}>Purchase Workflow Configuration</span>
                </div>
                <div className={styles.fieldFull}>
                  <label>Goods Received Note (GRN) Requirement</label>
                  <select value={form.grn_requirement || 'optional'} onChange={e => handleChange('grn_requirement', e.target.value)}>
                    <option value="optional">Optional - Bill directly from Purchase Orders or via GRN</option>
                    <option value="mandatory">Mandatory - Bill only from received Goods Received Notes</option>
                  </select>
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                    {form.grn_requirement === 'mandatory'
                      ? 'Mandatory mode: Bills can only be created from received Goods Received Notes. Ensures all goods are physically received before billing.'
                      : 'Optional mode: Bills can be created directly from approved Purchase Orders (skipping GRN), or via a GRN when goods are received.'}
                  </p>
                </div>
              </div>

              {/* ── Tax Authority Integration (Pakistan) ───────────────── */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <i className="fas fa-receipt" />
                  <span className={styles.sectionTitle}>Tax Authority Integration (Pakistan)</span>
                </div>

                <div className={styles.fieldFull} style={{ marginBottom: '12px' }}>
                  <label>Active Tax Authority</label>
                  <select
                    value={form.active_tax_authority || 'none'}
                    onChange={e => handleChange('active_tax_authority', e.target.value)}
                  >
                    <option value="none">None — no fiscal invoicing integration</option>
                    <option value="fbr">FBR — Federal Board of Revenue (Digital Invoicing)</option>
                    <option value="pra">PRA — Punjab Revenue Authority (Fiscal Device)</option>
                  </select>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6b7280' }}>
                    Only one tax authority can be active at a time. Switching disables the other automatically.
                  </p>
                </div>

                {form.active_tax_authority === 'fbr' && (
                  <>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>
                      Submits sales invoices to the FBR Digital Invoicing (DI) system for real-time validation and prints the FBR QR code on invoices. Requires a 5-year security token issued by PRAL after IRIS enrolment.
                    </p>
                    <div className={styles.grid2} style={{ marginBottom: '12px' }}>
                      <div className={styles.field}>
                        <label>Mode</label>
                        <select
                          value={form.fbr_sandbox_mode ? 'sandbox' : 'production'}
                          onChange={e => handleChange('fbr_sandbox_mode', e.target.value === 'sandbox')}
                        >
                          <option value="sandbox">Sandbox (testing)</option>
                          <option value="production">Production (live)</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label>Seller NTN / CNIC</label>
                        <input
                          value={form.fbr_ntn || ''}
                          onChange={e => handleChange('fbr_ntn', e.target.value)}
                          placeholder="7 digits (NTN) or 13 (CNIC)"
                        />
                      </div>
                    </div>

                    <div className={styles.fieldFull} style={{ marginBottom: '12px' }}>
                      <label>Security Token (Bearer) {form.fbr_token_set && <span style={{ fontSize: '11px', color: '#059669', marginLeft: '8px' }}>(saved — leave blank to keep)</span>}</label>
                      <input
                        type="password"
                        value={form.fbr_security_token || ''}
                        onChange={e => handleChange('fbr_security_token', e.target.value)}
                        placeholder={form.fbr_token_set ? '••••••••' : 'Paste PRAL 5-year token'}
                      />
                    </div>

                    <div className={styles.grid2} style={{ marginBottom: '12px' }}>
                      <div className={styles.field}>
                        <label>Seller Business Name</label>
                        <input
                          value={form.fbr_seller_business_name || ''}
                          onChange={e => handleChange('fbr_seller_business_name', e.target.value)}
                          placeholder="Registered business name"
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Seller Province</label>
                        <input
                          value={form.fbr_seller_province || ''}
                          onChange={e => handleChange('fbr_seller_province', e.target.value)}
                          placeholder="e.g. Sindh / Punjab"
                        />
                      </div>
                    </div>

                    <div className={styles.fieldFull} style={{ marginBottom: '12px' }}>
                      <label>Seller Address</label>
                      <input
                        value={form.fbr_seller_address || ''}
                        onChange={e => handleChange('fbr_seller_address', e.target.value)}
                        placeholder="Business address"
                      />
                    </div>

                    <div className={styles.grid2} style={{ marginBottom: '12px' }}>
                      <div className={styles.field}>
                        <label>Business Activity</label>
                        <select
                          value={form.fbr_business_activity || ''}
                          onChange={e => handleChange('fbr_business_activity', e.target.value)}
                        >
                          <option value="">Select…</option>
                          <option value="Manufacturer">Manufacturer</option>
                          <option value="Importer">Importer</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Wholesaler">Wholesaler</option>
                          <option value="Exporter">Exporter</option>
                          <option value="Retailer">Retailer</option>
                          <option value="Service Provider">Service Provider</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label>Sector</label>
                        <input
                          value={form.fbr_sector || ''}
                          onChange={e => handleChange('fbr_sector', e.target.value)}
                          placeholder="e.g. Steel / FMCG / Services"
                        />
                      </div>
                    </div>

                    {form.fbr_sandbox_mode && (
                      <div className={styles.fieldFull} style={{ marginBottom: '12px' }}>
                        <label>Default Sandbox Scenario ID</label>
                        <input
                          value={form.fbr_default_scenario_id || ''}
                          onChange={e => handleChange('fbr_default_scenario_id', e.target.value)}
                          placeholder="e.g. SN001"
                        />
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#6b7280' }}>
                          Required for sandbox testing. Pick a scenario allowed for your business activity (see FBR_INTEGRATION.md).
                        </p>
                      </div>
                    )}

                    <div className={styles.fieldFull}>
                      <button
                        type="button"
                        onClick={handleTestFBR}
                        disabled={fbrTesting || fbrSyncing}
                        style={{
                          padding: '8px 16px', background: '#0ea5e9', color: '#fff',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, marginRight: '10px',
                        }}
                      >
                        {fbrTesting
                          ? <><i className="fas fa-spinner fa-spin" /> Testing...</>
                          : <><i className="fas fa-plug" /> Test Connection</>}
                      </button>
                      <button
                        type="button"
                        onClick={handleSyncReference}
                        disabled={fbrTesting || fbrSyncing}
                        style={{
                          padding: '8px 16px', background: '#6366f1', color: '#fff',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        {fbrSyncing
                          ? <><i className="fas fa-spinner fa-spin" /> Syncing...</>
                          : <><i className="fas fa-sync" /> Sync Reference Data</>}
                      </button>
                      {fbrTestResult && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: fbrTestResult.ok ? '#d1fae5' : '#fee2e2',
                            color: fbrTestResult.ok ? '#065f46' : '#991b1b',
                            fontSize: '13px',
                          }}
                        >
                          <i className={`fas fa-${fbrTestResult.ok ? 'check-circle' : 'times-circle'}`} />
                          {' '}{fbrTestResult.message}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {form.active_tax_authority === 'pra' && (
                  <>
                    <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>
                      Submits sales invoices to the PRA Software Fiscal Device (eIMS) and prints the PRA fiscal invoice number + QR code on invoices. Requires a POS ID and Bearer access token issued after PRA POS Client Registration (reg.pra.punjab.gov.pk).
                    </p>

                    <div className={styles.grid2} style={{ marginBottom: '12px' }}>
                      <div className={styles.field}>
                        <label>Mode</label>
                        <select
                          value={form.pra_sandbox_mode ? 'sandbox' : 'production'}
                          onChange={e => handleChange('pra_sandbox_mode', e.target.value === 'sandbox')}
                        >
                          <option value="sandbox">Sandbox (testing)</option>
                          <option value="production">Production (live)</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label>PNTN (Punjab National Tax Number)</label>
                        <input
                          value={form.pra_pntn || ''}
                          onChange={e => handleChange('pra_pntn', e.target.value)}
                          placeholder="e.g. 1234567-8"
                        />
                      </div>
                    </div>

                    {form.pra_sandbox_mode ? (
                      <>
                        <div className={styles.grid2} style={{ marginBottom: '12px' }}>
                          <div className={styles.field}>
                            <label>Sandbox (Test) POS ID</label>
                            <input
                              value={form.pra_sandbox_pos_id || ''}
                              onChange={e => handleChange('pra_sandbox_pos_id', e.target.value)}
                              placeholder="Test POS ID from PRA portal"
                            />
                          </div>
                          <div className={styles.field}>
                            <label>Sandbox Access Token {form.pra_sandbox_token_set && <span style={{ fontSize: '11px', color: '#059669', marginLeft: '8px' }}>(saved — leave blank to keep)</span>}</label>
                            <input
                              type="password"
                              value={form.pra_sandbox_token || ''}
                              onChange={e => handleChange('pra_sandbox_token', e.target.value)}
                              placeholder={form.pra_sandbox_token_set ? '••••••••' : 'Leave blank to use PRA\'s shared sandbox token'}
                            />
                          </div>
                        </div>
                        <p style={{ margin: '-6px 0 12px', fontSize: '11px', color: '#6b7280' }}>
                          If left blank, PRA's published shared Sandbox token is used automatically (Technical Spec v1.2 §7.2.2).
                        </p>
                      </>
                    ) : (
                      <div className={styles.grid2} style={{ marginBottom: '12px' }}>
                        <div className={styles.field}>
                          <label>Production (Live) POS ID</label>
                          <input
                            value={form.pra_production_pos_id || ''}
                            onChange={e => handleChange('pra_production_pos_id', e.target.value)}
                            placeholder="Live POS ID from PRA portal"
                          />
                        </div>
                        <div className={styles.field}>
                          <label>Production Access Token {form.pra_production_token_set && <span style={{ fontSize: '11px', color: '#059669', marginLeft: '8px' }}>(saved — leave blank to keep)</span>}</label>
                          <input
                            type="password"
                            value={form.pra_production_token || ''}
                            onChange={e => handleChange('pra_production_token', e.target.value)}
                            placeholder={form.pra_production_token_set ? '••••••••' : 'From POS Registration → POS Details → Token'}
                          />
                        </div>
                      </div>
                    )}

                    <div className={styles.fieldFull}>
                      <button
                        type="button"
                        onClick={handleTestPRA}
                        disabled={praTesting}
                        style={{
                          padding: '8px 16px', background: '#0ea5e9', color: '#fff',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
                        }}
                      >
                        {praTesting
                          ? <><i className="fas fa-spinner fa-spin" /> Testing...</>
                          : <><i className="fas fa-plug" /> Test Connection</>}
                      </button>
                      {praTestResult && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: praTestResult.ok ? '#d1fae5' : '#fee2e2',
                            color: praTestResult.ok ? '#065f46' : '#991b1b',
                            fontSize: '13px',
                          }}
                        >
                          <i className={`fas fa-${praTestResult.ok ? 'check-circle' : 'times-circle'}`} />
                          {' '}{praTestResult.message}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin" /> Saving...</> : <><i className="fas fa-save" /> Save Settings</>}
          </button>
        </div>
      </div>
    </div>
  )
}
