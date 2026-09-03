# ERP System — Architecture & Accounting Review
**Review Date:** May 2026
**Reviewer Perspective:** 20 years ERP Architecture + 20 years Chartered Accountancy
**Scope:** Full codebase audit — accounting completeness, ERP architecture, process flow, regulatory compliance, and improvement roadmap

---

## Executive Summary

The system is a **well-structured, functional mid-market ERP** covering the core purchase-to-pay and order-to-cash cycles with integrated GL auto-posting. The multi-tenant architecture is sound, RBAC is flexible, and the audit trail is comprehensive. However, several **critical accounting gaps**, **missing ERP modules**, and **process control weaknesses** must be addressed before it can serve as a complete financial system of record. This document catalogues every identified issue with priority rankings.

---

## Section 1 — Accounting Completeness (CA Perspective)

### 1.1 GL Posting Coverage — Current State

| Business Event | GL Posting | Status |
|---|---|---|
| GRN received | DR Inventory / CR AP | ✅ Implemented |
| Bill approved (no GRN) | DR Inventory or DR Expense (net) / DR Input Tax (1250) / CR AP (gross) | ✅ Implemented |
| Bill approved (GRN-linked) | Skipped — GRN already posted | ✅ Implemented |
| Bill paid | DR AP / CR Cash | ✅ Implemented |
| Invoice approved | DR AR / CR Revenue / CR Tax Payable (2200) | ✅ Implemented |
| Invoice approved (inventory items) | DR COGS / CR Inventory | ✅ Implemented |
| Customer payment | DR Cash / CR AR | ✅ Implemented |
| Vendor payment | DR AP / CR Cash | ✅ Implemented |
| Inventory adjustment (in) | DR Inventory (1200) / CR Other Expense (5900) | ✅ Implemented |
| Inventory write-off | DR Write-Off/Shrinkage (5050) / CR Inventory (1200) | ✅ Implemented — dedicated account 5050 |
| Expense approved | DR Expense (net) / DR Input Tax (1250) / CR Cash (gross) | ✅ Implemented |
| Bill tax amount | DR Input Tax Recoverable (1250) / CR AP | ✅ Implemented — account 1250 added |
| Expense tax amount | DR Input Tax Recoverable (1250) / CR Cash | ✅ Implemented — account 1250 added |
| Bank reconciliation variance ≤ $1.00 | DR Bank Charges (5800) or CR Other Income (4900) | ✅ Implemented — auto-posts on complete |
| Bank reconciliation variance > $1.00 | Blocked — user must add missing transactions | ✅ Implemented — hard stop enforced |
| Opening balances | DR/CR each account / offset to Opening Balance Equity (3050) | ✅ Implemented — wizard in Chart of Accounts |
| **Fixed asset purchase** | **DR PP&E (1500) / CR AP or Cash** | ❌ Pending — needs Fixed Asset module |
| **Depreciation run** | **DR Depreciation Expense (5700) / CR Accum. Depreciation (1510)** | ❌ Pending — needs Fixed Asset module |
| **Exchange gain/loss** | **DR/CR Exchange Gain (4900) or Loss (5900)** | ❌ Pending — needs multi-currency engine |
| **Accrual entries** | **DR Expense / CR Accrued Expenses (2100) with auto-reversal** | ❌ Pending — needs accrual workflow |
| **Provision for bad debts** | **DR Bad Debt Expense / CR Allowance for Doubtful Accounts (1150)** | ❌ Pending — needs AR provisioning workflow |

---

### 1.2 Opening Balance Entry & Year-End Close

**Severity: CRITICAL → ✅ RESOLVED**

**What was implemented:**

1. **Opening Balance journal entry type** — `reference_type = 'opening_balance'` tagged on the posted journal entry. GL report treats OB entries as the opening balance row (not as period transactions) regardless of their date.

2. **Opening Balance Wizard** (`OpeningBalance.js`) — accessible from Chart of Accounts toolbar (purple "Opening Balance" button):
   - Date picker for the opening date
   - All accounts listed by type (Assets / Liabilities / Equity / Revenue / Expenses) with balance inputs
   - Live Debits / Credits / Opening Balance Equity (3050) totals
   - Auto-balances the entry via account 3050 (Opening Balance Equity)
   - Supports re-posting (can correct and re-enter)
   - View mode shows posted balances with Edit option

