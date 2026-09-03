# Report Enhancement Plan — ERP System
**Prepared:** June 2026  
**Analyst Perspective:** ERP Specialist — 20 years cross-platform experience  
**Scope:** Gap analysis vs. QuickBooks Online (Plus), Sage 50 / Sage Accounting, Zoho Books — plus actionable enhancement specifications for every missing report.

---

## 1. Current System — Report Inventory

| # | Report | Location | Status |
|---|---|---|---|
| 1 | Business Overview (KPI Dashboard) | Reports → Overview | ✅ Live |
| 2 | Profit & Loss (full income statement) | Reports → P&L | ✅ Live |
| 3 | Balance Sheet | Reports → Balance Sheet | ✅ Live |
| 4 | Cash Flow Statement (indirect method) | Reports → Cash Flow | ✅ Live |
| 5 | Sales Summary + Top Customers | Reports → Sales | ✅ Live |
| 6 | Purchase & Expense Summary | Reports → Purchases | ✅ Live |
| 7 | AR Aging (5 buckets, customer detail) | Reports → AR Aging | ✅ Live |
| 8 | AP Aging (5 buckets, vendor detail) | Reports → AP Aging | ✅ Live |
| 9 | Inventory Valuation (on-hand × cost) | Reports → Inventory | ✅ Live |
| 10 | Tax Summary (Output / Input / Net) | Reports → Tax | ✅ Live |
| 11 | General Ledger | Accounting → GL | ✅ Live (separate module) |
| 12 | Trial Balance | Accounting → Trial Balance | ✅ Live (separate module) |

**Total: 12 reports live.**  
QuickBooks Online ships 65+ reports. Sage Accounting: 50+. Zoho Books: 80+.  
**Gap: ~40–55 standard business reports missing.**

---

## 2. Competitive Comparison Matrix

### 2.1 Financial Statements

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| Profit & Loss | ✅ | ✅ | ✅ | ✅ |
| **P&L Comparison (prior period / prior year)** | ❌ | ✅ | ✅ | ✅ |
| **P&L by Department / Class** | ❌ | ✅ | ✅ | ✅ |
| **P&L Year-to-Date vs Budget** | ❌ | ✅ | ✅ | ✅ |
| Balance Sheet | ✅ | ✅ | ✅ | ✅ |
| **Balance Sheet Comparison (prior period)** | ❌ | ✅ | ✅ | ✅ |
| **Statement of Changes in Equity** | ❌ | ✅ | ✅ | ✅ |
| Cash Flow Statement | ✅ | ✅ | ✅ | ✅ |
| **Cash Flow Forecast (rolling 13-week)** | ❌ | ✅ | ⚠️ | ✅ |

### 2.2 Sales & Receivables

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| Sales Summary | ✅ partial | ✅ | ✅ | ✅ |
| **Sales by Product / Item** | ❌ | ✅ | ✅ | ✅ |
| **Sales by Customer Detail (invoice list)** | ❌ | ✅ | ✅ | ✅ |
| **Invoice Detail Report (filterable)** | ❌ | ✅ | ✅ | ✅ |
| **Customer Balance Summary** | ❌ | ✅ | ✅ | ✅ |
| AR Aging | ✅ | ✅ | ✅ | ✅ |
| **Customer Statement (from reports)** | ❌ | ✅ | ✅ | ✅ |
| **Estimates / Quotes Status Report** | ❌ | ✅ | ✅ | ✅ |
| **Sales Order Status Report** | ❌ | ⚠️ | ✅ | ✅ |
| **Delivery Performance Report** | ❌ | ❌ | ⚠️ | ✅ |
| **Payment Receipts Report** | ❌ | ✅ | ✅ | ✅ |

### 2.3 Purchases & Payables

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| Purchase Summary | ✅ partial | ✅ | ✅ | ✅ |
| **Purchases by Vendor** | ❌ | ✅ | ✅ | ✅ |
| **Purchases by Product / Item** | ❌ | ✅ | ✅ | ✅ |
| **Bill Detail Report (filterable)** | ❌ | ✅ | ✅ | ✅ |
| **Purchase Order Status Report** | ❌ | ⚠️ | ✅ | ✅ |
| AP Aging | ✅ | ✅ | ✅ | ✅ |
| **Vendor Balance Summary** | ❌ | ✅ | ✅ | ✅ |
| **Vendor Payments Report** | ❌ | ✅ | ✅ | ✅ |
| **GRN / Goods Received Report** | ❌ | ❌ | ✅ | ⚠️ |
| **Expense Detail Report (filterable)** | ❌ | ✅ | ✅ | ✅ |

