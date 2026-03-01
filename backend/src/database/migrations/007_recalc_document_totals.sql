-- Recalculate tax_amount and grand_total for all documents
-- Fixes records where tax_amount was stored as (qty * rate * tax_rate) instead of (qty * rate * tax_rate / 100)

-- Fix invoice line items tax_amount
UPDATE invoice_line_items
SET tax_amount = (quantity * rate - COALESCE(discount_per_item, 0)) * COALESCE(tax_rate, 0) / 100;

-- Fix invoice totals
UPDATE invoices i
SET
  subtotal = sub.correct_subtotal,
  tax_amount = sub.correct_tax,
  grand_total = GREATEST(0, sub.correct_subtotal + sub.correct_tax + COALESCE(i.shipping_charges, 0) - COALESCE(i.discount_amount, 0))
FROM (
  SELECT
    invoice_id,
    COALESCE(SUM(quantity * rate - COALESCE(discount_per_item, 0)), 0)                              AS correct_subtotal,
    COALESCE(SUM((quantity * rate - COALESCE(discount_per_item, 0)) * COALESCE(tax_rate, 0) / 100), 0) AS correct_tax
  FROM invoice_line_items
  GROUP BY invoice_id
) sub
WHERE i.id = sub.invoice_id
  AND i.deleted_at IS NULL;

-- Fix sales order line items tax_amount
UPDATE sales_order_line_items
SET tax_amount = ordered_qty * rate * COALESCE(tax_rate, 0) / 100;

-- Fix sales order totals
UPDATE sales_orders so
SET
  subtotal = sub.correct_subtotal,
  tax_amount = sub.correct_tax,
  grand_total = GREATEST(0, sub.correct_subtotal + sub.correct_tax - COALESCE(so.discount_amount, 0))
FROM (
  SELECT
    sales_order_id,
    COALESCE(SUM(ordered_qty * rate), 0)                              AS correct_subtotal,
    COALESCE(SUM(ordered_qty * rate * COALESCE(tax_rate, 0) / 100), 0) AS correct_tax
  FROM sales_order_line_items
  GROUP BY sales_order_id
) sub
WHERE so.id = sub.sales_order_id
  AND so.deleted_at IS NULL;

-- Fix estimate line items tax_amount
UPDATE estimate_line_items
SET tax_amount = ordered_qty * rate * COALESCE(tax_rate, 0) / 100;

-- Fix estimate totals
UPDATE estimates e
SET
  subtotal = sub.correct_subtotal,
  tax_amount = sub.correct_tax,
  grand_total = GREATEST(0, sub.correct_subtotal + sub.correct_tax - COALESCE(e.discount_amount, 0))
FROM (
  SELECT
    estimate_id,
    COALESCE(SUM(ordered_qty * rate), 0)                              AS correct_subtotal,
    COALESCE(SUM(ordered_qty * rate * COALESCE(tax_rate, 0) / 100), 0) AS correct_tax
  FROM estimate_line_items
  GROUP BY estimate_id
) sub
WHERE e.id = sub.estimate_id
  AND e.deleted_at IS NULL;