3. **Account 3050 Opening Balance Equity** — seeded for all companies via migration 047

4. **Year-End Close** (`YearEndClose.js`) — accessible from Chart of Accounts toolbar (amber "Year-End Close" button):
   - Preview shows all P&L accounts, current balances, and net income/loss
   - Posts closing entry: DR all Revenue / CR all Expense / net → Retained Earnings (3100)
   - Resets all revenue and expense account balances to zero
   - Prevents duplicate close for same fiscal year (entry tagged `year_end_close`)
   - Mandatory confirmation checkbox before posting
   - History of all previous closes shown

5. **GL report fix** — `getGeneralLedger` now correctly handles `opening_balance` entries:
   - OB entries always included in opening balance calculation (regardless of date)
   - OB entries excluded from period transaction list

---

### 1.3 Tax Liability Posting on Purchases

**Severity: HIGH → ✅ RESOLVED**

**What was implemented:**

1. **Account 1250 Input Tax Recoverable** — added via migration 046, seeded for all companies

2. **Direct bill approval** — GL now posts correctly:
   ```
   DR Inventory (1200)         net inventory line items
   DR Other Expense (5900)     net non-inventory line items
   DR Input Tax Recoverable (1250)   tax_amount
   CR Accounts Payable (2000)  gross total (subtotal + tax)
   ```

3. **GRN-linked bill approval** — previously skipped ALL GL (since GRN posts inventory). Fixed: still posts the tax portion:
   ```
   DR Input Tax Recoverable (1250)   bill.tax_amount
   CR Accounts Payable (2000)        bill.tax_amount
   ```
   (Inventory was already posted at GRN receipt — only tax was missing)

4. **Expense approval** — GL now posts correctly:
   ```
   DR Expense account (net amount excl. tax)
   DR Input Tax Recoverable (1250)   tax_amount
   CR Cash (1000)                    gross total
   ```

5. **Tax Summary Report** — new tab in Reports Dashboard (`Reports → Tax Summary`):
   - **Output Tax** — from approved/posted invoices, with breakdown by tax rate
   - **Input Tax** — from approved bills + approved expenses (shown separately)
   - **Net Tax Payable** (or refundable) = Output Tax − Input Tax
   - Full Tax Return Computation table showing the calculation
   - Backend: `GET /api/v1/reports/tax-summary?date_from=&date_to=`

---

### 1.4 Missing — Inventory Costing Method

**Severity: HIGH**

The system uses a static `cost_price` per product. This is Specific Identification costing at best, but is actually just a fixed cost field. There is no:
- FIFO (First In, First Out) layer tracking
- Weighted Average Cost calculation
- LIFO tracking
- Cost layer table (`inventory_cost_layers`)

**Impact:**
- When goods are received at different prices over time, the COGS posted on invoice approval is always based on the static `cost_price`, not the actual purchased cost
- Inventory valuation on the balance sheet will drift from GL balance in Inventory (1200)
- The GL Inventory account and the physical inventory valuation report will diverge over time

**Recommendation:**
Implement Weighted Average Cost (the simplest method that stays balanced with GL):
- On each GRN receipt: recalculate `weighted_avg_cost = (current_stock × current_avg_cost + received_qty × unit_cost) / (current_stock + received_qty)`
- Store `avg_cost` in products table
- Use `avg_cost` (not `cost_price`) for COGS posting on invoice approval
- Use `avg_cost` for inventory adjustment GL values

---

### 1.5 Missing — Balance Sheet Report

**Severity: HIGH**

The system has a Profit & Loss report but **no Balance Sheet report**. A Balance Sheet is a statutory requirement in every jurisdiction. No accountant can sign off on financials without it.

**What's needed:**
- Assets: Current Assets (Cash, AR, Inventory, Prepaid) + Fixed Assets (PP&E net of depreciation)
- Liabilities: AP, Tax Payable, Accrued Expenses, Short/Long-term debt
- Equity: Owner's Equity + Retained Earnings + Current Year Net Profit