### 2.4 Inventory

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| Inventory Valuation Summary | ✅ | ✅ | ✅ | ✅ |
| **Inventory Valuation Detail (movements)** | ❌ | ✅ | ✅ | ✅ |
| **Stock Movement Report (in/out/adj)** | ❌ | ❌ | ✅ | ✅ |
| **Low Stock / Reorder Report** | ❌ | ✅ | ✅ | ✅ |
| **Sales by Product Report** | ❌ | ✅ | ✅ | ✅ |
| **FIFO / Avg-Cost Layer Report** | ❌ | ✅ | ✅ | ✅ |
| **Committed / Reserved Stock Report** | ❌ | ❌ | ✅ | ✅ |
| **Physical Inventory Worksheet** | ❌ | ✅ | ✅ | ✅ |
| **Inventory Adjustment History** | ❌ | ✅ | ✅ | ✅ |

### 2.5 Banking & Reconciliation

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| **Bank Account Summary** | ❌ | ✅ | ✅ | ✅ |
| **Bank Reconciliation Summary** | ❌ | ✅ | ✅ | ✅ |
| **Reconciliation History Report** | ❌ | ✅ | ✅ | ✅ |
| **Bank Transaction Listing** | ❌ | ✅ | ✅ | ✅ |

### 2.6 Accountant / GL

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| General Ledger | ✅ | ✅ | ✅ | ✅ |
| Trial Balance | ✅ | ✅ | ✅ | ✅ |
| **Journal Entry Report (filterable list)** | ❌ | ✅ | ✅ | ✅ |
| **Account Transactions Report** | ❌ | ✅ | ✅ | ✅ |
| **Adjusted Trial Balance** | ❌ | ✅ | ✅ | ✅ |
| **Audit Trail Report** | ❌ | ✅ | ✅ | ✅ |
| **Void / Deleted Transactions** | ❌ | ✅ | ✅ | ✅ |

### 2.7 Tax

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| Tax Summary (Output / Input / Net) | ✅ | ✅ | ✅ | ✅ |
| **Tax Detail Report (line-by-line)** | ❌ | ✅ | ✅ | ✅ |
| **Withholding Tax Report** | ❌ | ✅ | ⚠️ | ✅ |

### 2.8 Management / Planning

| Report | Current | QuickBooks | Sage | Zoho |
|---|:---:|:---:|:---:|:---:|
| **Budget vs Actual (P&L)** | ❌ | ✅ | ✅ | ✅ |
| **Cash Flow Forecast** | ❌ | ✅ | ⚠️ | ✅ |
| **Profitability by Customer** | ❌ | ✅ | ⚠️ | ✅ |
| **Profitability by Product** | ❌ | ✅ | ⚠️ | ✅ |
| **Recurring Transaction Schedule** | ❌ | ✅ | ✅ | ✅ |

> ✅ = Available | ⚠️ = Partial / Add-on only | ❌ = Not available

---

## 3. Enhancement Requirements — Full Specification

Reports are grouped by **Priority Tier**. Each entry includes: purpose, key columns, filters, backend SQL approach, and estimated effort.

---

### TIER 1 — Critical (Core Financial Management, Highest Business Impact)

---

#### R-01 · Profit & Loss Comparison Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Accountants and CFOs cannot assess performance trajectory without side-by-side period comparison. This is the #1 most-requested report across all ERP categories.

**Report sections:**
- Same income statement structure as current P&L
- Two selectable comparison modes: **Prior Period** (e.g., Jan vs. Dec) and **Prior Year** (Jan 2026 vs. Jan 2025)
- Column layout: `Current Period | Comparison Period | $ Change | % Change`
- Colour-coded: positive variance green, negative red
- Optional: 3-column mode (Current | Budget | Variance) once Budget module is built

**Filters:** From/To date range (auto-calculates comparison period), Comparison mode selector

**Backend approach:**  
Run `getProfitAndLoss()` twice — once for current period, once for comparison period — then merge the two result objects into a comparison structure. No new SQL needed; parallelise the two calls.

**Frontend:** Extend `ProfitLossReport.js` with a comparison toggle; render a 4-column table layout.

**Effort:** M — 1.5 days

---

#### R-02 · Sales by Product / Item Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Most businesses need to know which products drive revenue. Current system only shows top customers — product-level sales analysis is absent.

**Columns:** Product Name, SKU, Product Type, Units Sold, Gross Sales, Discounts Applied, Net Sales, % of Total Revenue

**Filters:** Date range, Product type (inventory/service/non-inventory), Customer

**Backend SQL:**
```sql
SELECT
  p.name, p.sku, p.product_type,
  SUM(ili.quantity) AS units_sold,
  SUM(ili.line_total) AS net_sales,
  COUNT(DISTINCT i.id) AS invoice_count
FROM invoice_line_items ili
JOIN invoices i ON i.id = ili.invoice_id
LEFT JOIN products p ON p.id = ili.product_id
WHERE i.company_id = ? AND i.deleted_at IS NULL
  AND i.status IN ('sent','approved','posted')
  AND i.invoice_date BETWEEN ? AND ?
GROUP BY p.id, p.name, p.sku, p.product_type
ORDER BY net_sales DESC
```

**Effort:** S — 1 day

---

#### R-03 · Invoice Detail Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Users need a filterable, exportable flat list of all invoices — the foundation report for AR management and audit purposes.

