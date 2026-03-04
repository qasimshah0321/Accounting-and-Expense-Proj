'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

const FREQ_LABELS = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' }
const TYPE_LABELS = { invoice: 'Invoice', bill: 'Bill', expense: 'Expense' }

const emptyForm = {
  name: '',
  document_type: 'invoice',
  frequency: 'monthly',
  start_date: '',
  end_date: '',
  max_runs: '',
  description: '',
  notes: '',
}

export default function RecurringCenter({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('active')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [form, setForm] = useState({ ...emptyForm })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [generating, setGenerating] = useState(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getRecurringDocuments()
      const items = res.data || []
      setDocuments(items)
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) loadDocuments()
  }, [isOpen, loadDocuments])

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  if (!isOpen) return null

  const activeDocs = documents.filter(d => d.is_active)
  const inactiveDocs = documents.filter(d => !d.is_active)

  const resetForm = () => {
    setForm({ ...emptyForm })
    setEditingId(null)
    setFormError('')
  }

  const handleNew = () => {
    resetForm()
    setActiveTab('new')
  }

  const handleEdit = (doc) => {
    setForm({
      name: doc.name || '',
      document_type: doc.document_type || 'invoice',
      frequency: doc.frequency || 'monthly',
      start_date: doc.start_date ? doc.start_date.split('T')[0] : '',
      end_date: doc.end_date ? doc.end_date.split('T')[0] : '',
      max_runs: doc.max_runs || '',
      description: doc.description || '',
      notes: doc.template_data?.notes || '',
    })
    setEditingId(doc.id)
    setFormError('')
    setActiveTab('new')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Name is required'); return }
    if (!form.start_date) { setFormError('Start date is required'); return }

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        document_type: form.document_type,
        frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date || null,
        max_runs: form.max_runs ? parseInt(form.max_runs, 10) : null,
        description: form.description || null,
        template_data: { notes: form.notes || '' },
      }

      if (editingId) {
        await api.updateRecurringDocument(editingId, payload)
        setSuccessMsg('Recurring document updated')
      } else {
        await api.createRecurringDocument(payload)
        setSuccessMsg('Recurring document created')
      }
      resetForm()
      setActiveTab('active')
      loadDocuments()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this recurring document?')) return
    try {
      await api.deleteRecurringDocument(id)
      setSuccessMsg('Recurring document deleted')
      loadDocuments()
    } catch (err) {
      setListError(err.message)
    }
  }

  const handleToggleActive = async (doc) => {
    try {
      await api.updateRecurringDocument(doc.id, { is_active: !doc.is_active })
      setSuccessMsg(doc.is_active ? 'Paused' : 'Resumed')
      loadDocuments()
    } catch (err) {
      setListError(err.message)
    }
  }

  const handleGenerate = async (id) => {
    setGenerating(id)
    try {
      const res = await api.generateRecurringDocument(id)
      const result = res.data || {}
      const docType = TYPE_LABELS[result.document_type] || result.document_type
      setSuccessMsg(`${docType} generated successfully (Run #${result.total_runs})`)
      loadDocuments()
    } catch (err) {
      setListError(err.message)
    } finally {
      setGenerating(null)
    }
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString()
  }

  const renderDocRow = (doc) => (
    <tr key={doc.id}>
      <td>{doc.name}</td>
      <td>
        <span className={`${styles.statusBadge} ${
          doc.document_type === 'invoice' ? styles.statusPaid :
          doc.document_type === 'bill' ? styles.statusDraft :
          styles.statusCancelled
        }`}>
          {TYPE_LABELS[doc.document_type] || doc.document_type}
        </span>
      </td>
      <td>{FREQ_LABELS[doc.frequency] || doc.frequency}</td>
      <td>{formatDate(doc.last_run_date)}</td>
      <td>{formatDate(doc.next_run_date)}</td>
      <td>{doc.total_runs}{doc.max_runs ? ` / ${doc.max_runs}` : ''}</td>
      <td>
        <button className={styles.btnSecondary} onClick={() => handleEdit(doc)} style={{ marginRight: 4 }}>
          <i className="fas fa-edit"></i>
        </button>
        <button
          className={styles.btnSecondary}
          onClick={() => handleToggleActive(doc)}
          title={doc.is_active ? 'Pause' : 'Resume'}
          style={{ marginRight: 4 }}
        >
          <i className={`fas fa-${doc.is_active ? 'pause' : 'play'}`}></i>
        </button>
        {doc.is_active && (
          <button
            className={styles.btnPrimary}
            onClick={() => handleGenerate(doc.id)}
            disabled={generating === doc.id}
            style={{ marginRight: 4 }}
          >
            {generating === doc.id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>}
            {' '}Generate
          </button>
        )}
        <button className={styles.btnCancel} onClick={() => handleDelete(doc.id)}>
          <i className="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  )

  const renderList = (docs) => {
    if (loading) return <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
    if (!docs.length) return <div className={styles.emptyState}>No recurring documents found.</div>
    return (
      <table className={styles.invoiceTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Frequency</th>
            <th>Last Run</th>
            <th>Next Run</th>
            <th>Runs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>{docs.map(renderDocRow)}</tbody>
      </table>
    )
  }

  return (
    <div className={styles.invoiceListOverlay}>
      <div className={styles.invoiceListContainer}>
        <div className={styles.listHeader}>
          <div className={styles.listHeaderLeft}>
            <h2>Recurring Documents</h2>
          </div>
          <div className={styles.listHeaderRight}>
            <button className={styles.btnPrimary} onClick={handleNew}>
              <i className="fas fa-plus"></i> New Recurring
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {listError && <div className={styles.errorBanner}>{listError}</div>}
        {successMsg && <div style={{ background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: 6, margin: '8px 16px' }}>{successMsg}</div>}

        <div className={styles.searchSection}>
          <button
            className={activeTab === 'active' ? styles.btnPrimary : styles.btnSecondary}
            onClick={() => setActiveTab('active')}
          >
            Active ({activeDocs.length})
          </button>
          <button
            className={activeTab === 'inactive' ? styles.btnPrimary : styles.btnSecondary}
            onClick={() => setActiveTab('inactive')}
            style={{ marginLeft: 8 }}
          >
            Inactive ({inactiveDocs.length})
          </button>
          <button
            className={activeTab === 'new' ? styles.btnPrimary : styles.btnSecondary}
            onClick={handleNew}
            style={{ marginLeft: 8 }}
          >
            {editingId ? 'Edit' : 'New'}
          </button>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          {activeTab === 'active' && renderList(activeDocs)}
          {activeTab === 'inactive' && renderList(inactiveDocs)}
          {activeTab === 'new' && (
            <div className={styles.invoiceGridContainer}>
              {formError && <div className={styles.errorBanner}>{formError}</div>}

              <div className={styles.formGroup}>
                <label>Name *</label>
                <input className={styles.formControlStandard} value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly Rent Invoice" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup}>
                  <label>Document Type</label>
                  <select className={styles.formControlStandard} value={form.document_type}
                    onChange={e => setForm({ ...form, document_type: e.target.value })}>
                    <option value="invoice">Invoice</option>
                    <option value="bill">Bill</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Frequency</label>
                  <select className={styles.formControlStandard} value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value })}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className={styles.formGroup}>
                  <label>Start Date *</label>
                  <input type="date" className={styles.formControlStandard} value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input type="date" className={styles.formControlStandard} value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Max Runs (leave blank for unlimited)</label>
                <input type="number" min="1" className={styles.formControlStandard} value={form.max_runs}
                  onChange={e => setForm({ ...form, max_runs: e.target.value })} placeholder="Unlimited" />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea className={styles.formControlStandard} value={form.description} rows={2}
                  onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>

              <div className={styles.formGroup}>
                <label>Template Notes</label>
                <textarea className={styles.formControlStandard} value={form.notes} rows={3}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes to include in generated documents" />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : editingId ? 'Update' : 'Create'}
                </button>
                <button className={styles.btnCancel} onClick={() => { resetForm(); setActiveTab('active') }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