The data exists in the GL — it is a presentation/reporting gap only.

---

### 1.6 Missing — Cash Flow Statement

**Severity: MEDIUM**

No Cash Flow Statement (direct or indirect method). Required for complete financial reporting under IAS/IFRS/GAAP. The system has all the raw data in bank transactions and payments — needs a report layer.

---

### 1.7 Missing — Period Locking / Fiscal Period Controls

**Severity: HIGH**

There are no accounting periods and no period locking. This means:
- A user can post a journal entry dated three years ago
- Prior-period entries can silently change audited figures
- No cut-off control on month/year end

**Recommendation:**
- Add `accounting_periods` table (period_name, start_date, end_date, status: open/closed/locked)
- Add `locked_before_date` on companies table as a simple alternative
- Validate `entry_date >= locked_before_date` on all auto-posting and manual journal entries
- Add a "Close Period" action that prevents back-dating beyond that period

---

### 1.8 Missing — Provision for Doubtful Debts

**Severity: MEDIUM**

Account `1150 Allowance for Doubtful Accounts` exists in the chart of accounts but is never used. There is no:
- Bad debt provision journal (DR Bad Debt Expense / CR Allowance for Doubtful Accounts)
- Write-off of specific invoices against the provision
- Recovery posting

---

### 1.9 Weak — Inventory Write-Off Account

**Severity: LOW-MEDIUM**


Inventory write-offs and adjustments-out post to `5900 Other Expenses`. This is technically acceptable but poor practice. Best practice is a dedicated account such as `5050 Inventory Write-Off / Shrinkage` which allows separate P&L reporting of inventory losses vs. normal operating expenses.

---

### 1.10 Missing — Accruals and Prepayments

**Severity: MEDIUM**

`2100 Accrued Expenses` and `1300 Prepaid Expenses` are seeded in the COA but have no corresponding business process. There is no:
- Accrual journal entry workflow (e.g., accrue salary at month-end, reverse in next period)
- Prepayment amortisation schedule
- Auto-reversal mechanism for accruals in the next period

This is a standard requirement for month-end close in any business.

---

### 1.11 Missing — Inter-Period Retained Earnings Roll

**Severity: HIGH**

At year-end, revenue and expense accounts must be closed to Retained Earnings (3100). There is no year-end close procedure. The P&L accounts accumulate indefinitely. The system has no concept of a fiscal year.

---

## Section 2 — ERP Architecture Review (Technical Perspective)

### 2.1 Missing — Approval Workflow Engine

**Severity: HIGH**

Every document (PO, bill, invoice, expense) has hard-coded status transitions in VALID_TRANSITIONS dictionaries. There is no configurable approval workflow. Real-world requirements include:

- **Purchase order approval limits:** POs under $1,000 approved by department head; over $10,000 require CFO approval
- **Invoice approval:** Finance team reviews before posting to GL
- **Expense approval:** Manager approval before reimbursement
- **Multi-step workflows:** Sequential or parallel approvers

**Recommendation:** Add an `approval_workflows` table:
```
approval_workflows (id, company_id, document_type, condition_field, condition_operator, condition_value, approver_role, step_order)
```
The `updateStatus` functions should check pending approval steps before allowing transitions.

---

### 2.2 Missing — Background Job Scheduler

**Severity: HIGH**

Several features exist in code but require manual API triggers:
- Recurring document generation (recurring.service.ts) — no scheduler fires it
- Overdue invoice/bill status update — no background job updates `payment_status` to `overdue`
- Future: depreciation runs, accrual reversals, period-end processing

**Current state:** If no one calls the API, recurring invoices never generate. Overdue invoices never show as overdue until someone queries them.

**Recommendation:** Add a job scheduler (node-cron or Bull/BullMQ with Redis):
- `0 6 * * *` — Daily: Run due recurring documents, update overdue statuses
- `0 2 1 * *` — Monthly: Generate depreciation entries, send aging reminders
- `0 3 * * 0` — Weekly: Send outstanding AR/AP summary notifications