**Columns:** Invoice No., Date, Due Date, Customer, Status, Payment Status, Subtotal, Tax, Discount, Grand Total, Amount Paid, Amount Due, Days Overdue

**Filters:** Date range, Customer, Status (multi-select), Payment Status, Amount range, Overdue only toggle

**Grouping options:** By customer, by month, by status

**Backend SQL:** Simple query on `invoices` with LEFT JOIN `customers`, parameterised filters. Already partially available; needs a dedicated report endpoint with full filter support.

**Export:** CSV / Print view

**Effort:** S — 1 day

---

#### R-04 · Bill Detail Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Mirror of Invoice Detail but for payables — essential for AP management and vendor payment planning.

**Columns:** Bill No., Vendor Invoice No., Date, Due Date, Vendor, Status, Payment Status, Subtotal, Tax, Total Amount, Amount Paid, Amount Due, Days Overdue

**Filters:** Date range, Vendor, Status, Payment Status, Overdue toggle

**Effort:** S — 1 day (same pattern as R-03)

---

#### R-05 · Customer Balance Summary
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Single-view of every customer's total open balance — distinct from aging (no bucket breakdown needed). Essential for credit management and collection prioritisation.

**Columns:** Customer, Email, Phone, Credit Limit, Total Invoiced, Total Paid, Outstanding Balance, Credit Utilisation %

**Backend SQL:**
```sql
SELECT
  c.id, c.name, c.email, c.phone, c.credit_limit,
  COUNT(i.id) AS invoice_count,
  SUM(i.grand_total) AS total_invoiced,
  SUM(i.amount_paid) AS total_paid,
  SUM(i.amount_due)  AS outstanding_balance
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
  AND i.deleted_at IS NULL AND i.payment_status != 'paid'
WHERE c.company_id = ? AND c.deleted_at IS NULL
GROUP BY c.id
HAVING outstanding_balance > 0
ORDER BY outstanding_balance DESC
```

**Effort:** S — 0.5 days

---

#### R-06 · Vendor Balance Summary
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Mirror of Customer Balance Summary for AP — total outstanding per vendor.

**Columns:** Vendor, Email, Phone, Total Bills, Total Paid, Outstanding Balance

**Effort:** XS — 0.5 days (same pattern as R-05)

---

#### R-07 · Low Stock / Reorder Alert Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** `products.reorder_level` field exists but is never surfaced in a report. This is the most actionable inventory report — tells purchasing when to reorder before stockouts.

**Columns:** Product, SKU, Category, Current Stock, Reorder Level, Stock Deficit, Avg. Monthly Sales (last 90 days), Estimated Days to Stockout, Last PO Date, Primary Vendor

**Calculation:**  
`Stock Deficit = MAX(reorder_level - current_stock, 0)`  
`Days to Stockout = current_stock / (avg_daily_sales || 1)`

**Backend SQL:**
```sql
SELECT
  p.id, p.name, p.sku, p.current_stock, p.reorder_level,
  GREATEST(p.reorder_level - p.current_stock, 0) AS stock_deficit,
  COALESCE(
    (SELECT SUM(ili.quantity) / 90
     FROM invoice_line_items ili
     JOIN invoices i ON i.id = ili.invoice_id
     WHERE ili.product_id = p.id AND i.company_id = ?
       AND i.status IN ('sent','approved','posted')
       AND i.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    ), 0
  ) AS avg_daily_sales
FROM products p
WHERE p.company_id = ? AND p.deleted_at IS NULL
  AND p.track_inventory = 1
  AND p.current_stock <= p.reorder_level
ORDER BY stock_deficit DESC
```

**Effort:** M — 1 day

---

#### R-08 · Purchases by Vendor Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Identifies vendor spend concentration — critical for negotiation, vendor consolidation, and spend analysis.

**Columns:** Vendor, Bills Count, Total Purchases (net), Tax, Gross Total, Amount Paid, Outstanding, % of Total Spend

**Filters:** Date range, Payment status

**Backend SQL:**
```sql
SELECT
  v.name AS vendor_name,
  COUNT(b.id) AS bill_count,
  SUM(b.subtotal) AS net_purchases,
  SUM(b.tax_amount) AS tax_total,
  SUM(b.total_amount) AS gross_total,
  SUM(b.amount_paid) AS amount_paid,
  SUM(b.amount_due)  AS outstanding
FROM bills b
JOIN vendors v ON v.id = b.vendor_id
WHERE b.company_id = ? AND b.deleted_at IS NULL
  AND b.bill_date BETWEEN ? AND ?
GROUP BY v.id, v.name
ORDER BY gross_total DESC
```

**Effort:** S — 0.5 days

---

#### R-09 · Journal Entry Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Accountants need a searchable, filterable list of all journal entries — for month-end review, audit, and finding posting errors. Currently the GL shows entries per account; this report shows entries as complete double-entry transactions.

**Columns:** Entry No., Date, Reference Type, Reference No., Description, DR Account, CR Account, Amount, Posted By, Created At

