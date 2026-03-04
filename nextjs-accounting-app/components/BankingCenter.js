'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './Invoice.module.css'
import * as api from '../lib/api'

const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'cash', 'other']
const TX_TYPES = ['deposit', 'withdrawal', 'transfer', 'fee', 'interest', 'adjustment']

const typeLabel = (t) => t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'
const fmtBalance = (v) => v == null ? '0.00' : parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-'

const accountTypeColor = (t) => {
  const map = { checking: '#3b82f6', savings: '#16a34a', credit_card: '#ef4444', cash: '#f59e0b', other: '#8b5cf6' }
  return map[t] || '#64748b'
}

const emptyAccountForm = { account_name: '', bank_name: '', account_type: 'checking', account_number: '', opening_balance: '', currency: 'USD', gl_account_id: '', is_active: true }
const emptyTxForm = { transaction_date: new Date().toISOString().slice(0, 10), description: '', amount: '', transaction_type: 'deposit', payee: '', reference_no: '', notes: '', target_bank_account_id: '' }

export default function BankingCenter({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('accounts')

  // Accounts
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState('')
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState(null)
  const [accountForm, setAccountForm] = useState(emptyAccountForm)
  const [accountFormError, setAccountFormError] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [glAccounts, setGlAccounts] = useState([])
  const [glSearch, setGlSearch] = useState('')
  const [showGlDropdown, setShowGlDropdown] = useState(false)

  // Transactions
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')
  const [txSearch, setTxSearch] = useState('')
  const [txDateFrom, setTxDateFrom] = useState('')
  const [txDateTo, setTxDateTo] = useState('')
  const [showTxForm, setShowTxForm] = useState(false)
  const [editingTxId, setEditingTxId] = useState(null)
  const [txForm, setTxForm] = useState(emptyTxForm)
  const [txFormError, setTxFormError] = useState('')
  const [savingTx, setSavingTx] = useState(false)

  // Reconciliation
  const [recAccountId, setRecAccountId] = useState('')
  const [recData, setRecData] = useState(null)
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState('')
  const [showStartRec, setShowStartRec] = useState(false)
  const [recStatementDate, setRecStatementDate] = useState('')
  const [recStatementBalance, setRecStatementBalance] = useState('')
  const [recSaving, setRecSaving] = useState(false)

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true)
    setAccountsError('')
    try {
      const res = await api.getBankAccounts()
      const accts = res.data?.bank_accounts || res.data || []
      setAccounts(accts)
    } catch (err) {
      setAccountsError(err.message)
    } finally {
      setAccountsLoading(false)
    }
  }, [])

  const loadGlAccounts = useCallback(async () => {
    try {
      const res = await api.getAccounts()
      setGlAccounts(res.data?.accounts || res.data || [])
    } catch {}
  }, [])

  const loadTransactions = useCallback(async (accountId) => {
    if (!accountId) return
    setTxLoading(true)
    setTxError('')
    try {
      const params = new URLSearchParams()
      if (txSearch) params.set('search', txSearch)
      if (txDateFrom) params.set('date_from', txDateFrom)
      if (txDateTo) params.set('date_to', txDateTo)
      const res = await api.getBankTransactions(accountId, params.toString())
      setTransactions(res.data?.transactions || res.data || [])
    } catch (err) {
      setTxError(err.message)
    } finally {
      setTxLoading(false)
    }
  }, [txSearch, txDateFrom, txDateTo])

  const loadReconciliation = useCallback(async (accountId) => {
    if (!accountId) return
    setRecLoading(true)
    setRecError('')
    try {
      const res = await api.getBankReconciliation(accountId)
      setRecData(res.data || null)
    } catch (err) {
      setRecError(err.message)
    } finally {
      setRecLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadAccounts()
      loadGlAccounts()
    }
  }, [isOpen, loadAccounts, loadGlAccounts])

  useEffect(() => {
    if (isOpen && activeTab === 'transactions' && selectedAccountId) loadTransactions(selectedAccountId)
  }, [isOpen, activeTab, selectedAccountId, loadTransactions])

  useEffect(() => {
    if (isOpen && activeTab === 'reconciliation' && recAccountId) loadReconciliation(recAccountId)
  }, [isOpen, activeTab, recAccountId, loadReconciliation])

  if (!isOpen) return null

  // ── Account CRUD ─────────────────────────────────────────────────────────────
  const openAddAccount = () => {
    setEditingAccountId(null)
    setAccountForm(emptyAccountForm)
    setGlSearch('')
    setAccountFormError('')
    setShowAccountForm(true)
  }
  const openEditAccount = (acct) => {
    setEditingAccountId(acct.id)
    setAccountForm({
      account_name: acct.account_name || '',
      bank_name: acct.bank_name || '',
      account_type: acct.account_type || 'checking',
      account_number: acct.account_number || '',
      opening_balance: acct.opening_balance || '',
      currency: acct.currency || 'USD',
      gl_account_id: acct.gl_account_id || '',
      is_active: acct.is_active !== false,
    })
    setGlSearch(acct.gl_account_name ? `${acct.gl_account_number} - ${acct.gl_account_name}` : '')
    setAccountFormError('')
    setShowAccountForm(true)
  }
  const handleSaveAccount = async () => {
    setAccountFormError('')
    if (!accountForm.account_name.trim()) { setAccountFormError('Account name is required'); return }
    if (!accountForm.bank_name.trim()) { setAccountFormError('Bank name is required'); return }
    setSavingAccount(true)
    try {
      const payload = { ...accountForm, opening_balance: parseFloat(accountForm.opening_balance) || 0, gl_account_id: accountForm.gl_account_id || null }
      if (editingAccountId) {
        const res = await api.updateBankAccount(editingAccountId, payload)
        const updated = res.data?.bank_account || res.data
        setAccounts(prev => prev.map(a => a.id === editingAccountId ? { ...a, ...updated } : a))
      } else {
        const res = await api.createBankAccount(payload)
        const created = res.data?.bank_account || res.data
        setAccounts(prev => [...prev, created])
      }
      setShowAccountForm(false)
    } catch (err) {
      setAccountFormError(err.message)
    } finally {
      setSavingAccount(false)
    }
  }
  const handleDeleteAccount = async (id) => {
    if (!confirm('Delete this bank account?')) return
    try {
      await api.deleteBankAccount(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch (err) { alert(err.message) }
  }

  // ── Transaction CRUD ──────────────────────────────────────────────────────────
  const openAddTx = () => {
    setEditingTxId(null)
    setTxForm({ ...emptyTxForm, transaction_date: new Date().toISOString().slice(0, 10) })
    setTxFormError('')
    setShowTxForm(true)
  }
  const openEditTx = (tx) => {
    setEditingTxId(tx.id)
    setTxForm({
      transaction_date: tx.transaction_date?.slice(0, 10) || '',
      description: tx.description || '',
      amount: Math.abs(parseFloat(tx.amount)) || '',
      transaction_type: tx.transaction_type || 'deposit',
      payee: tx.payee || '',
      reference_no: tx.reference_no || '',
      notes: tx.notes || '',
      target_bank_account_id: '',
    })
    setTxFormError('')
    setShowTxForm(true)
  }
  const handleSaveTx = async () => {
    setTxFormError('')
    if (!txForm.description.trim()) { setTxFormError('Description is required'); return }
    if (!txForm.amount || isNaN(parseFloat(txForm.amount))) { setTxFormError('Valid amount is required'); return }
    setSavingTx(true)
    try {
      const payload = { ...txForm, amount: parseFloat(txForm.amount), target_bank_account_id: txForm.target_bank_account_id || null }
      if (editingTxId) {
        const res = await api.updateBankTransaction(selectedAccountId, editingTxId, payload)
        const updated = res.data?.bank_transaction || res.data
        setTransactions(prev => prev.map(t => t.id === editingTxId ? { ...t, ...updated } : t))
      } else {
        const res = await api.createBankTransaction(selectedAccountId, payload)
        const created = res.data?.bank_transaction || res.data
        setTransactions(prev => [created, ...prev])
        loadAccounts()
      }
      setShowTxForm(false)
    } catch (err) {
      setTxFormError(err.message)
    } finally {
      setSavingTx(false)
    }
  }
  const handleDeleteTx = async (txId) => {
    if (!confirm('Delete this transaction?')) return
    try {
      await api.deleteBankTransaction(selectedAccountId, txId)
      setTransactions(prev => prev.filter(t => t.id !== txId))
      loadAccounts()
    } catch (err) { alert(err.message) }
  }

  // ── Reconciliation ─────────────────────────────────────────────────────────────
  const handleStartRec = async () => {
    if (!recStatementDate || !recStatementBalance) { setRecError('Statement date and balance are required'); return }
    setRecSaving(true)
    setRecError('')
    try {
      await api.startBankReconciliation(recAccountId, {
        statement_date: recStatementDate,
        statement_ending_balance: parseFloat(recStatementBalance),
      })
      setShowStartRec(false)
      setRecStatementDate('')
      setRecStatementBalance('')
      loadReconciliation(recAccountId)
    } catch (err) { setRecError(err.message) } finally { setRecSaving(false) }
  }
  const handleMarkReconciled = async (txId, currently) => {
    const openRec = recData?.open_reconciliation
    if (!openRec) return
    try {
      await api.markTransactionReconciled(recAccountId, openRec.id, txId, !currently)
      loadReconciliation(recAccountId)
    } catch (err) { setRecError(err.message) }
  }
  const handleCompleteRec = async () => {
    const openRec = recData?.open_reconciliation
    if (!openRec) return
    if (!confirm('Complete reconciliation? This will lock reconciled transactions.')) return
    setRecSaving(true)
    try {
      await api.completeBankReconciliation(recAccountId, openRec.id)
      loadReconciliation(recAccountId)
    } catch (err) { setRecError(err.message) } finally { setRecSaving(false) }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const selectedAccount = accounts.find(a => a.id === selectedAccountId)
  const filteredGlAccounts = glAccounts.filter(a =>
    !glSearch || a.name.toLowerCase().includes(glSearch.toLowerCase()) || (a.account_number || '').includes(glSearch)
  )
  const totalDeposits = transactions.filter(t => parseFloat(t.amount) > 0).reduce((s, t) => s + parseFloat(t.amount), 0)
  const totalWithdrawals = transactions.filter(t => parseFloat(t.amount) < 0).reduce((s, t) => s + parseFloat(t.amount), 0)

  const openRec = recData?.open_reconciliation
  const recAccount = accounts.find(a => a.id === recAccountId)
  const openingBalance = recAccount ? parseFloat(recAccount.opening_balance) : 0
  const reconciledBalance = openRec ? parseFloat(openRec.reconciled_balance) : 0
  const statementEnd = openRec ? parseFloat(openRec.statement_ending_balance) : 0
  const recDifference = openRec ? (statementEnd - (openingBalance + reconciledBalance)) : 0

  return (
    <div className={styles.invoiceListOverlay}>
      <div className={styles.invoiceListContainer}>

        <div className={styles.listHeader}>
          <div className={styles.listHeaderLeft}>
            <h2>Banking</h2>
          </div>
          <div className={styles.listHeaderRight}>
            <button className={styles.closeBtn} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 24px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
          {[
            { key: 'accounts', label: 'Bank Accounts', icon: 'fa-university' },
            { key: 'transactions', label: 'Transactions', icon: 'fa-list' },
            { key: 'reconciliation', label: 'Reconciliation', icon: 'fa-balance-scale' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
              borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab.key ? '#3b82f6' : '#64748b',
              fontWeight: activeTab === tab.key ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <i className={`fas ${tab.icon}`}></i> {tab.label}
            </button>
          ))}
        </div>

        {/* ── ACCOUNTS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'accounts' && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className={styles.btnRefresh} onClick={loadAccounts} title="Refresh">
                  <i className={`fas fa-sync-alt ${accountsLoading ? 'fa-spin' : ''}`}></i>
                </button>
                <button className={styles.btnPrimary} onClick={openAddAccount}>
                  <i className="fas fa-plus"></i> Add Account
                </button>
              </div>
            </div>

            {accountsError && <div className={styles.errorBanner} style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle"></i> {accountsError}</div>}

            {accountsLoading ? (
              <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading accounts...</p></div>
            ) : accounts.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fas fa-university"></i>
                <h3>No bank accounts yet</h3>
                <p>Add a bank account to start tracking transactions</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {accounts.map(acct => (
                  <div key={acct.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ background: accountTypeColor(acct.account_type), padding: '16px 20px', color: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 600 }}>{acct.account_name}</div>
                          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: 2 }}>{acct.bank_name}</div>
                        </div>
                        <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', textTransform: 'capitalize' }}>
                          {typeLabel(acct.account_type)}
                        </span>
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '12px' }}>
                        {acct.currency} {fmtBalance(acct.current_balance)}
                      </div>
                    </div>
                    <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {acct.account_number ? `••••${String(acct.account_number).slice(-4)}` : 'No account number'}
                        {acct.gl_account_name && <span style={{ marginLeft: 8, color: '#94a3b8' }}>• {acct.gl_account_number}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={styles.actionBtn} onClick={() => openEditAccount(acct)} title="Edit"><i className="fas fa-edit"></i></button>
                        <button className={styles.actionBtn} onClick={() => handleDeleteAccount(acct.id)} title="Delete" style={{ color: '#ef4444' }}><i className="fas fa-trash"></i></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TRANSACTIONS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <>
            <div style={{ padding: '0 24px 12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className={styles.formControlStandard}
                style={{ width: '220px' }}
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
              >
                <option value="">— Select Account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name} ({a.currency} {fmtBalance(a.current_balance)})</option>)}
              </select>
              <input type="date" className={styles.formControlStandard} style={{ width: '148px' }} value={txDateFrom} onChange={e => setTxDateFrom(e.target.value)} />
              <input type="date" className={styles.formControlStandard} style={{ width: '148px' }} value={txDateTo} onChange={e => setTxDateTo(e.target.value)} />
              <input type="text" className={styles.searchInput} style={{ flex: 1, minWidth: '130px' }} placeholder="Search transactions..." value={txSearch} onChange={e => setTxSearch(e.target.value)} />
              <button className={styles.btnRefresh} onClick={() => loadTransactions(selectedAccountId)}>
                <i className={`fas fa-search ${txLoading ? 'fa-spin' : ''}`}></i>
              </button>
              {selectedAccountId && (
                <button className={styles.btnPrimary} onClick={openAddTx}><i className="fas fa-plus"></i> New</button>
              )}
            </div>

            {txError && <div className={styles.errorBanner} style={{ margin: '0 24px 12px' }}><i className="fas fa-exclamation-circle"></i> {txError}</div>}

            {selectedAccount && (
              <div style={{ margin: '0 24px 12px', padding: '10px 16px', background: '#f8fafc', borderRadius: '8px', display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
                <span><strong>{selectedAccount.account_name}</strong></span>
                <span style={{ color: '#1e3a5f' }}>Balance: <strong>{selectedAccount.currency} {fmtBalance(selectedAccount.current_balance)}</strong></span>
                <span style={{ color: '#16a34a' }}>Deposits: +{fmtBalance(totalDeposits)}</span>
                <span style={{ color: '#dc2626' }}>Withdrawals: {fmtBalance(totalWithdrawals)}</span>
              </div>
            )}

            <div className={styles.invoiceGridContainer}>
              {txLoading ? (
                <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading...</p></div>
              ) : !selectedAccountId ? (
                <div className={styles.emptyState}><i className="fas fa-hand-point-up"></i><h3>Select a bank account</h3></div>
              ) : transactions.length === 0 ? (
                <div className={styles.emptyState}><i className="fas fa-receipt"></i><h3>No transactions found</h3><p>Add a transaction to get started</p></div>
              ) : (
                <table className={styles.invoiceTable}>
                  <thead>
                    <tr>
                      <th>Date</th><th>Description</th><th>Payee</th><th>Type</th>
                      <th style={{ textAlign: 'right' }}>Amount</th><th>Reference</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => {
                      const amt = parseFloat(tx.amount)
                      return (
                        <tr key={tx.id}>
                          <td>{fmtDate(tx.transaction_date)}</td>
                          <td><strong>{tx.description}</strong></td>
                          <td style={{ color: '#64748b' }}>{tx.payee || '-'}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${['deposit','interest'].includes(tx.transaction_type) ? styles.statusPaid : ['withdrawal','fee'].includes(tx.transaction_type) ? styles.statusCancelled : styles.statusDraft}`}>
                              {typeLabel(tx.transaction_type)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: amt >= 0 ? '#16a34a' : '#dc2626' }}>
                            {amt >= 0 ? '+' : ''}{fmtBalance(tx.amount)}
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>{tx.reference_no || '-'}</td>
                          <td>
                            {tx.is_reconciled
                              ? <span className={`${styles.statusBadge} ${styles.statusPaid}`}><i className="fas fa-check"></i> Reconciled</span>
                              : <span className={`${styles.statusBadge} ${styles.statusDraft}`}>Pending</span>}
                          </td>
                          <td>
                            {!tx.is_reconciled && (
                              <>
                                <button className={styles.actionBtn} onClick={() => openEditTx(tx)}><i className="fas fa-edit"></i></button>
                                <button className={styles.actionBtn} onClick={() => handleDeleteTx(tx.id)} style={{ color: '#ef4444' }}><i className="fas fa-trash"></i></button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── RECONCILIATION TAB ──────────────────────────────────────────────── */}
        {activeTab === 'reconciliation' && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <select className={styles.formControlStandard} style={{ width: '240px' }} value={recAccountId}
                onChange={e => { setRecAccountId(e.target.value); setRecData(null) }}>
                <option value="">— Select Account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
              </select>
              <button className={styles.btnRefresh} onClick={() => loadReconciliation(recAccountId)}>
                <i className={`fas fa-sync-alt ${recLoading ? 'fa-spin' : ''}`}></i>
              </button>
            </div>

            {recError && <div className={styles.errorBanner} style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle"></i> {recError}</div>}

            {recLoading ? (
              <div className={styles.loadingState}><i className="fas fa-spinner fa-spin"></i><p>Loading...</p></div>
            ) : !recAccountId ? (
              <div className={styles.emptyState}><i className="fas fa-hand-point-up"></i><h3>Select a bank account</h3></div>
            ) : recData ? (
              <>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Book Balance', value: fmtBalance(recData.book_balance), color: '#3b82f6' },
                    { label: 'Outstanding', value: `${recData.outstanding_count} transactions`, color: '#f59e0b' },
                    { label: 'Last Reconciled', value: recData.last_reconciliation ? fmtDate(recData.last_reconciliation.statement_date) : 'Never', color: '#64748b' },
                  ].map(card => (
                    <div key={card.label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: 4 }}>{card.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: card.color }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                {openRec ? (
                  <>
                    {/* Open reconciliation header */}
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <strong>Open Reconciliation</strong>
                          <span style={{ marginLeft: 12, fontSize: '13px', color: '#64748b' }}>Statement Date: {fmtDate(openRec.statement_date)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', flexWrap: 'wrap' }}>
                          <span>Statement Ending: <strong>{fmtBalance(openRec.statement_ending_balance)}</strong></span>
                          <span>Reconciled So Far: <strong>{fmtBalance(openRec.reconciled_balance)}</strong></span>
                          <span style={{ fontWeight: 700, color: Math.abs(recDifference) < 0.01 ? '#16a34a' : '#dc2626' }}>
                            Difference: {fmtBalance(recDifference)}
                          </span>
                        </div>
                      </div>
                      <button
                        className={styles.btnSecondary}
                        style={{ marginTop: 12 }}
                        onClick={handleCompleteRec}
                        disabled={recSaving || Math.abs(recDifference) > 0.01}
                        title={Math.abs(recDifference) > 0.01 ? 'Difference must be 0.00 to complete' : ''}
                      >
                        <i className={recSaving ? 'fas fa-spinner fa-spin' : 'fas fa-check-circle'}></i>
                        {recSaving ? ' Completing...' : ' Complete Reconciliation'}
                      </button>
                    </div>

                    {recData.outstanding_transactions?.length > 0 ? (
                      <table className={styles.invoiceTable}>
                        <thead>
                          <tr><th>✓</th><th>Date</th><th>Description</th><th>Type</th><th style={{ textAlign: 'right' }}>Amount</th><th>Reference</th></tr>
                        </thead>
                        <tbody>
                          {recData.outstanding_transactions.map(tx => {
                            const amt = parseFloat(tx.amount)
                            const isChecked = tx.reconciliation_id === openRec.id && tx.is_reconciled
                            return (
                              <tr key={tx.id} style={{ background: isChecked ? '#f0fdf4' : 'transparent', opacity: isChecked ? 0.65 : 1 }}>
                                <td>
                                  <input type="checkbox" checked={isChecked} onChange={() => handleMarkReconciled(tx.id, isChecked)}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }} />
                                </td>
                                <td>{fmtDate(tx.transaction_date)}</td>
                                <td>{tx.description}</td>
                                <td>
                                  <span className={`${styles.statusBadge} ${amt >= 0 ? styles.statusPaid : styles.statusCancelled}`}>
                                    {typeLabel(tx.transaction_type)}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: amt >= 0 ? '#16a34a' : '#dc2626' }}>
                                  {amt >= 0 ? '+' : ''}{fmtBalance(tx.amount)}
                                </td>
                                <td style={{ fontSize: '12px', color: '#64748b' }}>{tx.reference_no || '-'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className={styles.emptyState}><i className="fas fa-check-circle" style={{ color: '#16a34a' }}></i><h3>No outstanding transactions</h3></div>
                    )}
                  </>
                ) : (
                  <>
                    <button className={styles.btnPrimary} onClick={() => setShowStartRec(true)} style={{ marginBottom: '20px' }}>
                      <i className="fas fa-play-circle"></i> Start Reconciliation
                    </button>
                    {recData.previous_reconciliations?.length > 0 && (
                      <>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151' }}>Previous Reconciliations</h4>
                        <table className={styles.invoiceTable}>
                          <thead><tr><th>Statement Date</th><th>Statement Balance</th><th>Reconciled Balance</th><th>Status</th><th>Date Completed</th></tr></thead>
                          <tbody>
                            {recData.previous_reconciliations.map(r => (
                              <tr key={r.id}>
                                <td>{fmtDate(r.statement_date)}</td>
                                <td style={{ fontFamily: 'monospace' }}>{fmtBalance(r.statement_ending_balance)}</td>
                                <td style={{ fontFamily: 'monospace' }}>{fmtBalance(r.reconciled_balance)}</td>
                                <td><span className={`${styles.statusBadge} ${r.status === 'reconciled' ? styles.statusPaid : styles.statusDraft}`}>{r.status}</span></td>
                                <td>{r.reconciled_at ? fmtDate(r.reconciled_at) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Add/Edit Account Form Modal ─────────────────────────────────────── */}
      {showAccountForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{editingAccountId ? 'Edit Account' : 'Add Bank Account'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowAccountForm(false)}><i className="fas fa-times"></i></button>
            </div>
            {accountFormError && <div className={styles.errorBanner} style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle"></i> {accountFormError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'Account Name *', field: 'account_name', placeholder: 'e.g. Main Checking' },
                { label: 'Bank Name *', field: 'bank_name', placeholder: 'e.g. Chase Bank' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>{label}</label>
                  <input className={styles.formControlStandard} value={accountForm[field]} onChange={e => setAccountForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Account Type *</label>
                <select className={styles.formControlStandard} value={accountForm.account_type} onChange={e => setAccountForm(f => ({ ...f, account_type: e.target.value }))}>
                  {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Account Number</label>
                <input className={styles.formControlStandard} value={accountForm.account_number} onChange={e => setAccountForm(f => ({ ...f, account_number: e.target.value }))} placeholder="Last 4 digits" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Opening Balance</label>
                <input type="number" className={styles.formControlStandard} value={accountForm.opening_balance} onChange={e => setAccountForm(f => ({ ...f, opening_balance: e.target.value }))} placeholder="0.00" step="0.01" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Currency</label>
                <input className={styles.formControlStandard} value={accountForm.currency} onChange={e => setAccountForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="USD" maxLength={3} />
              </div>
            </div>
            <div style={{ marginTop: 16, position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>GL Account (Chart of Accounts)</label>
              <input
                className={styles.formControlStandard}
                value={glSearch}
                onChange={e => { setGlSearch(e.target.value); setAccountForm(f => ({ ...f, gl_account_id: '' })); setShowGlDropdown(true) }}
                onFocus={() => setShowGlDropdown(true)}
                placeholder="Search chart of accounts..."
              />
              {showGlDropdown && glSearch && (
                <div className={styles.autocompleteDropdown}>
                  {filteredGlAccounts.slice(0, 8).map(a => (
                    <div key={a.id} className={styles.autocompleteOption} onClick={() => {
                      setAccountForm(f => ({ ...f, gl_account_id: a.id }))
                      setGlSearch(`${a.account_number} - ${a.name}`)
                      setShowGlDropdown(false)
                    }}>
                      {a.account_number} — {a.name}
                    </div>
                  ))}
                  {filteredGlAccounts.length === 0 && <div className={`${styles.autocompleteOption} ${styles.noResults}`}>No accounts found</div>}
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="ba-active" checked={accountForm.is_active} onChange={e => setAccountForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <label htmlFor="ba-active" style={{ fontSize: 13, cursor: 'pointer' }}>Active</label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className={styles.btnSecondary} onClick={handleSaveAccount} disabled={savingAccount}>
                <i className={savingAccount ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i> {savingAccount ? 'Saving...' : 'Save Account'}
              </button>
              <button className={styles.btnCancel} onClick={() => setShowAccountForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Transaction Form Modal ──────────────────────────────────── */}
      {showTxForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{editingTxId ? 'Edit Transaction' : 'New Transaction'}</h3>
              <button className={styles.closeBtn} onClick={() => setShowTxForm(false)}><i className="fas fa-times"></i></button>
            </div>
            {txFormError && <div className={styles.errorBanner} style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle"></i> {txFormError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Date *</label>
                <input type="date" className={styles.formControlStandard} value={txForm.transaction_date} onChange={e => setTxForm(f => ({ ...f, transaction_date: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Type *</label>
                <select className={styles.formControlStandard} value={txForm.transaction_type} onChange={e => setTxForm(f => ({ ...f, transaction_type: e.target.value }))}>
                  {TX_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Description *</label>
              <input className={styles.formControlStandard} value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} placeholder="Transaction description" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Amount * <small style={{ color: '#94a3b8', fontWeight: 400 }}>(always positive)</small></label>
                <input type="number" className={styles.formControlStandard} value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" step="0.01" min="0" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Payee</label>
                <input className={styles.formControlStandard} value={txForm.payee} onChange={e => setTxForm(f => ({ ...f, payee: e.target.value }))} placeholder="Payee / payer" />
              </div>
            </div>
            {txForm.transaction_type === 'transfer' && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Transfer To</label>
                <select className={styles.formControlStandard} value={txForm.target_bank_account_id} onChange={e => setTxForm(f => ({ ...f, target_bank_account_id: e.target.value }))}>
                  <option value="">— Select target account —</option>
                  {accounts.filter(a => a.id !== selectedAccountId).map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Reference No</label>
                <input className={styles.formControlStandard} value={txForm.reference_no} onChange={e => setTxForm(f => ({ ...f, reference_no: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Notes</label>
              <textarea className={styles.formControlStandard} rows={2} value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className={styles.btnSecondary} onClick={handleSaveTx} disabled={savingTx}>
                <i className={savingTx ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i> {savingTx ? 'Saving...' : 'Save Transaction'}
              </button>
              <button className={styles.btnCancel} onClick={() => setShowTxForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Start Reconciliation Modal ───────────────────────────────────────── */}
      {showStartRec && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '400px', maxWidth: '95vw' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600 }}>Start Bank Reconciliation</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Statement Date *</label>
              <input type="date" className={styles.formControlStandard} value={recStatementDate} onChange={e => setRecStatementDate(e.target.value)} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#374151' }}>Statement Ending Balance *</label>
              <input type="number" className={styles.formControlStandard} value={recStatementBalance} onChange={e => setRecStatementBalance(e.target.value)} placeholder="0.00" step="0.01" />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className={styles.btnSecondary} onClick={handleStartRec} disabled={recSaving}>
                <i className={recSaving ? 'fas fa-spinner fa-spin' : 'fas fa-play'}></i> {recSaving ? 'Starting...' : 'Start'}
              </button>
              <button className={styles.btnCancel} onClick={() => setShowStartRec(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