---

### 2.3 Missing — Goods Return / Credit Note Process

**Severity: HIGH**

There is no:
- **Purchase Return / Debit Note:** Return goods to vendor (reverse GRN; DR AP / CR Inventory)
- **Sales Return / Credit Note:** Customer returns goods (reverse invoice; DR Revenue / CR AR; DR Inventory / CR COGS)
- **Vendor Credit Note:** Vendor issues credit against a bill

This is a fundamental gap. Every trading company has returns. Without this, the system forces manual journal entries to handle returns, which breaks the document trail and creates audit issues.

---

### 2.4 Missing — Landed Cost Allocation

**Severity: MEDIUM**

When purchasing inventory, the true cost includes freight, customs duty, insurance, and other charges added after the PO price. These "landed costs" should be allocated to inventory items and added to their cost basis. Without this:
- Inventory is understated on the balance sheet
- COGS is understated when those items are sold
- The GL Inventory balance and physical valuation diverge

**Recommendation:** Add `landed_cost_headers` and `landed_cost_allocations` tables. Allow allocation by value, weight, or quantity across GRN line items.

---

### 2.5 Missing — Customer Credit Control

**Severity: MEDIUM**

`customers.credit_limit` exists but is **never enforced**. The system will create an invoice for a customer who is 180 days overdue with a $50,000 balance. A proper ERP should:
- Block new orders/invoices when customer exceeds credit limit or has invoices beyond credit terms
- Show credit status warning at order/invoice creation time
- Allow admin override with reason capture

---

### 2.6 Missing — Price Lists and Discounting

**Severity: MEDIUM**

No pricing engine:
- No customer-specific price lists
- No volume discount tiers
- No promotional pricing with date ranges
- No trade discount percentage per customer
- No contract pricing

Every invoice and SO uses manual rate entry, which is error-prone and inconsistent.

---

### 2.7 Missing — Purchase Requisition

**Severity: LOW-MEDIUM**

The procurement cycle starts at RFQ. A complete procure-to-pay cycle should begin with a **Purchase Requisition** (internal request to purchase), which then gets approved, converted to RFQ/PO. Without PR:
- No internal spend authorisation before committing to vendors
- No budget check before purchasing
- Procurement starts without internal approval

**Complete document chain should be:** PR → RFQ → PO → GRN → Bill → Payment

---

### 2.8 Missing — Three-Way Match Enforcement

**Severity: HIGH**

True three-way matching (PO ↔ GRN ↔ Bill) is partially implemented but not enforced. The system links bills to GRNs and uses PO pricing for bill line items, but:
- A bill can be approved even if quantities on bill exceed GRN received quantities
- No tolerance checking (e.g., allow 5% quantity/price variance)
- No "on hold" status when bill does not match GRN/PO

**Recommendation:** In `bills.service.ts updateStatus`, before allowing `approved`:
- Query the linked GRN quantities
- Compare bill line quantities vs. GRN received quantities
- Compare bill rates vs. PO rates (with configurable tolerance %)
- If mismatch exceeds tolerance: set bill status to `on_hold` and require override

---

### 2.9 Missing — Multi-Currency with Exchange Rates

**Severity: MEDIUM-HIGH**

The fields exist (customer.currency, vendor.currency, bank_account.currency) but there is no:
- Exchange rate table (`currency_exchange_rates` with date, from_currency, to_currency, rate)
- Transaction currency vs. functional currency recording
- Unrealised/realised exchange gain/loss calculation and posting
- Revaluation of open foreign currency AR/AP balances at period-end

For any company trading internationally, this is essential.

---

### 2.10 Missing — Fixed Asset Management

**Severity: MEDIUM**

The COA has `1500 PP&E`, `1510 Accumulated Depreciation`, and `5700 Depreciation Expense`. None of these are used by any process. What is missing:
- `fixed_assets` table (asset_name, purchase_date, purchase_cost, useful_life, residual_value, depreciation_method)
- Depreciation methods: Straight-line, Declining balance, Units of production
- Monthly depreciation run (auto-post DR Depreciation Expense / CR Accumulated Depreciation)
- Asset disposal (DR Cash + DR Accumulated Depreciation + DR/CR Gain/Loss / CR PP&E)
- Asset revaluation (IFRS)