**Filters:** Date range, Reference type (invoice/bill/payment/manual/etc.), Status (draft/posted/voided), Created by

**Backend SQL:**
```sql
SELECT
  je.id, je.journal_no, je.entry_date, je.reference_type,
  je.reference_id, je.description, je.status,
  u.name AS created_by,
  SUM(jel.debit) AS total_debit,
  COUNT(jel.id) AS line_count
FROM journal_entries je
LEFT JOIN users u ON u.id = je.created_by
LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
WHERE je.company_id = ? AND je.entry_date BETWEEN ? AND ?
GROUP BY je.id
ORDER BY je.entry_date DESC, je.id DESC
```

With drill-down to show full debit/credit lines per entry.

**Effort:** M — 1.5 days

---

#### R-10 · Audit Trail Report
**Priority:** P1 | **Competitor benchmark:** All three platforms  
**Business need:** Regulatory and internal control requirement. Shows who changed what and when. The `audit_logs` table already captures this — it just needs a report UI.

**Columns:** Timestamp, User, Action (create/update/delete/approve/reject), Module, Document No., Old Value → New Value (JSON diff displayed as readable changes), IP Address

**Filters:** Date range, User, Module, Action type

**Backend SQL:** Query `audit_logs` table with filters. Data already exists.

**Effort:** S — 1 day

---

### TIER 2 — High Priority (Required for Complete Financial Operations)

---

#### R-11 · Purchase Order Status Report
**Priority:** P2 | **Competitor benchmark:** Sage, Zoho  
**Business need:** Procurement teams need to track open POs — what's ordered, what's been received, what's still outstanding.

**Columns:** PO No., Date, Vendor, Status, Expected Delivery, Total Value, Received Value, Outstanding Value, GRN Count, Bill Count, % Fulfilled

**Calculated fields:**  
`% Fulfilled = (received_qty / ordered_qty) × 100`  
`Outstanding Value = PO Total − Received Value`

**Backend:** JOIN `purchase_orders` → `purchase_order_line_items` → `goods_received_notes` → `bills`

**Filters:** Date range, Status, Vendor

**Effort:** M — 1.5 days

---

#### R-12 · Sales Order Status Report
**Priority:** P2 | **Competitor benchmark:** Sage, Zoho  
**Business need:** Sales operations need visibility into open orders — what's been shipped, invoiced, and still outstanding.

**Columns:** SO No., Date, Customer, Status, Total Value, DN Count, Invoiced Amount, Outstanding to Invoice, % Delivered

**Filters:** Date range, Status, Customer

**Effort:** M — 1 day

---

#### R-13 · Estimates / Quotes Status Report
**Priority:** P2 | **Competitor benchmark:** All three platforms  
**Business need:** Sales pipeline visibility — what quotes are open, accepted, expired, or converted to SOs/invoices.

**Columns:** Estimate No., Date, Expiry Date, Customer, Status, Total Value, Converted To (SO/Invoice No.), Conversion Date, Days Open

**Backend:** Query `estimates` table with conversion tracking join.

**Effort:** S — 1 day

---

#### R-14 · Payment Receipts Report (Customer Payments)
**Priority:** P2 | **Competitor benchmark:** All three platforms  
**Business need:** Shows all customer payments received in a period — essential for cash receipts journal and bank deposit reconciliation.

**Columns:** Payment Date, Payment No., Customer, Payment Method, Reference/Cheque No., Amount, Invoices Applied Against, Unapplied Amount

**Backend:** Query `customer_payments` table + `customer_payment_applications`

**Effort:** S — 1 day

---

#### R-15 · Vendor Payments Report
**Priority:** P2 | **Competitor benchmark:** All three platforms  
**Business need:** Mirror of Payment Receipts for AP — all payments made to vendors in a period.

**Columns:** Payment Date, Reference, Vendor, Payment Method, Amount, Bills Applied Against, Bank Account

**Backend:** Query `vendor_payments` table

**Effort:** XS — 0.5 days (same pattern as R-14)

---

#### R-16 · Bank Reconciliation Summary Report
**Priority:** P2 | **Competitor benchmark:** All three platforms  
**Business need:** Shows the history of completed bank reconciliations per account — statement balance, GL balance, reconciled date, and outstanding items count.

**Columns:** Bank Account, Statement Date, Statement Balance, GL Balance at Date, Variance, Reconciled By, Reconciled On, Uncleared Deposits Count, Uncleared Checks Count

**Backend:** Query `bank_reconciliations` (or `banking_transactions` where reconciled) — data already captured in the banking module.

**Effort:** M — 1.5 days

---

#### R-17 · Inventory Stock Movement Report
**Priority:** P2 | **Competitor benchmark:** Sage, Zoho  
**Business need:** Shows every movement for every product — GRN receipts, sales delivery, adjustments, write-offs. Essential for traceability and audit.

**Columns:** Date, Product, SKU, Transaction Type (GRN/Invoice/Adjustment/Write-off), Reference No., Qty In, Qty Out, Running Balance, Unit Cost, Value

