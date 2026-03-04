'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

export default function JournalEntryCenter({ isOpen, onClose }) {
  // List state
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewingEntry, setViewingEntry] = useState(null)

  // Form state
  const [entryNo, setEntryNo] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [lines, setLines] = useState([
    { id: 1, account_id: '', description: '', debit: '', credit: '' },
    { id: 2, account_id: '', description: '', debit: '', credit: '' }
  ])
  const [accounts, setAccounts] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await api.getJournalEntries(searchTerm ? `search=${encodeURIComponent(searchTerm)}` : '')
      const data = res.data?.journal_entries || res.journal_entries || res.data || []
      setEntries(data)
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  const loadAccounts = useCallback(async () => {
    try {
      const res = await api.getAccounts()
      setAccounts(res.data?.accounts || res.accounts || res.data || [])
    } catch (err) {
      console.error('Failed to load accounts:', err)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadEntries()
      loadAccounts()
    }
  }, [isOpen, loadEntries, loadAccounts])

  const loadNextNumber = async () => {
    try {
      const res = await api.getNextJENumber()
      setEntryNo(res.data?.entry_no || res.entry_no || '')
    } catch (err) {
      console.error('Failed to get next JE number:', err)
    }
  }

  const resetForm = () => {
    setEntryNo('')
    setEntryDate(new Date().toISOString().split('T')[0])
    setDescription('')
    setReferenceNo('')
    setLines([
      { id: 1, account_id: '', description: '', debit: '', credit: '' },
      { id: 2, account_id: '', description: '', debit: '', credit: '' }
    ])
    setError('')
    setViewingEntry(null)
  }

  const handleNewEntry = async () => {
    resetForm()
    await loadNextNumber()
    setShowForm(true)
  }

  const handleViewEntry = async (entry) => {
    try {
      const res = await api.getJournalEntry(entry.id)
      const je = res.data || res
      setViewingEntry(je)
      setShowForm(true)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleReverse = async (entry) => {
    if (!confirm(`Reverse journal entry ${entry.entry_no}?`)) return
    try {
      await api.reverseJournalEntry(entry.id)
      loadEntries()
    } catch (err) {
      alert(err.message)
    }
  }

  const addLine = () => {
    setLines([...lines, { id: Date.now(), account_id: '', description: '', debit: '', credit: '' }])
  }

  const removeLine = (id) => {
    if (lines.length <= 2) return
    setLines(lines.filter(l => l.id !== id))
  }

  const updateLine = (id, field, value) => {
    setLines(lines.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      // If entering debit, clear credit and vice versa
      if (field === 'debit' && value) updated.credit = ''
      if (field === 'credit' && value) updated.debit = ''
      return updated
    }))
  }

  const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  const handleSave = async () => {
    if (!isBalanced) {
      setError('Journal entry is not balanced. Total debits must equal total credits.')
      return
    }
    if (!entryDate) {
      setError('Entry date is required.')
      return
    }
    const validLines = lines.filter(l => l.account_id && ((parseFloat(l.debit) || 0) > 0 || (parseFloat(l.credit) || 0) > 0))
    if (validLines.length < 2) {
      setError('At least two lines with amounts are required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await api.createJournalEntry({
        entry_no: entryNo || undefined,
        entry_date: entryDate,
        description: description || null,
        reference_no: referenceNo || null,
        lines: validLines.map(l => ({
          account_id: l.account_id,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          description: l.description || null
        }))
      })
      setShowForm(false)
      resetForm()
      loadEntries()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const formatAmount = (val) => {
    const num = parseFloat(val) || 0
    return num > 0 ? '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const statusBadge = (status) => {
    const colors = {
      posted: { bg: '#dcfce7', color: '#166534' },
      draft: { bg: '#fef9c3', color: '#854d0e' },
      reversed: { bg: '#fef2f2', color: '#991b1b' }
    }
    const c = colors[status] || colors.draft
    return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: c.bg, color: c.color }}>{status}</span>
  }

  if (!isOpen) return null

  return (
    <div className={styles.invoicePopupOverlay} onClick={onClose}>
      <div className={styles.invoicePopup} onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, width: '95%' }}>
        <div className={styles.popupHeader}>
          <h2>{viewingEntry ? `Journal Entry: ${viewingEntry.entry_no}` : (showForm ? 'New Journal Entry' : 'Journal Entries')}</h2>
          <button className={styles.closeBtn} onClick={() => { if (showForm) { setShowForm(false); resetForm() } else { onClose() } }}>
            <i className={`fas fa-${showForm ? 'arrow-left' : 'times'}`} />
          </button>
        </div>

        {!showForm ? (
          <div className={styles.popupContent}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="text" placeholder="Search by JE # or description..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadEntries()}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
              />
              <button onClick={handleNewEntry} className={styles.btnPrimary} style={{ padding: '8px 16px' }}>
                <i className="fas fa-plus" style={{ marginRight: 6 }} /> New Entry
              </button>
            </div>

            {listError && <div style={{ color: '#dc2626', marginBottom: 10 }}>{listError}</div>}
            {loading && <div style={{ textAlign: 'center', padding: 20 }}><i className="fas fa-spinner fa-spin" /> Loading...</div>}

            {!loading && (
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>JE #</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Reference</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Total</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(je => (
                      <tr key={je.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => handleViewEntry(je)}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2563eb' }}>{je.entry_no}</td>
                        <td style={{ padding: '8px 12px' }}>{formatDate(je.entry_date)}</td>
                        <td style={{ padding: '8px 12px', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{je.description || '-'}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 13 }}>{je.reference_no || je.reference_type || '-'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{statusBadge(je.status)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(je.total_debit)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          {je.status === 'posted' && (
                            <button onClick={() => handleReverse(je)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13 }} title="Reverse">
                              <i className="fas fa-undo" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!entries.length && !loading && (
                      <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No journal entries found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : viewingEntry ? (
          <div className={styles.popupContent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div><span style={{ color: '#64748b', fontSize: 13 }}>Entry No</span><div style={{ fontWeight: 600 }}>{viewingEntry.entry_no}</div></div>
              <div><span style={{ color: '#64748b', fontSize: 13 }}>Date</span><div style={{ fontWeight: 600 }}>{formatDate(viewingEntry.entry_date)}</div></div>
              <div><span style={{ color: '#64748b', fontSize: 13 }}>Status</span><div>{statusBadge(viewingEntry.status)}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontSize: 13 }}>Description</span><div>{viewingEntry.description || '-'}</div></div>
              {viewingEntry.reference_no && <div><span style={{ color: '#64748b', fontSize: 13 }}>Reference</span><div>{viewingEntry.reference_no}</div></div>}
              {viewingEntry.reference_type && <div><span style={{ color: '#64748b', fontSize: 13 }}>Type</span><div style={{ textTransform: 'capitalize' }}>{viewingEntry.reference_type}</div></div>}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Account</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Debit</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {(viewingEntry.lines || []).map((line, i) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontFamily: 'monospace', marginRight: 8 }}>{line.account_number}</span>
                      {line.account_name}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{line.description || '-'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(line.debit)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatAmount(line.credit)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right' }}>Totals</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatAmount((viewingEntry.lines || []).reduce((s, l) => s + (parseFloat(l.debit) || 0), 0))}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {formatAmount((viewingEntry.lines || []).reduce((s, l) => s + (parseFloat(l.credit) || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              {viewingEntry.status === 'posted' && (
                <button onClick={() => handleReverse(viewingEntry)} style={{ padding: '8px 20px', border: '1px solid #ef4444', borderRadius: 6, background: '#fff', color: '#ef4444', cursor: 'pointer' }}>
                  <i className="fas fa-undo" style={{ marginRight: 6 }} /> Reverse Entry
                </button>
              )}
              <button onClick={() => { setShowForm(false); resetForm() }} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        ) : (
          <div className={styles.popupContent}>
            {error && <div style={{ color: '#dc2626', marginBottom: 10, padding: '8px 12px', background: '#fef2f2', borderRadius: 6 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>JE Number</label>
                <input
                  type="text" value={entryNo} onChange={e => setEntryNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Entry Date *</label>
                <input
                  type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Reference</label>
                <input
                  type="text" value={referenceNo} onChange={e => setReferenceNo(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                  placeholder="Optional reference"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Description</label>
                <input
                  type="text" value={description} onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6 }}
                  placeholder="Description of journal entry"
                />
              </div>
            </div>

            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Lines</h4>
              <button onClick={addLine} style={{ padding: '4px 12px', border: '1px solid #3b82f6', borderRadius: 6, background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontSize: 13 }}>
                <i className="fas fa-plus" style={{ marginRight: 4 }} /> Add Line
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', minWidth: 250 }}>Account</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', minWidth: 150 }}>Description</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', minWidth: 120 }}>Debit</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #e2e8f0', minWidth: 120 }}>Credit</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(line => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px' }}>
                        <select
                          value={line.account_id} onChange={e => updateLine(line.id, 'account_id', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
                        >
                          <option value="">Select account...</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_number} - {a.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="text" value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4 }}
                          placeholder="Line description"
                        />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number" value={line.debit} onChange={e => updateLine(line.id, 'debit', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'right' }}
                          min="0" step="0.01" placeholder="0.00"
                        />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input
                          type="number" value={line.credit} onChange={e => updateLine(line.id, 'credit', e.target.value)}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'right' }}
                          min="0" step="0.01" placeholder="0.00"
                        />
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {lines.length > 2 && (
                          <button onClick={() => removeLine(line.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                            <i className="fas fa-trash" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: '10px 10px', textAlign: 'right' }}>Totals</td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'monospace', color: !isBalanced ? '#dc2626' : undefined }}>
                      ${totalDebits.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'monospace', color: !isBalanced ? '#dc2626' : undefined }}>
                      ${totalCredits.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  {!isBalanced && totalDebits + totalCredits > 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '8px 10px', color: '#dc2626', fontSize: 13, textAlign: 'center' }}>
                        <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }} />
                        Difference: ${Math.abs(totalDebits - totalCredits).toFixed(2)} -- debits must equal credits
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowForm(false); resetForm() }} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !isBalanced} className={styles.btnPrimary} style={{ padding: '8px 20px', opacity: (!isBalanced ? 0.5 : 1) }}>
                {saving ? <><i className="fas fa-spinner fa-spin" /> Posting...</> : 'Post Journal Entry'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
