-- Migration 042: Resync RFQ document sequence past existing records
-- Prevents duplicate key errors when the sequence is behind the actual data

UPDATE document_sequences ds
INNER JOIN (
  SELECT company_id,
         MAX(CAST(SUBSTRING_INDEX(rfq_no, '-', -1) AS UNSIGNED)) + 1 AS next_num
  FROM rfqs
  WHERE deleted_at IS NULL
  GROUP BY company_id
) latest ON ds.company_id = latest.company_id
SET ds.next_number = latest.next_num,
    ds.updated_at  = NOW()
WHERE ds.document_type = 'rfq'
  AND ds.next_number < latest.next_num;