**Backend:** Query `inventory_transactions` table (already populated by GRN, adjustments, write-offs) + invoice line items for outbound.

**Filters:** Date range, Product, Transaction type

**Effort:** M — 1.5 days

---

#### R-18 · Expense Detail Report
**Priority:** P2 | **Competitor benchmark:** All three platforms  
**Business need:** Filterable flat list of all expenses — for expense audit, category spend analysis, and reimbursement workflows.

**Columns:** Expense Date, Expense No., Category, Description, Vendor/Payee, Payment Method, Status, Net Amount, Tax, Total Amount, Submitted By

**Filters:** Date range, Category, Status, Payment method, Submitted by

**Effort:** S — 1 day

---

#### R-19 · Balance Sheet Comparison Report
**Priority:** P2 | **Competitor benchmark:** All three platforms  
**Business need:** Compare balance sheet at two points in time — essential for period-end review and identifying structural changes in financial position.

**Layout:** `Account | Balance as of Date A | Balance as of Date B | $ Change | % Change`

**Backend:** Run `getBalanceSheet()` twice for two dates, merge and diff.

**Effort:** S — 1 day

---

#### R-20 · Profitability by Customer Report
**Priority:** P2 | **Competitor benchmark:** QuickBooks, Zoho  
**Business need:** Shows which customers are most and least profitable — comparing revenue earned against COGS and expenses attributable to each customer.

**Columns:** Customer, Revenue, COGS (from invoice line items using `avg_cost`), Gross Profit, Gross Margin %, Invoice Count, Avg Invoice Value

**Backend:**
```sql
SELECT
  c.name AS customer_name,
  SUM(i.grand_total - i.tax_amount) AS net_revenue,
  SUM(
    COALESCE((SELECT SUM(ili2.quantity * p2.cost_price)
              FROM invoice_line_items ili2
              JOIN products p2 ON p2.id = ili2.product_id
              WHERE ili2.invoice_id = i.id), 0)
  ) AS cogs,
  COUNT(i.id) AS invoice_count
FROM invoices i
JOIN customers c ON c.id = i.customer_id
WHERE i.company_id = ? AND i.deleted_at IS NULL
  AND i.status IN ('sent','approved','posted')
  AND i.invoice_date BETWEEN ? AND ?
GROUP BY c.id, c.name
ORDER BY net_revenue DESC
```

**Effort:** M — 1.5 days

---

### TIER 3 — Medium Priority (Advanced Analysis & Planning)

---

#### R-21 · Budget vs Actual Report
**Priority:** P3 | **Competitor benchmark:** All three platforms  
**Business need:** Core management accounting tool. Requires the Budget Management module to be built first (see improvement.md §2.11). Once budgets exist, this report compares actual GL postings against budgeted amounts by account.

**Columns:** Account, Account Type, Budgeted Amount, Actual Amount, Variance ($), Variance (%), YTD Budget, YTD Actual, YTD Variance

**Prerequisite:** `budget_periods` + `budget_lines` tables (migration required)

**Effort:** L — 3 days (including budget module schema)

---

#### R-22 · P&L by Department / Cost Centre
**Priority:** P3 | **Competitor benchmark:** All three platforms  
**Business need:** Multi-department businesses need P&L segmented by department. Requires `department_id` on `journal_entry_lines` (see improvement.md §2.12).

**Layout:** One P&L column per department + consolidated total column.

**Prerequisite:** Department GL tagging on journal entry lines.

**Effort:** L — 3 days (including schema change)

---

#### R-23 · Cash Flow Forecast (13-Week Rolling)
**Priority:** P3 | **Competitor benchmark:** QuickBooks, Zoho  
**Business need:** Forward-looking cash position — uses open invoices due dates, open bills due dates, and recurring document schedule to project weekly cash inflows/outflows.

**Methodology:**
- Week 0: Current cash balance (sum of bank account GL balances)
- Weeks 1-13: AR receipts projected from open invoices by due date, AP payments projected from open bills by due date, recurring document expected amounts
- Net weekly cash position

**Backend:** No historical data needed — query live open invoices/bills filtered by future due dates, grouped by week.

**Effort:** L — 2.5 days

---

#### R-24 · Sales by Product (Detailed)
**Priority:** P3 | **Competitor benchmark:** All three platforms  
**Business need:** Drill-down from R-02 Sales by Product Summary — shows individual invoice lines per product with customer names and dates.

**Columns:** Date, Invoice No., Customer, Product, SKU, Qty, Rate, Discount, Line Total

**Filters:** Date range, Product, Customer, Product type

**Effort:** S — 0.5 days

---

#### R-25 · Purchases by Product / Item
**Priority:** P3 | **Competitor benchmark:** All three platforms  
**Business need:** Shows what was purchased and from which vendors — for procurement analysis and price comparison.

**Columns:** Product, SKU, Vendor, Bill No., Date, Qty, Unit Cost, Line Total, PO Reference

**Backend:** JOIN `bill_line_items` → `bills` → `vendors` → `products`

