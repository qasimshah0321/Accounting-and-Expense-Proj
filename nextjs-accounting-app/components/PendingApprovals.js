'use client'

import { useState, useEffect, useCallback } from 'react'
import * as api from '@/lib/api'

const DOC_LABELS = {
  purchase_order: 'Purchase Order',
  bill: 'Bill',
  invoice: 'Invoice',
  expense: 'Expense',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function PendingApprovals({ isOpen, onClose, onCountChange, currencySymbol = '$' }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getMyPendingApprovals()
      const list = res.data || []
      setRequests(list)
      if (onCountChange) onCountChange(list.length)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [onCountChange])

  useEffect(() => {
    if (isOpen) fetchPending()
  }, [isOpen, fetchPending])

  if (!isOpen) return null

  const handleApprove = async (id) => {
    setActioningId(id)
    try {
      await api.approveRequest(id)
      await fetchPending()
    } catch (err) {
      alert('Approve failed: ' + err.message)
    } finally {
      setActioningId(null)
    }
  }

  const handleStartReject = (id) => {
    setRejectingId(id)
    setRejectReason('')
  }

  const handleCancelReject = () => {
    setRejectingId(null)
    setRejectReason('')
  }

  const handleConfirmReject = async (id) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    setActioningId(id)
    try {
      await api.rejectRequest(id, rejectReason.trim())
      setRejectingId(null)
      setRejectReason('')
      await fetchPending()
    } catch (err) {
      alert('Reject failed: ' + err.message)
    } finally {
      setActioningId(null)
    }
  }

  const formatAmount = (a) => {
    const n = Number(a || 0)
    return `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 99000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 'min(960px, 94%)', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-clipboard-check" style={{ color: '#2CA01C', fontSize: 18 }}></i>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1e293b' }}>
              Pending Approvals
            </h2>
            <span style={{
              background: '#eef2ff', color: '#4338ca', padding: '2px 10px',
              borderRadius: 999, fontSize: 12, fontWeight: 600,
            }}>
              {requests.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={fetchPending}
              title="Refresh"
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', color: '#475569',
              }}
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb',
                background: '#fff', cursor: 'pointer', color: '#475569',
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13,
            }}>
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 10 }}></i>
              <p>Loading pending approvals…</p>
            </div>
          ) : requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 50, color: '#94a3b8' }}>
              <i className="fas fa-clipboard-check" style={{ fontSize: 32, marginBottom: 12, color: '#cbd5e1' }}></i>
              <p style={{ margin: 0, fontSize: 14 }}>No pending approvals — you're all caught up.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={thStyle}>Document</th>
                  <th style={thStyle}>Number</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Requested By</th>
                  <th style={thStyle}>Submitted</th>
                  <th style={{ ...thStyle, textAlign: 'right', width: 230 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <span style={{
                        background: '#eef2ff', color: '#4338ca', padding: '2px 8px',
                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                      }}>
                        {DOC_LABELS[r.document_type] || r.document_type}
                      </span>
                    </td>
                    <td style={tdStyle}>{r.document_no || '-'}</td>
                    <td style={tdStyle}>{formatAmount(r.document_amount)}</td>
                    <td style={tdStyle}>{(r.requested_by_name || '').trim() || '-'}</td>
                    <td style={tdStyle}>{timeAgo(r.created_at)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {rejectingId === r.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <input
                            type="text"
                            placeholder="Reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            style={{
                              padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6,
                              fontSize: 13, width: 140,
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleConfirmReject(r.id)}
                            disabled={actioningId === r.id}
                            style={{ ...btnDanger, padding: '6px 10px' }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={handleCancelReject}
                            style={{ ...btnSecondary, padding: '6px 10px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actioningId === r.id}
                            style={btnPrimary}
                            title="Approve"
                          >
                            <i className="fas fa-check"></i> Approve
                          </button>
                          <button
                            onClick={() => handleStartReject(r.id)}
                            disabled={actioningId === r.id}
                            style={btnDanger}
                            title="Reject"
                          >
                            <i className="fas fa-times"></i> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const thStyle = {
  padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#475569',
  textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '1px solid #e2e8f0',
}
const tdStyle = {
  padding: '12px', color: '#1e293b', fontSize: 14, verticalAlign: 'middle',
}
const btnPrimary = {
  padding: '7px 12px', borderRadius: 6, border: 'none',
  background: '#2CA01C', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnDanger = {
  padding: '7px 12px', borderRadius: 6, border: 'none',
  background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecondary = {
  padding: '7px 12px', borderRadius: 6, border: '1px solid #d1d5db',
  background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer',
}
