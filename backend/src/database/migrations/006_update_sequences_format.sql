-- ============================================================
-- Migration 006: Update document sequences to no-date format
-- INV-001 style instead of INV-20260227-0001
-- ============================================================

UPDATE document_sequences
SET include_date = false, padding = 3
WHERE document_type IN ('invoice', 'sales_order', 'estimate', 'delivery_note');