**Effort:** S — 1 day

---

#### R-26 · Withholding Tax Report
**Priority:** P3 | **Competitor benchmark:** QuickBooks, Zoho  
**Business need:** FBR compliance (Pakistan) — tracks WHT deducted from vendor payments. Critical for monthly WHT deposits to tax authority.

**Columns:** Vendor, NTN No., Payment Date, Bill No., Gross Payment, WHT Rate, WHT Amount, Net Payment

**Note:** Requires `withholding_tax_rate` field on vendors and WHT tracking on `vendor_payments`. Schema change required.

**Effort:** L — 2 days (including schema)

---

#### R-27 · GRN / Goods Received Report
**Priority:** P3 | **Competitor benchmark:** Sage, Zoho  
**Business need:** Procurement visibility — shows all goods received notes with PO linkage, receipt quantities, and variances from ordered quantities.

**Columns:** GRN No., Receipt Date, Vendor, PO No., Product, Ordered Qty, Received Qty, Variance, Unit Cost, Total Value, Status

**Backend:** Query `goods_received_notes` → `grn_line_items` → `purchase_orders`

**Effort:** S — 1 day

---

#### R-28 · Physical Inventory Worksheet
**Priority:** P3 | **Competitor benchmark:** QuickBooks, Sage, Zoho  
**Business need:** Printable worksheet for stocktake — lists all inventory products with their system quantity, leaving a column for the counted quantity and variance. After count, variances are entered as adjustments.

**Columns:** Product, SKU, Location, UOM, System Qty, Counted Qty (blank), Variance, Unit Cost, Value Variance

**Output:** Print-optimised layout (no screen rendering needed — PDF/print only)

**Effort:** S — 1 day

---

#### R-29 · Account Transactions Report
**Priority:** P3 | **Competitor benchmark:** All three platforms  
**Business need:** Shows all transactions hitting a single GL account in a period — a single-account view of the General Ledger. More focused than full GL, more detailed than Trial Balance.

**Columns:** Date, Reference Type, Reference No., Description, Debit, Credit, Running Balance

**Filters:** Account selector, Date range

**Backend:** Subset of existing GL query — already available in the GL module; needs a dedicated report endpoint with date filtering.

**Effort:** S — 0.5 days (reuse GL query)

---

#### R-30 · Recurring Transaction Schedule Report
**Priority:** P3 | **Competitor benchmark:** All three platforms  
**Business need:** Summary view of all active recurring templates — showing next run dates, frequency, expected amounts (if configured), and run history. Helps finance teams plan for expected cash flows.

**Columns:** Template Name, Type, Frequency, Start Date, End Date, Last Run, Next Run, Total Runs, Max Runs, Status (Active/Paused)

**Backend:** Query `recurring_documents` table — data already exists.

**Effort:** XS — 0.5 days

---

#### R-31 · Statement of Changes in Equity
**Priority:** P3 | **Competitor benchmark:** All three platforms  
**Business need:** Required for full IFRS/IAS financial statement set. Shows movements in equity accounts: opening balance, net income, dividends/withdrawals, other comprehensive income, closing balance.

**Columns:** Equity Component | Opening Balance | Net Income | Contributions | Withdrawals | Closing Balance

**Backend:** Derive from GL equity account postings in the period.

**Effort:** M — 1.5 days

---

### TIER 4 — Future / Advanced

---

#### R-32 · Inventory FIFO / Avg Cost Layer Report
**Priority:** P4 | **Competitor benchmark:** QuickBooks, Sage, Zoho  
**Business need:** With weighted average cost implemented (see improvement.md §1.4), show cost layers per product — purchase batches, their costs, and how much of each layer remains.

**Prerequisite:** Weighted average cost implementation.

**Effort:** L — 3 days (after WAC module)

---

#### R-33 · Delivery Performance Report
**Priority:** P4 | **Competitor benchmark:** Zoho  
**Business need:** Shows on-time delivery rate per customer — compares promised delivery date (from SO) against actual delivery note date.

**Columns:** Customer, SO No., Promised Date, DN Date, Days Early/Late, Status, On-Time %

**Effort:** M — 1.5 days

---

#### R-34 · Committed / Reserved Stock Report
**Priority:** P4 | **Competitor benchmark:** Sage, Zoho  
**Business need:** Shows stock committed to open sales orders vs. available stock — prevents overselling.

**Columns:** Product, SKU, On Hand, Reserved for Open SOs, Available to Promise

**Backend:** `current_stock` − SUM of open SO line quantities for each product

**Effort:** S — 1 day

---

#### R-35 · Inventory Adjustment History
**Priority:** P4 | **Competitor benchmark:** All three platforms  
**Business need:** Full audit trail of all stock adjustments and write-offs — who adjusted what, when, and why.

**Columns:** Date, Product, Adjustment Type (Manual/Write-off/Count variance), Qty Before, Adjustment Qty, Qty After, Unit Cost, Value Impact, Reason, Adjusted By