---

### 2.11 Missing — Budget Management

**Severity: MEDIUM**

No budgeting module means:
- No control over departmental spending
- No variance analysis (Budget vs. Actual)
- No purchase order budget checking
- Management cannot plan cash flows

**Minimum viable budgeting tables:**
```
budget_periods (id, company_id, name, start_date, end_date, status)
budget_lines (id, budget_period_id, account_id, department_id, budgeted_amount)
```
Reports can then compare `budget_lines.budgeted_amount` vs. `journal_entry_lines` actuals.

---

### 2.12 Missing — Cost Centre / Profit Centre Tracking

**Severity: MEDIUM**

`departments` table exists but is used only for menu access control (RBAC), not as cost centres in GL posting. Currently all expenses post to accounts without departmental split. This means:
- No P&L by department
- No cost centre reports
- No inter-departmental cost allocation

**Recommendation:** Add `department_id` (nullable) to `journal_entry_lines`. All auto-posting functions should accept and pass through department context. The P&L report should be filterable by department.

---

### 2.13 Missing — Project / Job Costing

**Severity: LOW (depends on industry)**

For service businesses, construction, or project-based organisations:
- No project tracking
- No job costing (labour + material + overhead per job)
- No milestone billing
- No project profitability report

**Tables needed:** `projects`, `project_phases`, `project_cost_lines`, `time_entries`

---

### 2.14 Weak — Inventory Batch / Serial Number Tracking

**Severity: MEDIUM (industry-dependent)**

No lot/batch tracking means:
- Cannot manage product expiry dates (food, pharma, chemicals)
- Cannot handle warranty tracking by serial number
- Cannot perform precise stock recall by batch
- No traceability from supplier batch to customer shipment

---

### 2.15 Missing — Payroll Integration

**Severity: MEDIUM**

Salaries & Wages account (5100) exists but salaries are entered as manual journal entries or expenses. No:
- Employee records
- Salary structure (basic, allowances, deductions)
- Payroll run and payslip generation
- Statutory deductions (income tax, social security, pension)
- Payroll GL posting (DR Salary Expense / CR Net Pay Payable, DR/CR various tax withholdings)

---

### 2.16 Missing — Stock Reorder Level Automation

**Severity: LOW-MEDIUM**

`products.reorder_level` field exists. However, there is no:
- Background job that monitors stock levels against reorder points
- Automatic purchase requisition / reorder suggestion generation
- Alert when stock falls below reorder level
- Economic Order Quantity (EOQ) calculation

---

## Section 3 — Process Flow Recommendations

### 3.1 Sales Flow — Recommended Enhancements

**Current:** Estimate → SO → DN → Invoice → Payment

**Recommended additions:**
1. **Credit check** at SO creation (check customer credit limit and outstanding balance)
2. **Price list enforcement** at SO and Invoice line items (pull from customer price list)
3. **Available-to-promise (ATP) check** at SO creation (confirm stock available)
4. **Picking/Packing Slip** between SO and DN (warehouse instruction document)
5. **Credit Note** after Invoice (for returns and disputes)
6. **Statement of Account** — scheduled customer statement generation (exists but is manual)
7. **Dunning letters** — automated overdue payment reminders at configurable intervals

---

### 3.2 Purchase Flow — Recommended Enhancements

**Current:** RFQ → PO → GRN → Bill → Payment

**Recommended additions:**
1. **Purchase Requisition** before RFQ (internal spend authorisation)
2. **Vendor Quote Comparison** at RFQ stage (compare multiple vendor responses side-by-side)
3. **PO Approval hierarchy** based on amount thresholds
4. **Quality Inspection** step between GRN and `received` status (QC pass/fail before stock acceptance)
5. **Purchase Return / Debit Note** after Bill (for defective or excess goods returned)
6. **Landed Cost Entry** after GRN and before Bill approval
7. **Vendor Statement Reconciliation** — reconcile vendor statement against system AP balance

---

### 3.3 Accounting Month-End Close Checklist

