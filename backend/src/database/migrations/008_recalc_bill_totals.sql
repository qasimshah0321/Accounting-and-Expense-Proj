-- Recalculate tax_amount and total_amount for bills
-- Fixes records where tax_amount was stored as (qty * rate * tax_rate) instead of (qty * rate * tax_rate / 100)

-- Fix bill line items tax_amount
UPDATE bill_line_items
SET tax_amount = quantity * rate * COALESCE(tax_rate, 0) / 100;

-- Fix bill totals
UPDATE bills b
SET
  subtotal = sub.correct_subtotal,
  tax_amount = sub.correct_tax,
  total_amount = GREATEST(0, sub.correct_subtotal + sub.correct_tax - COALESCE(b.discount_amount, 0))
FROM (
  SELECT
    bill_id,
    COALESCE(SUM(quantity * rate), 0)                              AS correct_subtotal,
    COALESCE(SUM(quantity * rate * COALESCE(tax_rate, 0) / 100), 0) AS correct_tax
  FROM bill_line_items
  GROUP BY bill_id
) sub
WHERE b.id = sub.bill_id
  AND b.deleted_at IS NULL;
