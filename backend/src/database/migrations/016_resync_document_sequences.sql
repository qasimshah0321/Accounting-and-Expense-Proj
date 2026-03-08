-- Migration 016: Re-sync document sequence next_number to be above highest existing doc number.
-- Fixes "Record already exists" (unique constraint violation) caused by sequences that
-- were never incremented when the old frontend passed the document number directly.
--
-- Document numbers can be:
--   INV-001          (prefix-seq)
--   INV-20260226-001 (prefix-date-seq, when include_date=true)
-- We extract the TRAILING numeric segment (everything after the last '-') to get the
-- sequence number, avoiding integer overflow from concatenated date digits.

-- Invoices
UPDATE document_sequences ds
SET next_number = GREATEST(
  ds.next_number,
  COALESCE(
    (
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE(invoice_no, '^.*-', ''), '') AS INTEGER)) + 1
      FROM invoices
      WHERE company_id = ds.company_id
        AND deleted_at IS NULL
        AND invoice_no IS NOT NULL
        AND invoice_no ~ '-[0-9]+$'
    ),
    1
  )
)
WHERE ds.document_type = 'invoice';

-- Sales Orders
UPDATE document_sequences ds
SET next_number = GREATEST(
  ds.next_number,
  COALESCE(
    (
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE(sales_order_no, '^.*-', ''), '') AS INTEGER)) + 1
      FROM sales_orders
      WHERE company_id = ds.company_id
        AND deleted_at IS NULL
        AND sales_order_no IS NOT NULL
        AND sales_order_no ~ '-[0-9]+$'
    ),
    1
  )
)
WHERE ds.document_type = 'sales_order';

-- Delivery Notes
UPDATE document_sequences ds
SET next_number = GREATEST(
  ds.next_number,
  COALESCE(
    (
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE(delivery_note_no, '^.*-', ''), '') AS INTEGER)) + 1
      FROM delivery_notes
      WHERE company_id = ds.company_id
        AND deleted_at IS NULL
        AND delivery_note_no IS NOT NULL
        AND delivery_note_no ~ '-[0-9]+$'
    ),
    1
  )
)
WHERE ds.document_type = 'delivery_note';

-- Purchase Orders
UPDATE document_sequences ds
SET next_number = GREATEST(
  ds.next_number,
  COALESCE(
    (
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE(purchase_order_no, '^.*-', ''), '') AS INTEGER)) + 1
      FROM purchase_orders
      WHERE company_id = ds.company_id
        AND deleted_at IS NULL
        AND purchase_order_no IS NOT NULL
        AND purchase_order_no ~ '-[0-9]+$'
    ),
    1
  )
)
WHERE ds.document_type = 'purchase_order';

-- Estimates
UPDATE document_sequences ds
SET next_number = GREATEST(
  ds.next_number,
  COALESCE(
    (
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE(estimate_no, '^.*-', ''), '') AS INTEGER)) + 1
      FROM estimates
      WHERE company_id = ds.company_id
        AND deleted_at IS NULL
        AND estimate_no IS NOT NULL
        AND estimate_no ~ '-[0-9]+$'
    ),
    1
  )
)
WHERE ds.document_type = 'estimate';

-- Bills
UPDATE document_sequences ds
SET next_number = GREATEST(
  ds.next_number,
  COALESCE(
    (
      SELECT MAX(CAST(NULLIF(REGEXP_REPLACE(bill_no, '^.*-', ''), '') AS INTEGER)) + 1
      FROM bills
      WHERE company_id = ds.company_id
        AND deleted_at IS NULL
        AND bill_no IS NOT NULL
        AND bill_no ~ '-[0-9]+$'
    ),
    1
  )
)
WHERE ds.document_type = 'bill';