The following should be implemented as a guided workflow:

1. Post all recurring entries (currently manual trigger — needs scheduler)
2. Record bank charges and interest from bank statements
3. Complete bank reconciliation for all accounts
4. AR ageing review — provision for doubtful debts
5. AP ageing review — accrue for unbilled GRNs (goods received but bill not yet received)
6. Prepayment amortisation entries
7. Depreciation run (fixed assets)
8. Inventory count variance adjustment
9. Tax return calculation (Output Tax − Input Tax = Net Tax Payable)
10. Period lock — prevent further posting to closed period

---

## Section 4 — Reporting Gaps

| Report | Status | Priority |
|---|---|---|
| Balance Sheet | ❌ Missing | Critical |
| Cash Flow Statement | ❌ Missing | High |
| P&L by Department / Cost Centre | ❌ Missing | High |
| Tax Summary (Output / Input / Net) | ❌ Missing | High |
| Fixed Asset Register | ❌ Missing | Medium |
| Budget vs. Actual | ❌ Missing | Medium |
| Inventory Movement Report | ❌ Missing | Medium |
| Purchase Order Status Report | ❌ Missing | Medium |
| Vendor Performance Report | ❌ Missing | Low |
| Customer Sales Analysis | ⚠️ Basic only | Low |
| Trial Balance with drill-down to GL | ⚠️ Exists — no drill-down | Medium |
| P&L Report | ✅ Exists | — |
| AR Ageing | ✅ Exists | — |
| AP Ageing | ✅ Exists | — |
| General Ledger | ✅ Exists | — |
| Trial Balance | ✅ Exists | — |
| Inventory Valuation | ✅ Exists | — |

---

## Section 5 — Compliance & Regulatory

### 5.1 Pakistan FBR Integration (Partial)
An FBR module exists for USIN generation and QR code on invoices. However:
- Input tax credit on purchases is not tracked in a way that supports FBR return preparation
- No Sales Tax Return (STR) report generation
- No Withholding Tax (WHT) tracking on vendor payments (mandatory for Pakistan)

### 5.2 IFRS / IAS Compliance Gaps
- No fair value measurement support (financial instruments at amortised cost vs. FVTPL)
- No lease liability / right-of-use asset accounting (IFRS 16)
- No revenue recognition policy controls (IFRS 15 — milestone billing, percentage of completion)
- No segment reporting

### 5.3 Data Retention
- All deletes are soft-delete (`deleted_at`) ✅
- No formal data retention policy enforcement or archival
- No legal hold mechanism

---

## Section 6 — Technical Architecture Recommendations

### 6.1 API Versioning
Currently `/api/v1/` prefix exists but no formal versioning strategy. As features expand, breaking changes will need v2 endpoints without disrupting existing integrations.

### 6.2 Database Indexing Review
Key indexes to verify for performance at scale:
- `company_id` + `status` + `created_at` composite on all major transaction tables
- `journal_entry_lines.account_id` + `journal_entries.entry_date` (critical for GL report performance)
- `invoices.payment_status` + `due_date` (for overdue queries)

### 6.3 Missing — API Rate Limiting Per User
Current rate limiting is 100 req/min per IP. On shared IPs (corporate NAT), this blocks legitimate users. Should be per authenticated user token, not per IP.

### 6.4 Missing — Webhook / Event Bus
No event publishing. External systems (e-commerce, logistics, CRM) cannot subscribe to events like `invoice.approved`, `payment.received`, `stock.low`. A webhook framework or event bus would enable integrations without polling.

### 6.5 Background Job Visibility
Recurring documents run silently via API call. There is no job queue visibility, retry logic for failed runs, or alerting when a recurring document fails to generate. Use Bull/BullMQ with a simple job dashboard.

### 6.6 File Attachments
For a complete system, invoices, bills, POs, and expenses should all support document attachments (PDF, images) stored in object storage (S3/R2/Cloudflare R2). A structured `document_attachments` table with file keys is needed.

### 6.7 Outbound Email Integration
No outbound email for:
- Invoice delivery to customers
- Purchase order sending to vendors
- Overdue payment reminders
- Recurring document generation notifications
- Month-end statements