**Backend:** Query `inventory_transactions` where type = 'adjustment' or 'write_off'

**Effort:** S — 1 day

---

#### R-36 · Tax Detail Report (Line-by-Line)
**Priority:** P4 | **Competitor benchmark:** All three platforms  
**Business need:** Drill-down from Tax Summary — shows every individual invoice line and bill line that contributed to output/input tax. Required for tax audit defense.

**Columns:** Date, Document No., Customer/Vendor, Product, Net Amount, Tax Rate %, Tax Amount, Tax Name

**Backend:** JOIN `invoice_line_items` → `invoices` → `taxes` for output; same pattern for input

**Effort:** S — 1 day

---

## 4. Report Delivery Features (Cross-Cutting Enhancements)

These apply to **all** reports and match the capability level of the three benchmark systems.

### F-01 · Export to CSV / Excel
**Priority:** P1 | All three competitors provide this  
Every report should export all rows (not just the visible page) to CSV. The backend should accept an `?export=csv` query param that sets `Content-Type: text/csv` and streams the data.

**Implementation:** Add a generic CSV serialiser in a `reports.utils.ts` helper. Each service function already returns a plain array — just serialise to CSV headers + rows.

**Effort:** S — 1 day (generic utility, then apply to all reports)

---

### F-02 · Print-Optimised View
**Priority:** P1 | All three competitors provide this  
A print stylesheet (`@media print`) that hides the sidebar, tab bar, and action buttons; renders only the report title, date range, company name/logo, and the report table in a clean, printable layout.

**Implementation:** Add `RecurringCenter.module.css`-style print rules to `Invoice.module.css` and a dedicated `ReportPrint.module.css`.

**Effort:** S — 0.5 days

---

### F-03 · Report Date Presets
**Priority:** P2 | All three competitors provide this  
Replace manual date pickers with a smart preset selector:  
`This Month | Last Month | This Quarter | Last Quarter | This Year | Last Year | Custom`

When a preset is selected, from/to dates are auto-populated. "Custom" reveals the manual date pickers.

**Effort:** XS — 0.5 days

---

### F-04 · Column Sorting on All Report Tables
**Priority:** P2 | All three competitors provide this  
Click any column header to sort ascending/descending. Purely frontend — sort the loaded data array in state.

**Effort:** XS — 0.5 days (generic `useSortedTable` hook)

---

### F-05 · Report Search / Filter Bar
**Priority:** P2 | Zoho, QuickBooks  
A search bar above each report table that filters visible rows by any text column (customer name, invoice no., vendor, etc.) using client-side filtering.

**Effort:** XS — 0.5 days

---

### F-06 · Drill-Down Navigation
**Priority:** P2 | All three competitors provide this  
Click a customer row in Sales Summary → opens Invoice Detail Report filtered to that customer. Click an account in Trial Balance → opens Account Transactions Report. This inter-report navigation dramatically improves usability.

**Implementation:** Pass filter state through URL query params or a report context provider.

**Effort:** M — 2 days (wiring across all reports)

---

### F-07 · Scheduled Report Emails
**Priority:** P3 | QuickBooks, Zoho  
Allow users to schedule a report to be emailed as a PDF/CSV on a cron schedule (e.g., P&L every Monday, AR Aging every Friday). Uses the existing scheduler service.

**Prerequisite:** Outbound email integration (improvement.md §6.7)

**Effort:** L — 3 days (after email integration)

---

### F-08 · Report Bookmarks / Favourites
**Priority:** P4 | QuickBooks, Zoho  
Save a report with its current filter settings as a named bookmark (e.g., "Monthly COGS Analysis"). Stored per user in the DB.

**Effort:** M — 2 days

---

## 5. Summary — Gap Count by Competitor

| Category | Current | QB Gap | Sage Gap | Zoho Gap |
|---|:---:|:---:|:---:|:---:|
| Financial Statements | 3 | +4 | +4 | +5 |
| Sales & Receivables | 2 | +9 | +8 | +10 |
| Purchases & Payables | 2 | +8 | +9 | +9 |
| Inventory | 1 | +8 | +8 | +9 |
| Banking | 0 | +4 | +4 | +4 |
| Accountant / GL | 2 | +5 | +5 | +5 |
| Tax | 1 | +2 | +1 | +2 |
| Management / Planning | 0 | +5 | +3 | +5 |
| **Total new reports** | **12** | **+45** | **+42** | **+49** |

---

## 6. Implementation Roadmap

### Sprint 1 — Foundation (Weeks 1–2)
Focus: Highest-impact, lowest-effort reports that complete the core financial picture.

| # | Report | Effort |
|---|---|---|
| R-03 | Invoice Detail Report | S |
| R-04 | Bill Detail Report | S |
| R-05 | Customer Balance Summary | S |
| R-06 | Vendor Balance Summary | XS |
| R-08 | Purchases by Vendor | S |
| R-10 | Audit Trail Report | S |
| R-30 | Recurring Transaction Schedule | XS |
| F-01 | CSV Export (all reports) | S |
| F-03 | Date Presets | XS |
| F-04 | Column Sorting | XS |
| F-05 | Search / Filter Bar | XS |

**Sprint 1 total: ~8 working days | Delivers: +10 new reports, CSV export, 3 UX features**

---

### Sprint 2 — Sales & Purchasing Intelligence (Weeks 3–4)

| # | Report | Effort |
|---|---|---|
| R-01 | P&L Comparison (prior period / prior year) | M |
| R-02 | Sales by Product / Item | S |
| R-07 | Low Stock / Reorder Alert | M |
| R-09 | Journal Entry Report | M |
| R-11 | Purchase Order Status | M |
| R-12 | Sales Order Status | M |
| R-13 | Estimates / Quotes Status | S |
| R-14 | Payment Receipts Report | S |
| R-15 | Vendor Payments Report | XS |
| F-02 | Print-Optimised View | S |

**Sprint 2 total: ~10 working days | Delivers: +9 new reports**

---

### Sprint 3 — Operations & Inventory Depth (Weeks 5–6)

| # | Report | Effort |
|---|---|---|
| R-16 | Bank Reconciliation Summary | M |
| R-17 | Inventory Stock Movement | M |
| R-18 | Expense Detail Report | S |
| R-19 | Balance Sheet Comparison | S |
| R-20 | Profitability by Customer | M |
| R-24 | Sales by Product (Detailed) | S |
| R-25 | Purchases by Product | S |
| R-27 | GRN / Goods Received Report | S |
| R-28 | Physical Inventory Worksheet | S |
| R-29 | Account Transactions | S |
| F-06 | Drill-Down Navigation | M |

**Sprint 3 total: ~10 working days | Delivers: +11 new reports, drill-down**

---

### Sprint 4 — Advanced & Planning Reports (Weeks 7–9)

| # | Report | Effort | Prerequisite |
|---|---|---|---|
| R-21 | Budget vs Actual | L | Budget module |
| R-22 | P&L by Department | L | Dept GL tagging |
| R-23 | Cash Flow Forecast | L | — |
| R-26 | Withholding Tax | L | WHT schema |
| R-31 | Statement of Changes in Equity | M | — |
| R-32 | Inventory FIFO / Avg Cost Layers | L | WAC module |
| F-07 | Scheduled Report Emails | L | Email integration |

**Sprint 4 total: ~15 working days | Delivers: +7 advanced reports**

---

### Sprint 5 — Future Enhancements (Backlog)

| # | Report |
|---|---|
| R-33 | Delivery Performance |
| R-34 | Committed / Reserved Stock |
| R-35 | Inventory Adjustment History |
| R-36 | Tax Detail Report (line-by-line) |
| F-08 | Report Bookmarks / Favourites |

---

## 7. Backend API Endpoint Plan

All new report endpoints follow the existing pattern in `reports.routes.ts`:

```
GET /api/v1/reports/invoice-detail?from=&to=&customer_id=&status=&payment_status=
GET /api/v1/reports/bill-detail?from=&to=&vendor_id=&status=&payment_status=
GET /api/v1/reports/customer-balance-summary
GET /api/v1/reports/vendor-balance-summary
GET /api/v1/reports/sales-by-product?from=&to=&product_type=
GET /api/v1/reports/purchases-by-vendor?from=&to=
GET /api/v1/reports/low-stock
GET /api/v1/reports/purchase-order-status?from=&to=&status=&vendor_id=
GET /api/v1/reports/sales-order-status?from=&to=&status=&customer_id=
GET /api/v1/reports/estimates-status?from=&to=&status=
GET /api/v1/reports/payment-receipts?from=&to=&customer_id=
GET /api/v1/reports/vendor-payments?from=&to=&vendor_id=
GET /api/v1/reports/bank-reconciliation-summary
GET /api/v1/reports/stock-movement?from=&to=&product_id=
GET /api/v1/reports/expense-detail?from=&to=&category=&status=
GET /api/v1/reports/balance-sheet-comparison?date1=&date2=
GET /api/v1/reports/profitability-by-customer?from=&to=
GET /api/v1/reports/journal-entries?from=&to=&reference_type=&status=
GET /api/v1/reports/audit-trail?from=&to=&user_id=&module=
GET /api/v1/reports/profit-loss-comparison?from=&to=&compare_mode=prior_period|prior_year
GET /api/v1/reports/cash-flow-forecast
GET /api/v1/reports/recurring-schedule
GET /api/v1/reports/grn-report?from=&to=&vendor_id=
GET /api/v1/reports/physical-inventory-worksheet
GET /api/v1/reports/account-transactions?account_id=&from=&to=
```

All endpoints:  
- Scoped by `company_id` from JWT  
- Support `?export=csv` param for CSV download  
- Return `{ data: [...], summary: {...}, generated_at: ISO8601 }`

---

*This document should be reviewed and updated after each sprint. Priority assignments are based on business impact frequency, competitor standard inclusion, and implementation complexity.*