This is a major operational gap for day-to-day business use.

---

## Section 7 — Priority Roadmap

### Tier 1 — Critical (Must Fix for Financial Integrity)

| # | Item | Area |
|---|---|---|
| 1 | Opening balance entry / trial balance import | Accounting |
| 2 | Balance Sheet report | Reporting |
| 3 | Fiscal period locking | Accounting |
| 4 | Tax GL posting on bills and expenses (Input Tax) | Accounting |
| 5 | Inventory weighted average cost method | Accounting |
| 6 | Year-end close (P&L → Retained Earnings) | Accounting |
| 7 | Purchase Return / Credit Note | Process |

### Tier 2 — High Priority (Required for Production Use)

| # | Item | Area |
|---|---|---|
| 8 | Cash Flow Statement report | Reporting |
| 9 | Background job scheduler (recurring docs, overdue updates) | Technical |
| 10 | Approval workflow engine (amount-based routing) | Process |
| 11 | Three-way match enforcement (PO / GRN / Bill) | Process |
| 12 | Customer credit limit enforcement | Process |
| 13 | Outbound email (invoices, POs, reminders) | Technical |
| 14 | Fixed asset depreciation module | Accounting |

### Tier 3 — Medium Priority (Business Enhancement)

| # | Item | Area |
|---|---|---|
| 15 | Multi-currency with exchange rates | Accounting |
| 16 | Budget management module | Planning |
| 17 | Cost centre / department GL tagging | Accounting |
| 18 | Price lists and customer discounting | Sales |
| 19 | Tax return report (Output / Input / Net) | Compliance |
| 20 | Landed cost allocation | Inventory |
| 21 | Accruals and prepayments automation | Accounting |
| 22 | Stock reorder automation | Inventory |
| 23 | P&L by department report | Reporting |
| 24 | Vendor quote comparison at RFQ | Procurement |

### Tier 4 — Future / Enterprise

| # | Item |
|---|---|
| 25 | Payroll module |
| 26 | Project / job costing |
| 27 | Serial number / batch tracking |
| 28 | Manufacturing / BOM / production orders |
| 29 | Intercompany transactions |
| 30 | IFRS 16 lease accounting |
| 31 | Consolidation across entities |
| 32 | Webhook / API event bus |
| 33 | Withholding Tax (WHT) on vendor payments (FBR compliance) |
| 34 | FBR Sales Tax Return (STR) report generation |

---

## Summary

The system is **production-ready for small businesses** that need basic order management and bookkeeping. It is **not yet suitable as a complete accounting system of record** due to the absence of opening balances, period locking, a Balance Sheet, and proper tax GL treatment. The GL auto-posting framework is well-built and extensible — the infrastructure is solid, the coverage needs to be completed systematically following the Tier 1 and Tier 2 roadmap above.

### Strengths
- Core transactional modules complete (RFQ → PO → GRN → Bill, Estimate → SO → DN → Invoice, Payments)
- GL auto-posting integrated across 9+ document types with correct double-entry
- Chart of Accounts properly seeded with standard accounts
- Audit trail comprehensive (audit_logs + document_status_history on every document)
- Multi-tenant architecture solid (company_id scoping throughout all queries)
- RBAC hybrid approach (role + department + user) is flexible and extensible
- Mobile app covers major transactional screens (50+ screens)
- Recurring document templates available for invoices, bills, and expenses
- Banking and reconciliation module present with GL linkage

### Weaknesses
- No opening balance import — cannot migrate from another system
- No Balance Sheet or Cash Flow Statement
- No fiscal period locking — prior periods can be modified without restriction
- Tax GL posting incomplete on purchases (bills, expenses)
- Inventory costing is static (cost_price only) — GL and physical valuation will diverge
- No goods returns / credit notes
- No approval workflow engine — all status transitions are hard-coded
- No background scheduler — recurring documents require manual trigger
- No outbound email for invoices, POs, or reminders
- No fixed asset depreciation automation
- No budget management or cost centre tracking
- No multi-currency conversion logic despite currency fields existing
