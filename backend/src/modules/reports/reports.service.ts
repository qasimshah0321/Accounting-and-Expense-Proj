import { pool } from '../../config/database';

export const getSalesSummary = async (companyId: string, dateFrom: string, dateTo: string) => {
  const [invoices] = await pool.query(
    `SELECT
       COUNT(*) AS total_invoices,
       SUM(total_amount) AS gross_sales,
       SUM(tax_amount) AS total_tax,
       SUM(discount_amount) AS total_discounts,
       SUM(amount_paid) AS total_collected,
       SUM(amount_due) AS total_outstanding
     FROM invoices
     WHERE company_id=? AND deleted_at IS NULL
       AND invoice_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count, SUM(total_amount) AS total
     FROM invoices WHERE company_id=? AND deleted_at IS NULL AND invoice_date BETWEEN ? AND ?
     GROUP BY status ORDER BY status`,
    [companyId, dateFrom, dateTo]
  );

  const [byCustomer] = await pool.query(
    `SELECT c.id, c.name AS customer_name, COUNT(i.id) AS invoice_count, SUM(i.total_amount) AS total_sales
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.company_id=? AND i.deleted_at IS NULL AND i.invoice_date BETWEEN ? AND ?
     GROUP BY c.id, c.name ORDER BY total_sales DESC LIMIT 10`,
    [companyId, dateFrom, dateTo]
  );

  return { summary: (invoices as any[])[0], by_status: byStatus as any[], top_customers: byCustomer as any[] };
};

export const getExpenseSummary = async (companyId: string, dateFrom: string, dateTo: string) => {
  const [expenses] = await pool.query(
    `SELECT
       COUNT(*) AS total_expenses,
       SUM(total_amount) AS total_amount,
       SUM(CASE WHEN payment_status='paid' THEN total_amount ELSE 0 END) AS paid_amount,
       SUM(CASE WHEN payment_status='unpaid' THEN total_amount ELSE 0 END) AS unpaid_amount
     FROM expenses
     WHERE company_id=? AND deleted_at IS NULL AND expense_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  const [byCategory] = await pool.query(
    `SELECT expense_category, COUNT(*) AS count, SUM(total_amount) AS total
     FROM expenses WHERE company_id=? AND deleted_at IS NULL AND expense_date BETWEEN ? AND ?
     GROUP BY expense_category ORDER BY total DESC`,
    [companyId, dateFrom, dateTo]
  );

  const [bills] = await pool.query(
    `SELECT
       COUNT(*) AS total_bills,
       SUM(total_amount) AS total_amount,
       SUM(amount_paid) AS paid_amount,
       SUM(amount_due) AS outstanding_amount
     FROM bills
     WHERE company_id=? AND deleted_at IS NULL AND bill_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  return { expenses: (expenses as any[])[0], bills: (bills as any[])[0], expenses_by_category: byCategory as any[] };
};

export const getProfitLoss = async (companyId: string, dateFrom: string, dateTo: string) => {
  const [revenue] = await pool.query(
    `SELECT SUM(grand_total) AS total_revenue, SUM(tax_amount) AS total_tax, SUM(discount_amount) AS total_discounts
     FROM invoices WHERE company_id=? AND deleted_at IS NULL AND status IN ('sent','approved','posted') AND invoice_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  const [expenses] = await pool.query(
    `SELECT SUM(total_amount) AS total_expenses FROM expenses
     WHERE company_id=? AND deleted_at IS NULL AND status IN ('approved','posted') AND expense_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  const [bills] = await pool.query(
    `SELECT SUM(total_amount) AS total_bills FROM bills
     WHERE company_id=? AND deleted_at IS NULL AND status IN ('approved','posted') AND bill_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  const totalRevenue = parseFloat((revenue as any[])[0].total_revenue || 0);
  const totalExpenses = parseFloat((expenses as any[])[0].total_expenses || 0) + parseFloat((bills as any[])[0].total_bills || 0);
  const netProfit = totalRevenue - totalExpenses;

  return {
    revenue: { total: totalRevenue, tax: parseFloat((revenue as any[])[0].total_tax || 0), discounts: parseFloat((revenue as any[])[0].total_discounts || 0) },
    expenses: { total_expenses: parseFloat((expenses as any[])[0].total_expenses || 0), total_bills: parseFloat((bills as any[])[0].total_bills || 0), combined: totalExpenses },
    net_profit: netProfit,
    profit_margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00',
  };
};

/**
 * Full Profit & Loss (Income Statement) report.
 *
 * Sections:
 *   REVENUE            — Sales (inventory line items), Services (service line items),
 *                        Other (line items without a product) sourced from invoice_line_items.
 *                        Invoice-level discounts shown as a contra-revenue line.
 *   COGS               — Bill line items linked to inventory products (status approved/posted)
 *                        + COGS expenses (expense_category = 'cost_of_goods_sold').
 *   OPERATING EXPENSES — Bills NOT linked to inventory + Expenses bucketed by category
 *                        (excluding cost_of_goods_sold which feeds COGS).
 *   OTHER INCOME       — Reserved (currently 0; hook in place for future GL-driven income).
 *
 * Calculations:
 *   Gross Profit     = Net Revenue - COGS
 *   Operating Income = Gross Profit - Operating Expenses
 *   Net Income       = Operating Income + Other Income - Other Expenses
 *
 * All monetary values are returned as numbers (not strings) so the frontend can format them.
 * Only invoices with status IN ('sent','approved','posted') are included on the revenue side.
 * Only bills/expenses with status IN ('approved','posted') are included on the expense side.
 */
export const getProfitAndLoss = async (companyId: string, startDate: string, endDate: string) => {
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }

  // ---------- REVENUE ----------
  // Pull invoice-level totals (used for discounts and gross figure)
  const [invoiceTotalsRows] = await pool.query(
    `SELECT
       COALESCE(SUM(grand_total), 0)     AS gross_revenue,
       COALESCE(SUM(tax_amount), 0)      AS tax_collected,
       COALESCE(SUM(discount_amount), 0) AS invoice_discounts,
       COUNT(*)                          AS invoice_count
     FROM invoices
     WHERE company_id = ?
       AND deleted_at IS NULL
       AND status IN ('sent','approved','posted')
       AND invoice_date BETWEEN ? AND ?`,
    [companyId, startDate, endDate]
  );
  const invoiceTotals = (invoiceTotalsRows as any[])[0] || {};

  // Break revenue down by product_type via invoice line items
  // Sales Revenue   = lines linked to inventory or non-inventory products
  // Service Revenue = lines linked to service products
  // Other Revenue   = lines with no product_id (ad-hoc descriptions)
  const [revenueByTypeRows] = await pool.query(
    `SELECT
       CASE
         WHEN p.product_type = 'service'                     THEN 'service'
         WHEN p.product_type IN ('inventory','non-inventory') THEN 'sales'
         ELSE 'other'
       END AS revenue_type,
       COALESCE(SUM(ili.line_total), 0) AS amount
     FROM invoice_line_items ili
     INNER JOIN invoices i ON i.id = ili.invoice_id
     LEFT JOIN products p  ON p.id = ili.product_id
     WHERE i.company_id = ?
       AND i.deleted_at IS NULL
       AND i.status IN ('sent','approved','posted')
       AND i.invoice_date BETWEEN ? AND ?
     GROUP BY revenue_type`,
    [companyId, startDate, endDate]
  );

  let salesRevenue = 0;
  let serviceRevenue = 0;
  let otherRevenue = 0;
  for (const r of revenueByTypeRows as any[]) {
    const amt = parseFloat(r.amount) || 0;
    if (r.revenue_type === 'sales') salesRevenue = amt;
    else if (r.revenue_type === 'service') serviceRevenue = amt;
    else otherRevenue = amt;
  }

  const grossRevenue       = parseFloat(invoiceTotals.gross_revenue) || 0;
  const taxCollected       = parseFloat(invoiceTotals.tax_collected) || 0;
  const invoiceDiscounts   = parseFloat(invoiceTotals.invoice_discounts) || 0;
  // Net Revenue = invoice grand_total minus tax collected (tax is a liability, not income)
  const netRevenue         = Math.max(grossRevenue - taxCollected, 0);
  const totalRevenueLines  = salesRevenue + serviceRevenue + otherRevenue;

  // ---------- COST OF GOODS SOLD ----------
  // Bill line items where the linked product is an inventory item — proxy for COGS
  // (full perpetual COGS would also include inventory issuance journal entries; this is a
  //  reasonable approximation given the current data model.)
  const [cogsBillsRows] = await pool.query(
    `SELECT COALESCE(SUM(bli.line_total), 0) AS amount
     FROM bill_line_items bli
     INNER JOIN bills b   ON b.id = bli.bill_id
     INNER JOIN products p ON p.id = bli.product_id
     WHERE b.company_id = ?
       AND b.deleted_at IS NULL
       AND b.status IN ('approved','posted')
       AND b.bill_date BETWEEN ? AND ?
       AND p.product_type = 'inventory'`,
    [companyId, startDate, endDate]
  );
  const cogsFromBills = parseFloat((cogsBillsRows as any[])[0]?.amount || 0);

  // Direct COGS expenses (expense_category = 'cost_of_goods_sold' or matching account category)
  const [cogsExpenseRows] = await pool.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS amount
     FROM expenses
     WHERE company_id = ?
       AND deleted_at IS NULL
       AND status IN ('approved','posted')
       AND expense_date BETWEEN ? AND ?
       AND LOWER(REPLACE(expense_category, ' ', '_')) IN ('cost_of_goods_sold','cogs','cost_of_sales')`,
    [companyId, startDate, endDate]
  );
  const cogsFromExpenses = parseFloat((cogsExpenseRows as any[])[0]?.amount || 0);

  const totalCOGS = cogsFromBills + cogsFromExpenses;
  const grossProfit = netRevenue - totalCOGS;

  // ---------- OPERATING EXPENSES ----------
  // 1) Bills NOT tied to inventory (the inventory portion has gone to COGS above)
  //    We compute (bill total) - (inventory line totals) to avoid double-counting.
  const [opexBillsRows] = await pool.query(
    `SELECT
       COALESCE(SUM(b.total_amount), 0) AS bill_total,
       COALESCE((
         SELECT SUM(bli.line_total)
         FROM bill_line_items bli
         INNER JOIN products p ON p.id = bli.product_id
         WHERE bli.bill_id IN (
           SELECT id FROM bills
           WHERE company_id = ?
             AND deleted_at IS NULL
             AND status IN ('approved','posted')
             AND bill_date BETWEEN ? AND ?
         )
         AND p.product_type = 'inventory'
       ), 0) AS inventory_lines
     FROM bills b
     WHERE b.company_id = ?
       AND b.deleted_at IS NULL
       AND b.status IN ('approved','posted')
       AND b.bill_date BETWEEN ? AND ?`,
    [companyId, startDate, endDate, companyId, startDate, endDate]
  );
  const opexBillTotal      = parseFloat((opexBillsRows as any[])[0]?.bill_total || 0);
  const opexInventoryLines = parseFloat((opexBillsRows as any[])[0]?.inventory_lines || 0);
  const operatingExpensesFromBills = Math.max(opexBillTotal - opexInventoryLines, 0);

  // 2) Expenses bucketed by category (excluding COGS bucket)
  const [expensesByCategoryRows] = await pool.query(
    `SELECT
       expense_category,
       COUNT(*) AS count,
       COALESCE(SUM(total_amount), 0) AS amount
     FROM expenses
     WHERE company_id = ?
       AND deleted_at IS NULL
       AND status IN ('approved','posted')
       AND expense_date BETWEEN ? AND ?
       AND LOWER(REPLACE(expense_category, ' ', '_')) NOT IN ('cost_of_goods_sold','cogs','cost_of_sales')
     GROUP BY expense_category
     ORDER BY amount DESC`,
    [companyId, startDate, endDate]
  );
  const operatingExpensesByCategory = (expensesByCategoryRows as any[]).map((r) => ({
    category: r.expense_category || 'Uncategorized',
    count: parseInt(r.count, 10) || 0,
    amount: parseFloat(r.amount) || 0,
  }));
  const operatingExpensesFromExpenses = operatingExpensesByCategory.reduce((s, r) => s + r.amount, 0);

  const totalOperatingExpenses = operatingExpensesFromBills + operatingExpensesFromExpenses;
  const operatingIncome        = grossProfit - totalOperatingExpenses;

  // ---------- OTHER INCOME / OTHER EXPENSES ----------
  // Hook for non-operating items via journal entries posted to revenue/expense COA accounts
  // with sub_type = 'other_revenue' / 'other_expense'. Currently returns 0 if journal_entries
  // table is empty — wrapped in try/catch so we don't fail if migration 010 hasn't been applied.
  let otherIncome = 0;
  let otherExpense = 0;
  try {
    const [otherIncRows] = await pool.query(
      `SELECT COALESCE(SUM(jel.credit - jel.debit), 0) AS amount
       FROM journal_entry_lines jel
       INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
       INNER JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE je.company_id = ?
         AND je.status = 'posted'
         AND je.entry_date BETWEEN ? AND ?
         AND coa.account_type = 'revenue'
         AND coa.sub_type = 'other_revenue'`,
      [companyId, startDate, endDate]
    );
    otherIncome = parseFloat((otherIncRows as any[])[0]?.amount || 0);

    const [otherExpRows] = await pool.query(
      `SELECT COALESCE(SUM(jel.debit - jel.credit), 0) AS amount
       FROM journal_entry_lines jel
       INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
       INNER JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE je.company_id = ?
         AND je.status = 'posted'
         AND je.entry_date BETWEEN ? AND ?
         AND coa.account_type = 'expense'
         AND coa.sub_type = 'other_expense'`,
      [companyId, startDate, endDate]
    );
    otherExpense = parseFloat((otherExpRows as any[])[0]?.amount || 0);
  } catch {
    // GL tables may not be present yet on older deployments — silently degrade.
    otherIncome = 0;
    otherExpense = 0;
  }

  // ---------- NET INCOME ----------
  const netIncome = operatingIncome + otherIncome - otherExpense;

  // Margins
  const denom = netRevenue > 0 ? netRevenue : 0;
  const grossMargin     = denom ? Number(((grossProfit / denom) * 100).toFixed(2))     : 0;
  const operatingMargin = denom ? Number(((operatingIncome / denom) * 100).toFixed(2)) : 0;
  const netMargin       = denom ? Number(((netIncome / denom) * 100).toFixed(2))       : 0;

  return {
    period: { start_date: startDate, end_date: endDate },
    revenue: {
      sales_revenue:    Number(salesRevenue.toFixed(2)),
      service_revenue:  Number(serviceRevenue.toFixed(2)),
      other_revenue:    Number(otherRevenue.toFixed(2)),
      gross_revenue:    Number(grossRevenue.toFixed(2)),
      tax_collected:    Number(taxCollected.toFixed(2)),
      discounts:        Number(invoiceDiscounts.toFixed(2)),
      total_line_items: Number(totalRevenueLines.toFixed(2)),
      net_revenue:      Number(netRevenue.toFixed(2)),
      invoice_count:    parseInt(invoiceTotals.invoice_count, 10) || 0,
    },
    cogs: {
      from_bills:    Number(cogsFromBills.toFixed(2)),
      from_expenses: Number(cogsFromExpenses.toFixed(2)),
      total:         Number(totalCOGS.toFixed(2)),
    },
    gross_profit:  Number(grossProfit.toFixed(2)),
    gross_margin:  grossMargin,
    operating_expenses: {
      from_bills:    Number(operatingExpensesFromBills.toFixed(2)),
      from_expenses: Number(operatingExpensesFromExpenses.toFixed(2)),
      by_category:   operatingExpensesByCategory.map((r) => ({
        category: r.category,
        count:    r.count,
        amount:   Number(r.amount.toFixed(2)),
      })),
      total: Number(totalOperatingExpenses.toFixed(2)),
    },
    operating_income: Number(operatingIncome.toFixed(2)),
    operating_margin: operatingMargin,
    other_income:  Number(otherIncome.toFixed(2)),
    other_expense: Number(otherExpense.toFixed(2)),
    net_income:    Number(netIncome.toFixed(2)),
    net_margin:    netMargin,
  };
};

export const getReceivablesAgeing = async (companyId: string, asOfDate?: string) => {
  const asOf = asOfDate || new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT
       c.id AS customer_id, c.name AS customer_name,
       c.email AS customer_email, c.phone AS customer_phone,
       COUNT(i.id) AS invoice_count,
       SUM(CASE WHEN DATEDIFF(?, i.due_date) <= 0 THEN i.amount_due ELSE 0 END) AS current_due,
       SUM(CASE WHEN DATEDIFF(?, i.due_date) BETWEEN 1 AND 30 THEN i.amount_due ELSE 0 END) AS overdue_1_30,
       SUM(CASE WHEN DATEDIFF(?, i.due_date) BETWEEN 31 AND 60 THEN i.amount_due ELSE 0 END) AS overdue_31_60,
       SUM(CASE WHEN DATEDIFF(?, i.due_date) BETWEEN 61 AND 90 THEN i.amount_due ELSE 0 END) AS overdue_61_90,
       SUM(CASE WHEN DATEDIFF(?, i.due_date) > 90 THEN i.amount_due ELSE 0 END) AS overdue_90_plus,
       SUM(i.amount_due) AS total_outstanding
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     WHERE i.company_id=? AND i.deleted_at IS NULL AND i.payment_status != 'paid' AND i.amount_due > 0
     GROUP BY c.id, c.name, c.email, c.phone
     HAVING SUM(i.amount_due) > 0
     ORDER BY total_outstanding DESC`,
    [asOf, asOf, asOf, asOf, asOf, companyId]
  );

  // Detailed invoices per customer for drill-down
  const [invoices] = await pool.query(
    `SELECT
       i.id, i.invoice_no, i.invoice_date, i.due_date,
       i.grand_total, i.amount_paid, i.amount_due, i.payment_status,
       i.customer_id,
       DATEDIFF(?, i.due_date) AS days_overdue
     FROM invoices i
     WHERE i.company_id=? AND i.deleted_at IS NULL AND i.payment_status != 'paid' AND i.amount_due > 0
     ORDER BY i.due_date ASC`,
    [asOf, companyId]
  );

  // Group invoices by customer_id
  const invoicesByCustomer: Record<string, any[]> = {};
  for (const inv of invoices as any[]) {
    if (!invoicesByCustomer[inv.customer_id]) invoicesByCustomer[inv.customer_id] = [];
    invoicesByCustomer[inv.customer_id].push(inv);
  }

  const summary = {
    total_outstanding: 0, current_due: 0,
    overdue_1_30: 0, overdue_31_60: 0, overdue_61_90: 0, overdue_90_plus: 0,
    customer_count: (rows as any[]).length,
  };
  for (const r of rows as any[]) {
    summary.total_outstanding += parseFloat(r.total_outstanding) || 0;
    summary.current_due      += parseFloat(r.current_due)      || 0;
    summary.overdue_1_30     += parseFloat(r.overdue_1_30)     || 0;
    summary.overdue_31_60    += parseFloat(r.overdue_31_60)    || 0;
    summary.overdue_61_90    += parseFloat(r.overdue_61_90)    || 0;
    summary.overdue_90_plus  += parseFloat(r.overdue_90_plus)  || 0;
  }
  Object.keys(summary).forEach(k => {
    if (typeof (summary as any)[k] === 'number' && k !== 'customer_count')
      (summary as any)[k] = Math.round((summary as any)[k] * 100) / 100;
  });

  return { as_of: asOf, summary, customers: rows as any[], invoices_by_customer: invoicesByCustomer };
};

export const getPayablesAgeing = async (companyId: string, asOfDate?: string) => {
  const asOf = asOfDate || new Date().toISOString().slice(0, 10);

  const [rows] = await pool.query(
    `SELECT
       v.id AS vendor_id, v.name AS vendor_name,
       v.email AS vendor_email, v.phone AS vendor_phone,
       COUNT(b.id) AS bill_count,
       SUM(CASE WHEN DATEDIFF(?, b.due_date) <= 0 THEN b.amount_due ELSE 0 END) AS current_due,
       SUM(CASE WHEN DATEDIFF(?, b.due_date) BETWEEN 1 AND 30 THEN b.amount_due ELSE 0 END) AS overdue_1_30,
       SUM(CASE WHEN DATEDIFF(?, b.due_date) BETWEEN 31 AND 60 THEN b.amount_due ELSE 0 END) AS overdue_31_60,
       SUM(CASE WHEN DATEDIFF(?, b.due_date) BETWEEN 61 AND 90 THEN b.amount_due ELSE 0 END) AS overdue_61_90,
       SUM(CASE WHEN DATEDIFF(?, b.due_date) > 90 THEN b.amount_due ELSE 0 END) AS overdue_90_plus,
       SUM(b.amount_due) AS total_outstanding
     FROM bills b
     JOIN vendors v ON v.id = b.vendor_id
     WHERE b.company_id=? AND b.deleted_at IS NULL AND b.payment_status != 'paid' AND b.amount_due > 0
     GROUP BY v.id, v.name, v.email, v.phone
     HAVING SUM(b.amount_due) > 0
     ORDER BY total_outstanding DESC`,
    [asOf, asOf, asOf, asOf, asOf, companyId]
  );

  // Detailed bills per vendor for drill-down
  const [bills] = await pool.query(
    `SELECT
       b.id, b.bill_no, b.bill_date, b.due_date,
       b.total_amount, b.amount_paid, b.amount_due, b.payment_status,
       b.vendor_id,
       DATEDIFF(?, b.due_date) AS days_overdue
     FROM bills b
     WHERE b.company_id=? AND b.deleted_at IS NULL AND b.payment_status != 'paid' AND b.amount_due > 0
     ORDER BY b.due_date ASC`,
    [asOf, companyId]
  );

  // Group bills by vendor_id
  const billsByVendor: Record<string, any[]> = {};
  for (const bill of bills as any[]) {
    if (!billsByVendor[bill.vendor_id]) billsByVendor[bill.vendor_id] = [];
    billsByVendor[bill.vendor_id].push(bill);
  }

  const summary = {
    total_outstanding: 0, current_due: 0,
    overdue_1_30: 0, overdue_31_60: 0, overdue_61_90: 0, overdue_90_plus: 0,
    vendor_count: (rows as any[]).length,
  };
  for (const r of rows as any[]) {
    summary.total_outstanding += parseFloat(r.total_outstanding) || 0;
    summary.current_due      += parseFloat(r.current_due)       || 0;
    summary.overdue_1_30     += parseFloat(r.overdue_1_30)      || 0;
    summary.overdue_31_60    += parseFloat(r.overdue_31_60)     || 0;
    summary.overdue_61_90    += parseFloat(r.overdue_61_90)     || 0;
    summary.overdue_90_plus  += parseFloat(r.overdue_90_plus)   || 0;
  }
  Object.keys(summary).forEach(k => {
    if (typeof (summary as any)[k] === 'number' && k !== 'vendor_count')
      (summary as any)[k] = Math.round((summary as any)[k] * 100) / 100;
  });

  return { as_of: asOf, summary, vendors: rows as any[], bills_by_vendor: billsByVendor };
};

export const getDashboard = async (companyId: string) => {
  const [salesRes, expenseRes, receivablesRes, payablesRes, overdueInvRes, overdueBillsRes] = await Promise.all([
    pool.query(
      `SELECT SUM(grand_total) AS month_sales, COUNT(*) AS invoice_count
       FROM invoices WHERE company_id=? AND deleted_at IS NULL
       AND invoice_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
      [companyId]
    ),
    pool.query(
      `SELECT SUM(total_amount) AS month_expenses
       FROM expenses WHERE company_id=? AND deleted_at IS NULL
       AND expense_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
      [companyId]
    ),
    pool.query(
      'SELECT SUM(amount_due) AS total_receivables FROM invoices WHERE company_id=? AND deleted_at IS NULL AND payment_status != \'paid\'',
      [companyId]
    ),
    pool.query(
      'SELECT SUM(amount_due) AS total_payables FROM bills WHERE company_id=? AND deleted_at IS NULL AND payment_status != \'paid\'',
      [companyId]
    ),
    pool.query(
      'SELECT COUNT(*) AS overdue_invoices FROM invoices WHERE company_id=? AND deleted_at IS NULL AND due_date < CURDATE() AND payment_status != \'paid\'',
      [companyId]
    ),
    pool.query(
      'SELECT COUNT(*) AS overdue_bills FROM bills WHERE company_id=? AND deleted_at IS NULL AND due_date < CURDATE() AND payment_status != \'paid\'',
      [companyId]
    ),
  ]);

  return {
    month_sales: parseFloat((salesRes[0] as any[])[0].month_sales || 0),
    invoice_count: parseInt((salesRes[0] as any[])[0].invoice_count || 0),
    month_expenses: parseFloat((expenseRes[0] as any[])[0].month_expenses || 0),
    total_receivables: parseFloat((receivablesRes[0] as any[])[0].total_receivables || 0),
    total_payables: parseFloat((payablesRes[0] as any[])[0].total_payables || 0),
    overdue_invoices: parseInt((overdueInvRes[0] as any[])[0].overdue_invoices || 0),
    overdue_bills: parseInt((overdueBillsRes[0] as any[])[0].overdue_bills || 0),
  };
};

export const getInventoryValuation = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT id, name, sku, unit_of_measure, current_stock, cost_price AS unit_cost,
            (current_stock * COALESCE(cost_price, 0)) AS total_value
     FROM products WHERE company_id=? AND deleted_at IS NULL AND track_inventory=1
     ORDER BY total_value DESC`,
    [companyId]
  );
  const totalValue = (rows as any[]).reduce((sum: number, r: any) => sum + parseFloat(r.total_value || 0), 0);
  return { products: rows as any[], total_inventory_value: totalValue };
};

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export const getBalanceSheet = async (companyId: string, asOfDate?: string) => {
  const asOf = asOfDate || new Date().toISOString().slice(0, 10);

  // Cumulative balances for every account up to asOfDate
  const [accountRows] = await pool.query(
    `SELECT
       coa.id, coa.account_number, coa.name, coa.account_type, coa.sub_type, coa.normal_balance,
       COALESCE(SUM(jel.debit), 0)  AS total_debit,
       COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM chart_of_accounts coa
     LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
     LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
       AND je.status = 'posted'
       AND je.entry_date <= ?
     WHERE coa.company_id = ?
     GROUP BY coa.id, coa.account_number, coa.name, coa.account_type, coa.sub_type, coa.normal_balance
     ORDER BY coa.account_number`,
    [asOf, companyId]
  );

  const accounts = (accountRows as any[]).map(row => {
    const debit  = parseFloat(row.total_debit)  || 0;
    const credit = parseFloat(row.total_credit) || 0;
    const balance = row.normal_balance === 'debit' ? (debit - credit) : (credit - debit);
    return { ...row, balance: parseFloat(balance.toFixed(2)) };
  }).filter(a => a.balance !== 0);

  const assets      = accounts.filter(a => a.account_type === 'asset');
  const liabilities = accounts.filter(a => a.account_type === 'liability');
  const equity      = accounts.filter(a => a.account_type === 'equity');

  // Current Year Net Income = Revenue − Expense posted from fiscal year start to asOfDate
  // (exclude year_end_close entries — those already reset the accounts)
  const fiscalYearStart = asOf.substring(0, 4) + '-01-01';
  const [incomeRows] = await pool.query(
    `SELECT coa.account_type, coa.normal_balance,
            COALESCE(SUM(jel.debit), 0)  AS total_debit,
            COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM chart_of_accounts coa
     JOIN journal_entry_lines jel ON jel.account_id = coa.id
     JOIN journal_entries je ON je.id = jel.journal_entry_id
       AND je.status = 'posted'
       AND je.entry_date BETWEEN ? AND ?
       AND (je.reference_type IS NULL OR je.reference_type != 'year_end_close')
     WHERE coa.company_id = ? AND coa.account_type IN ('revenue','expense')
     GROUP BY coa.account_type, coa.normal_balance`,
    [fiscalYearStart, asOf, companyId]
  );

  let totalRevenue = 0;
  let totalExpense = 0;
  for (const row of incomeRows as any[]) {
    const debit  = parseFloat(row.total_debit)  || 0;
    const credit = parseFloat(row.total_credit) || 0;
    const bal    = row.normal_balance === 'debit' ? (debit - credit) : (credit - debit);
    if (row.account_type === 'revenue') totalRevenue += bal;
    else totalExpense += bal;
  }
  const currentYearNetIncome = parseFloat((totalRevenue - totalExpense).toFixed(2));

  const totalAssets      = parseFloat(assets.reduce((s, a) => s + a.balance, 0).toFixed(2));
  const totalLiabilities = parseFloat(liabilities.reduce((s, a) => s + a.balance, 0).toFixed(2));
  const totalEquityAccts = parseFloat(equity.reduce((s, a) => s + a.balance, 0).toFixed(2));
  const totalEquity      = parseFloat((totalEquityAccts + currentYearNetIncome).toFixed(2));

  return {
    as_of: asOf,
    fiscal_year_start: fiscalYearStart,
    assets: {
      current: assets.filter(a => parseInt(a.account_number) < 1500),
      fixed:   assets.filter(a => parseInt(a.account_number) >= 1500),
      total:   totalAssets,
    },
    liabilities: {
      current:   liabilities.filter(a => parseInt(a.account_number) < 2500),
      long_term: liabilities.filter(a => parseInt(a.account_number) >= 2500),
      total:     totalLiabilities,
    },
    equity: {
      accounts:               equity,
      current_year_net_income: currentYearNetIncome,
      total:                  totalEquity,
    },
    total_liabilities_and_equity: parseFloat((totalLiabilities + totalEquity).toFixed(2)),
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
};

// ─── Cash Flow Statement (Indirect Method) ───────────────────────────────────

export const getCashFlow = async (companyId: string, startDate: string, endDate: string) => {
  // Cumulative GL balance for accounts matching a WHERE clause, as of a date.
  // `whereExtra` is appended after `coa.company_id = ?` — no user input ever goes here.
  const glBal = async (whereExtra: string, asOf: string): Promise<number> => {
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(
           CASE WHEN coa.normal_balance = 'debit' THEN jel.debit  - jel.credit
                ELSE                                   jel.credit - jel.debit  END
         ), 0) AS balance
       FROM chart_of_accounts coa
       LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
       LEFT JOIN journal_entries     je  ON je.id = jel.journal_entry_id
         AND je.status = 'posted'
         AND je.entry_date <= ?
       WHERE coa.company_id = ? AND (${whereExtra})`,
      [asOf, companyId]
    );
    return parseFloat((rows as any[])[0]?.balance || 0);
  };

  // Day before startDate = "opening" snapshot
  const openingDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  // ── NET INCOME (period-only revenue − expense from GL) ─────────────────────
  const [incomeRows] = await pool.query(
    `SELECT coa.account_type, coa.normal_balance,
            COALESCE(SUM(jel.debit), 0)  AS total_debit,
            COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM chart_of_accounts coa
     JOIN journal_entry_lines jel ON jel.account_id = coa.id
     JOIN journal_entries     je  ON je.id = jel.journal_entry_id
       AND je.status = 'posted'
       AND je.entry_date BETWEEN ? AND ?
       AND (je.reference_type IS NULL OR je.reference_type NOT IN ('year_end_close','opening_balance'))
     WHERE coa.company_id = ? AND coa.account_type IN ('revenue','expense')
     GROUP BY coa.account_type, coa.normal_balance`,
    [startDate, endDate, companyId]
  );
  let periodRevenue = 0;
  let periodExpense = 0;
  for (const row of incomeRows as any[]) {
    const debit  = parseFloat(row.total_debit)  || 0;
    const credit = parseFloat(row.total_credit) || 0;
    const bal    = row.normal_balance === 'debit' ? (debit - credit) : (credit - debit);
    if (row.account_type === 'revenue') periodRevenue += bal;
    else                                periodExpense += bal;
  }
  const netIncome = parseFloat((periodRevenue - periodExpense).toFixed(2));

  // ── WORKING CAPITAL CHANGES (balance at end − balance at start) ────────────
  // Asset increases are uses of cash (-); liability increases are sources of cash (+).
  const [arO, arC]         = await Promise.all([glBal("coa.account_number = '1100'", openingDate), glBal("coa.account_number = '1100'", endDate)]);
  const [invO, invC]       = await Promise.all([glBal("coa.account_number = '1200'", openingDate), glBal("coa.account_number = '1200'", endDate)]);
  const [taxRO, taxRC]     = await Promise.all([glBal("coa.account_number = '1250'", openingDate), glBal("coa.account_number = '1250'", endDate)]);
  const [apO, apC]         = await Promise.all([glBal("coa.account_number = '2000'", openingDate), glBal("coa.account_number = '2000'", endDate)]);
  const [taxPayO, taxPayC] = await Promise.all([glBal("coa.account_number = '2200'", openingDate), glBal("coa.account_number = '2200'", endDate)]);

  const wcItems = [
    { label: 'Decrease / (Increase) in Accounts Receivable',    amount: parseFloat((-(arC - arO)).toFixed(2)) },
    { label: 'Decrease / (Increase) in Inventory',              amount: parseFloat((-(invC - invO)).toFixed(2)) },
    { label: 'Decrease / (Increase) in Input Tax Recoverable',  amount: parseFloat((-(taxRC - taxRO)).toFixed(2)) },
    { label: 'Increase / (Decrease) in Accounts Payable',       amount: parseFloat((apC - apO).toFixed(2)) },
    { label: 'Increase / (Decrease) in Tax Payable',            amount: parseFloat((taxPayC - taxPayO).toFixed(2)) },
  ].filter(i => i.amount !== 0);

  const totalWC       = parseFloat(wcItems.reduce((s, i) => s + i.amount, 0).toFixed(2));
  const netOperating  = parseFloat((netIncome + totalWC).toFixed(2));

  // ── INVESTING ACTIVITIES (net change in fixed-asset accounts 1500-1999) ────
  const [fixO, fixC] = await Promise.all([
    glBal("CAST(coa.account_number AS UNSIGNED) BETWEEN 1500 AND 1999", openingDate),
    glBal("CAST(coa.account_number AS UNSIGNED) BETWEEN 1500 AND 1999", endDate),
  ]);
  const fixedChange  = parseFloat((fixC - fixO).toFixed(2));
  const netInvesting = parseFloat((-fixedChange).toFixed(2)); // increase in assets = outflow

  const investingItems = fixedChange !== 0
    ? [{ label: 'Net Change in Fixed Assets', amount: netInvesting }]
    : [];

  // ── FINANCING ACTIVITIES (long-term liabilities ≥ 2500 + equity excl. RE/OBE) ──
  const [ltlO, ltlC] = await Promise.all([
    glBal("CAST(coa.account_number AS UNSIGNED) >= 2500 AND coa.account_type = 'liability'", openingDate),
    glBal("CAST(coa.account_number AS UNSIGNED) >= 2500 AND coa.account_type = 'liability'", endDate),
  ]);
  const [equO, equC] = await Promise.all([
    glBal("coa.account_type = 'equity' AND coa.account_number NOT IN ('3050','3100')", openingDate),
    glBal("coa.account_type = 'equity' AND coa.account_number NOT IN ('3050','3100')", endDate),
  ]);
  const ltlChange = parseFloat((ltlC - ltlO).toFixed(2));
  const equChange = parseFloat((equC - equO).toFixed(2));

  const financingItems = [
    ltlChange !== 0 ? { label: 'Proceeds from / (Repayment of) Long-Term Debt',     amount: ltlChange } : null,
    equChange !== 0 ? { label: "Owner's Equity Contributions / (Withdrawals)",       amount: equChange } : null,
  ].filter(Boolean) as { label: string; amount: number }[];

  const netFinancing = parseFloat((ltlChange + equChange).toFixed(2));

  // ── CASH RECONCILIATION ────────────────────────────────────────────────────
  const [cashO, cashC] = await Promise.all([
    glBal("coa.account_number IN ('1000','1010','1020')", openingDate),
    glBal("coa.account_number IN ('1000','1010','1020')", endDate),
  ]);
  const netChange   = parseFloat((netOperating + netInvesting + netFinancing).toFixed(2));
  const variance    = parseFloat((cashC - cashO - netChange).toFixed(2));

  return {
    period: { start_date: startDate, end_date: endDate },
    operating: {
      net_income:                   netIncome,
      period_revenue:               parseFloat(periodRevenue.toFixed(2)),
      period_expense:               parseFloat(periodExpense.toFixed(2)),
      working_capital_adjustments:  wcItems,
      total_wc_adjustments:         totalWC,
      net_cash:                     netOperating,
    },
    investing: {
      activities: investingItems,
      net_cash:   netInvesting,
    },
    financing: {
      activities: financingItems,
      net_cash:   netFinancing,
    },
    summary: {
      net_change_in_cash:    netChange,
      opening_cash_balance:  parseFloat(cashO.toFixed(2)),
      closing_cash_balance:  parseFloat(cashC.toFixed(2)),
      reconciliation_variance: variance,
    },
  };
};

// ─── Tax Summary ─────────────────────────────────────────────────────────────

export const getTaxSummary = async (companyId: string, dateFrom: string, dateTo: string) => {
  // Output Tax — from approved/posted invoices
  const [invoiceRows] = await pool.query(
    `SELECT COUNT(*) AS invoice_count,
            COALESCE(SUM(grand_total), 0)     AS gross_revenue,
            COALESCE(SUM(tax_amount), 0)      AS output_tax
     FROM invoices
     WHERE company_id=? AND deleted_at IS NULL
       AND status IN ('sent','approved','posted')
       AND invoice_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  // Output Tax breakdown by tax rate (from invoice line items)
  const [outputBreakdown] = await pool.query(
    `SELECT t.name AS tax_name, t.rate AS tax_rate,
            COALESCE(SUM(ili.quantity * ili.rate), 0) AS net_amount,
            COALESCE(SUM(ili.tax_amount), 0)          AS tax_amount
     FROM invoice_line_items ili
     JOIN invoices i ON i.id = ili.invoice_id
     LEFT JOIN taxes t ON t.id = ili.tax_id
     WHERE i.company_id=? AND i.deleted_at IS NULL
       AND i.status IN ('sent','approved','posted')
       AND i.invoice_date BETWEEN ? AND ?
       AND ili.tax_id IS NOT NULL
     GROUP BY t.id, t.name, t.rate
     ORDER BY t.rate DESC`,
    [companyId, dateFrom, dateTo]
  );

  // Input Tax — from approved/posted bills
  const [billRows] = await pool.query(
    `SELECT COUNT(*) AS bill_count,
            COALESCE(SUM(total_amount), 0) AS gross_purchases,
            COALESCE(SUM(tax_amount), 0)   AS input_tax
     FROM bills
     WHERE company_id=? AND deleted_at IS NULL
       AND status IN ('approved','posted')
       AND bill_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  // Input Tax — from approved/posted expenses
  const [expenseRows] = await pool.query(
    `SELECT COUNT(*) AS expense_count,
            COALESCE(SUM(total_amount), 0) AS gross_expenses,
            COALESCE(SUM(tax_amount), 0)   AS input_tax
     FROM expenses
     WHERE company_id=? AND deleted_at IS NULL
       AND status IN ('approved','posted')
       AND expense_date BETWEEN ? AND ?`,
    [companyId, dateFrom, dateTo]
  );

  const outputTax          = parseFloat((invoiceRows as any[])[0]?.output_tax    || 0);
  const inputTaxBills      = parseFloat((billRows    as any[])[0]?.input_tax      || 0);
  const inputTaxExpenses   = parseFloat((expenseRows as any[])[0]?.input_tax      || 0);
  const totalInputTax      = inputTaxBills + inputTaxExpenses;
  const netTaxPayable      = outputTax - totalInputTax;

  return {
    period: { from: dateFrom, to: dateTo },
    output_tax: {
      invoice_count:  parseInt((invoiceRows as any[])[0]?.invoice_count || 0),
      gross_revenue:  parseFloat((invoiceRows as any[])[0]?.gross_revenue  || 0),
      tax_amount:     outputTax,
      breakdown:      outputBreakdown as any[],
    },
    input_tax: {
      from_bills: {
        count:          parseInt((billRows    as any[])[0]?.bill_count     || 0),
        gross_purchases:parseFloat((billRows  as any[])[0]?.gross_purchases|| 0),
        tax_amount:     inputTaxBills,
      },
      from_expenses: {
        count:          parseInt((expenseRows as any[])[0]?.expense_count  || 0),
        gross_expenses: parseFloat((expenseRows as any[])[0]?.gross_expenses|| 0),
        tax_amount:     inputTaxExpenses,
      },
      total: totalInputTax,
    },
    net_tax_payable: netTaxPayable,
  };
};

// ─── R-01: P&L Comparison (prior period / prior year) ────────────────────────

export const getProfitLossComparison = async (
  companyId: string,
  startDate: string,
  endDate: string,
  compareMode: 'prior_period' | 'prior_year' = 'prior_period'
) => {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const periodDays = Math.round((e.getTime() - s.getTime()) / 86400000);

  let cmpStart: string, cmpEnd: string;
  if (compareMode === 'prior_year') {
    cmpStart = new Date(s.getFullYear() - 1, s.getMonth(), s.getDate()).toISOString().slice(0, 10);
    cmpEnd   = new Date(e.getFullYear() - 1, e.getMonth(), e.getDate()).toISOString().slice(0, 10);
  } else {
    const ce = new Date(s); ce.setDate(ce.getDate() - 1);
    const cs = new Date(ce); cs.setDate(cs.getDate() - periodDays);
    cmpStart = cs.toISOString().slice(0, 10);
    cmpEnd   = ce.toISOString().slice(0, 10);
  }

  const [current, comparison] = await Promise.all([
    getProfitAndLoss(companyId, startDate, endDate),
    getProfitAndLoss(companyId, cmpStart, cmpEnd),
  ]);

  const chg = (a: number, b: number) => ({
    value: Number((a - b).toFixed(2)),
    pct:   b !== 0 ? Number(((a - b) / Math.abs(b) * 100).toFixed(2)) : null,
  });

  return {
    period:         { start_date: startDate, end_date: endDate },
    compare_period: { start_date: cmpStart,  end_date: cmpEnd },
    compare_mode:   compareMode,
    current,
    comparison,
    changes: {
      net_revenue:        chg(current.revenue.net_revenue,          comparison.revenue.net_revenue),
      cogs:               chg(current.cogs.total,                   comparison.cogs.total),
      gross_profit:       chg(current.gross_profit,                 comparison.gross_profit),
      operating_expenses: chg(current.operating_expenses.total,     comparison.operating_expenses.total),
      operating_income:   chg(current.operating_income,             comparison.operating_income),
      net_income:         chg(current.net_income,                   comparison.net_income),
    },
  };
};

// ─── R-19: Balance Sheet Comparison ──────────────────────────────────────────

export const getBalanceSheetComparison = async (
  companyId: string,
  date1: string,
  date2: string
) => {
  const [bs1, bs2] = await Promise.all([
    getBalanceSheet(companyId, date1),
    getBalanceSheet(companyId, date2),
  ]);

  const chg = (a: number, b: number) => ({
    value: Number((a - b).toFixed(2)),
    pct:   b !== 0 ? Number(((a - b) / Math.abs(b) * 100).toFixed(2)) : null,
  });

  // Build a merged account list for display
  const allAccountIds = new Set([
    ...bs1.assets.current.map((a: any) => a.id),
    ...bs1.assets.fixed.map((a: any) => a.id),
    ...bs1.liabilities.current.map((a: any) => a.id),
    ...bs1.liabilities.long_term.map((a: any) => a.id),
    ...bs1.equity.accounts.map((a: any) => a.id),
    ...bs2.assets.current.map((a: any) => a.id),
    ...bs2.assets.fixed.map((a: any) => a.id),
    ...bs2.liabilities.current.map((a: any) => a.id),
    ...bs2.liabilities.long_term.map((a: any) => a.id),
    ...bs2.equity.accounts.map((a: any) => a.id),
  ]);
  void allAccountIds;

  return {
    date1: bs1,
    date2: bs2,
    changes: {
      total_assets:      chg(bs1.assets.total,                       bs2.assets.total),
      total_liabilities: chg(bs1.liabilities.total,                  bs2.liabilities.total),
      total_equity:      chg(bs1.equity.total,                       bs2.equity.total),
    },
  };
};

// ─── R-31: Statement of Changes in Equity ────────────────────────────────────

export const getEquityChanges = async (
  companyId: string,
  startDate: string,
  endDate: string
) => {
  const openingDate = (() => {
    const d = new Date(startDate); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
  })();

  // Opening equity balances (cumulative up to day before startDate)
  const [openingRows] = await pool.query(
    `SELECT coa.id, coa.account_number, coa.name, coa.normal_balance,
            COALESCE(SUM(jel.debit), 0)  AS total_debit,
            COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM chart_of_accounts coa
     LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
     LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
       AND je.status = 'posted'
       AND je.entry_date <= ?
     WHERE coa.company_id = ? AND coa.account_type = 'equity'
     GROUP BY coa.id, coa.account_number, coa.name, coa.normal_balance
     ORDER BY coa.account_number`,
    [openingDate, companyId]
  );

  // Closing equity balances (cumulative up to endDate)
  const [closingRows] = await pool.query(
    `SELECT coa.id, coa.account_number, coa.name, coa.normal_balance,
            COALESCE(SUM(jel.debit), 0)  AS total_debit,
            COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM chart_of_accounts coa
     LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
     LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
       AND je.status = 'posted'
       AND je.entry_date <= ?
     WHERE coa.company_id = ? AND coa.account_type = 'equity'
     GROUP BY coa.id, coa.account_number, coa.name, coa.normal_balance
     ORDER BY coa.account_number`,
    [endDate, companyId]
  );

  // Period-only equity movements (to identify contributions, withdrawals, year-end close)
  const [periodRows] = await pool.query(
    `SELECT coa.id AS account_id, coa.account_number, coa.name, coa.normal_balance,
            je.reference_type,
            COALESCE(SUM(jel.debit), 0)  AS period_debit,
            COALESCE(SUM(jel.credit), 0) AS period_credit
     FROM chart_of_accounts coa
     JOIN journal_entry_lines jel ON jel.account_id = coa.id
     JOIN journal_entries je ON je.id = jel.journal_entry_id
       AND je.status = 'posted'
       AND je.entry_date BETWEEN ? AND ?
     WHERE coa.company_id = ? AND coa.account_type = 'equity'
     GROUP BY coa.id, coa.account_number, coa.name, coa.normal_balance, je.reference_type
     ORDER BY coa.account_number`,
    [startDate, endDate, companyId]
  );

  // Net income for the period (from P&L)
  const pl = await getProfitAndLoss(companyId, startDate, endDate);
  const periodNetIncome = pl.net_income;

  const calcBal = (row: any) => {
    const d = parseFloat(row.total_debit) || 0;
    const c = parseFloat(row.total_credit) || 0;
    return row.normal_balance === 'debit' ? d - c : c - d;
  };

  const openMap: Record<string, any> = {};
  for (const r of openingRows as any[]) openMap[r.id] = { ...r, balance: parseFloat(calcBal(r).toFixed(2)) };

  const closeMap: Record<string, any> = {};
  for (const r of closingRows as any[]) closeMap[r.id] = { ...r, balance: parseFloat(calcBal(r).toFixed(2)) };

  // Period movements per account grouped (exclude year_end_close — shown separately)
  const movMap: Record<string, number> = {};
  for (const r of periodRows as any[]) {
    if (r.reference_type === 'year_end_close') continue;
    const d = parseFloat(r.period_debit) || 0;
    const c = parseFloat(r.period_credit) || 0;
    const mov = r.normal_balance === 'debit' ? d - c : c - d;
    movMap[r.account_id] = (movMap[r.account_id] || 0) + mov;
  }

  const allIds = new Set([...Object.keys(openMap), ...Object.keys(closeMap)]);
  const accounts = Array.from(allIds).map((id) => {
    const open  = openMap[id];
    const close = closeMap[id];
    const ref   = open || close;
    const openBal  = open  ? open.balance  : 0;
    const closeBal = close ? close.balance : 0;
    // Net income is allocated to retained earnings (account 3100)
    const netIncomeAlloc = ref?.account_number === '3100' ? periodNetIncome : 0;
    const otherMovements = parseFloat(((movMap[id] || 0) - netIncomeAlloc).toFixed(2));
    return {
      id,
      account_number: ref?.account_number,
      name:           ref?.name,
      opening_balance:     parseFloat(openBal.toFixed(2)),
      net_income_allocated: parseFloat(netIncomeAlloc.toFixed(2)),
      other_movements:     otherMovements,
      closing_balance:     parseFloat(closeBal.toFixed(2)),
    };
  }).sort((a, b) => (a.account_number || '').localeCompare(b.account_number || ''));

  const totalOpening = accounts.reduce((s, a) => s + a.opening_balance, 0);
  const totalClosing = accounts.reduce((s, a) => s + a.closing_balance, 0);

  return {
    period: { start_date: startDate, end_date: endDate },
    period_net_income: periodNetIncome,
    accounts,
    totals: {
      opening_balance: parseFloat(totalOpening.toFixed(2)),
      closing_balance: parseFloat(totalClosing.toFixed(2)),
      net_change:      parseFloat((totalClosing - totalOpening).toFixed(2)),
    },
  };
};

// ─── R-23: Cash Flow Forecast (13-week rolling) ───────────────────────────────

export const getCashFlowForecast = async (companyId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // Current cash balance from GL (accounts 1000, 1010, 1020)
  const [cashRows] = await pool.query(
    `SELECT COALESCE(SUM(
       CASE WHEN coa.normal_balance = 'debit' THEN jel.debit - jel.credit
            ELSE jel.credit - jel.debit END
     ), 0) AS cash_balance
     FROM chart_of_accounts coa
     LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
     LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
     WHERE coa.company_id = ? AND coa.account_number IN ('1000','1010','1020')`,
    [companyId]
  );
  const currentCash = parseFloat((cashRows as any[])[0]?.cash_balance || 0);

  // End date = 13 weeks from today
  const forecastEnd = new Date(today);
  forecastEnd.setDate(forecastEnd.getDate() + 91);
  const forecastEndStr = forecastEnd.toISOString().slice(0, 10);

  // Open invoices due in forecast window → expected inflows
  const [arRows] = await pool.query(
    `SELECT
       YEARWEEK(due_date, 1) AS yw,
       MIN(due_date)          AS week_start,
       SUM(amount_due)        AS expected_inflow
     FROM invoices
     WHERE company_id = ? AND deleted_at IS NULL
       AND payment_status != 'paid' AND amount_due > 0
       AND due_date BETWEEN ? AND ?
     GROUP BY YEARWEEK(due_date, 1)
     ORDER BY yw`,
    [companyId, todayStr, forecastEndStr]
  );

  // Open bills due in forecast window → expected outflows
  const [apRows] = await pool.query(
    `SELECT
       YEARWEEK(due_date, 1) AS yw,
       MIN(due_date)          AS week_start,
       SUM(amount_due)        AS expected_outflow
     FROM bills
     WHERE company_id = ? AND deleted_at IS NULL
       AND payment_status != 'paid' AND amount_due > 0
       AND due_date BETWEEN ? AND ?
     GROUP BY YEARWEEK(due_date, 1)
     ORDER BY yw`,
    [companyId, todayStr, forecastEndStr]
  );

  // Active recurring documents with next_run_date in window
  const [recurRows] = await pool.query(
    `SELECT document_type, next_run_date
     FROM recurring_documents
     WHERE company_id = ? AND is_active = 1
       AND next_run_date BETWEEN ? AND ?`,
    [companyId, todayStr, forecastEndStr]
  );

  // Build week map (13 weeks)
  const weekMap: Record<string, { week_number: number; week_start: string; week_end: string; inflows: number; outflows: number }> = {};
  for (let w = 0; w < 13; w++) {
    const ws = new Date(today); ws.setDate(ws.getDate() + w * 7);
    const we = new Date(ws);    we.setDate(we.getDate() + 6);
    const yw = getYearWeek(ws);
    weekMap[yw] = {
      week_number: w + 1,
      week_start:  ws.toISOString().slice(0, 10),
      week_end:    we.toISOString().slice(0, 10),
      inflows:     0,
      outflows:    0,
    };
  }

  for (const r of arRows as any[]) {
    const yw = String(r.yw);
    if (weekMap[yw]) weekMap[yw].inflows += parseFloat(r.expected_inflow) || 0;
  }
  for (const r of apRows as any[]) {
    const yw = String(r.yw);
    if (weekMap[yw]) weekMap[yw].outflows += parseFloat(r.expected_outflow) || 0;
  }
  // Recurring docs contribute estimated flows (invoice = inflow, bill/expense = outflow)
  for (const r of recurRows as any[]) {
    const yw = getYearWeek(new Date(r.next_run_date));
    if (weekMap[yw]) {
      if (r.document_type === 'invoice') weekMap[yw].inflows  += 0; // amount unknown without template data
      else                               weekMap[yw].outflows += 0; // mark as expected but no amount
    }
  }

  let runningBalance = currentCash;
  const weeks = Object.values(weekMap)
    .sort((a, b) => a.week_number - b.week_number)
    .map((w) => {
      const net = parseFloat((w.inflows - w.outflows).toFixed(2));
      runningBalance = parseFloat((runningBalance + net).toFixed(2));
      return {
        week_number:     w.week_number,
        week_start:      w.week_start,
        week_end:        w.week_end,
        expected_inflows:  parseFloat(w.inflows.toFixed(2)),
        expected_outflows: parseFloat(w.outflows.toFixed(2)),
        net_flow:          net,
        running_balance:   runningBalance,
      };
    });

  return {
    as_of:           todayStr,
    current_cash:    parseFloat(currentCash.toFixed(2)),
    forecast_weeks:  13,
    weeks,
    summary: {
      total_inflows:  parseFloat(weeks.reduce((s, w) => s + w.expected_inflows, 0).toFixed(2)),
      total_outflows: parseFloat(weeks.reduce((s, w) => s + w.expected_outflows, 0).toFixed(2)),
      closing_cash:   weeks.length ? weeks[weeks.length - 1].running_balance : currentCash,
    },
  };
};

function getYearWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}${String(week).padStart(2, '0')}`;
}

// ─── R-22: P&L by Department ─────────────────────────────────────────────────

export const getProfitLossByDepartment = async (
  companyId: string,
  startDate: string,
  endDate: string
) => {
  // All departments for this company
  const [deptRows] = await pool.query(
    `SELECT id, name, color FROM departments WHERE company_id = ? ORDER BY name`,
    [companyId]
  );
  const departments = deptRows as any[];

  // Company-wide revenue (invoices have no dept split)
  const [revRows] = await pool.query(
    `SELECT COALESCE(SUM(grand_total - tax_amount), 0) AS net_revenue
     FROM invoices
     WHERE company_id = ? AND deleted_at IS NULL
       AND status IN ('sent','approved','posted')
       AND invoice_date BETWEEN ? AND ?`,
    [companyId, startDate, endDate]
  );
  const totalRevenue = parseFloat((revRows as any[])[0]?.net_revenue || 0);

  // Expenses grouped by department (via creator's department)
  const [expRows] = await pool.query(
    `SELECT
       COALESCE(u.department_id, 'unassigned') AS dept_id,
       COALESCE(d.name, 'Unassigned')           AS dept_name,
       SUM(e.total_amount)                       AS total_expenses
     FROM expenses e
     LEFT JOIN users u ON u.id = e.created_by
     LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = ?
     WHERE e.company_id = ? AND e.deleted_at IS NULL
       AND e.status IN ('approved','posted')
       AND e.expense_date BETWEEN ? AND ?
     GROUP BY dept_id, dept_name
     ORDER BY total_expenses DESC`,
    [companyId, companyId, startDate, endDate]
  );

  // Bills grouped by department (via creator's department)
  const [billRows] = await pool.query(
    `SELECT
       COALESCE(u.department_id, 'unassigned') AS dept_id,
       COALESCE(d.name, 'Unassigned')           AS dept_name,
       SUM(b.total_amount)                       AS total_bills
     FROM bills b
     LEFT JOIN users u ON u.id = b.created_by
     LEFT JOIN departments d ON d.id = u.department_id AND d.company_id = ?
     WHERE b.company_id = ? AND b.deleted_at IS NULL
       AND b.status IN ('approved','posted')
       AND b.bill_date BETWEEN ? AND ?
     GROUP BY dept_id, dept_name
     ORDER BY total_bills DESC`,
    [companyId, companyId, startDate, endDate]
  );

  // Merge into dept_id keyed map
  const deptData: Record<string, { dept_id: string; dept_name: string; expenses: number; bills: number }> = {};

  // Initialise all known departments
  for (const d of departments) {
    deptData[d.id] = { dept_id: d.id, dept_name: d.name, expenses: 0, bills: 0 };
  }
  deptData['unassigned'] = { dept_id: 'unassigned', dept_name: 'Unassigned', expenses: 0, bills: 0 };

  for (const r of expRows as any[]) {
    const key = r.dept_id || 'unassigned';
    if (!deptData[key]) deptData[key] = { dept_id: key, dept_name: r.dept_name, expenses: 0, bills: 0 };
    deptData[key].expenses += parseFloat(r.total_expenses) || 0;
  }
  for (const r of billRows as any[]) {
    const key = r.dept_id || 'unassigned';
    if (!deptData[key]) deptData[key] = { dept_id: key, dept_name: r.dept_name, expenses: 0, bills: 0 };
    deptData[key].bills += parseFloat(r.total_bills) || 0;
  }

  const deptList = Object.values(deptData)
    .filter((d) => d.expenses > 0 || d.bills > 0 || d.dept_id !== 'unassigned')
    .map((d) => ({
      ...d,
      total_expenses: parseFloat((d.expenses + d.bills).toFixed(2)),
      net_income:     parseFloat((totalRevenue - d.expenses - d.bills).toFixed(2)),
      expenses:       parseFloat(d.expenses.toFixed(2)),
      bills:          parseFloat(d.bills.toFixed(2)),
    }));

  const totalExpenses = parseFloat(deptList.reduce((s, d) => s + d.total_expenses, 0).toFixed(2));

  return {
    period: { start_date: startDate, end_date: endDate },
    total_revenue:   parseFloat(totalRevenue.toFixed(2)),
    total_expenses:  totalExpenses,
    net_income:      parseFloat((totalRevenue - totalExpenses).toFixed(2)),
    departments:     deptList,
  };
};

// ─── R-21: Budget vs Actual ──────────────────────────────────────────────────

export const getBudgetVsActual = async (
  companyId: string,
  startDate: string,
  endDate: string,
  budgetPeriodId?: string
) => {
  // Fetch active budget period if not specified
  let periodId = budgetPeriodId;
  if (!periodId) {
    const [bpRows] = await pool.query(
      `SELECT id FROM budget_periods
       WHERE company_id = ? AND status = 'active'
       ORDER BY start_date DESC LIMIT 1`,
      [companyId]
    );
    periodId = (bpRows as any[])[0]?.id || null;
  }

  // Budget lines for the period (aggregated per account across months in range)
  let budgetByAccount: Record<string, number> = {};
  let budgetPeriod: any = null;

  if (periodId) {
    const [bpRows] = await pool.query(
      `SELECT id, name, fiscal_year, start_date, end_date, status
       FROM budget_periods WHERE id = ? AND company_id = ?`,
      [periodId, companyId]
    );
    budgetPeriod = (bpRows as any[])[0] || null;

    const sMonth = new Date(startDate).getMonth() + 1;
    const sYear  = new Date(startDate).getFullYear();
    const eMonth = new Date(endDate).getMonth() + 1;
    const eYear  = new Date(endDate).getFullYear();

    const [blRows] = await pool.query(
      `SELECT account_id, SUM(amount) AS budgeted
       FROM budget_lines
       WHERE budget_period_id = ?
         AND ((year = ? AND month >= ?) OR (year > ? AND year < ?) OR (year = ? AND month <= ?))
       GROUP BY account_id`,
      [periodId, sYear, sMonth, sYear, eYear, eYear, eMonth]
    );
    for (const r of blRows as any[]) {
      budgetByAccount[r.account_id] = parseFloat(r.budgeted) || 0;
    }
  }

  // Actual GL balances per account for the period
  const [actualRows] = await pool.query(
    `SELECT
       coa.id, coa.account_number, coa.name, coa.account_type, coa.normal_balance,
       COALESCE(SUM(jel.debit), 0)  AS total_debit,
       COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM chart_of_accounts coa
     LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
     LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
       AND je.status = 'posted'
       AND je.entry_date BETWEEN ? AND ?
       AND (je.reference_type IS NULL OR je.reference_type NOT IN ('opening_balance','year_end_close'))
     WHERE coa.company_id = ? AND coa.account_type IN ('revenue','expense')
     GROUP BY coa.id, coa.account_number, coa.name, coa.account_type, coa.normal_balance
     ORDER BY coa.account_number`,
    [startDate, endDate, companyId]
  );

  // Collect all account IDs from budget + actuals
  const allAccountIds = new Set([
    ...Object.keys(budgetByAccount),
    ...(actualRows as any[]).map((r: any) => r.id),
  ]);

  // Build lookup of actual rows
  const actualMap: Record<string, any> = {};
  for (const r of actualRows as any[]) actualMap[r.id] = r;

  // If budgetByAccount has IDs not in actualMap, fetch their COA details
  const missingIds = [...allAccountIds].filter((id) => !actualMap[id]);
  if (missingIds.length) {
    const placeholders = missingIds.map(() => '?').join(',');
    const [coaRows] = await pool.query(
      `SELECT id, account_number, name, account_type, normal_balance FROM chart_of_accounts WHERE id IN (${placeholders})`,
      missingIds
    );
    for (const r of coaRows as any[]) {
      actualMap[r.id] = { ...r, total_debit: 0, total_credit: 0 };
    }
  }

  const lines = [...allAccountIds]
    .map((id) => {
      const row     = actualMap[id];
      if (!row) return null;
      const d       = parseFloat(row.total_debit)  || 0;
      const c       = parseFloat(row.total_credit) || 0;
      const actual  = row.normal_balance === 'debit' ? d - c : c - d;
      const budgeted = budgetByAccount[id] || 0;
      const variance = parseFloat((actual - budgeted).toFixed(2));
      const variancePct = budgeted !== 0 ? parseFloat(((actual - budgeted) / Math.abs(budgeted) * 100).toFixed(2)) : null;
      return {
        account_id:     id,
        account_number: row.account_number,
        account_name:   row.name,
        account_type:   row.account_type,
        budgeted:       parseFloat(budgeted.toFixed(2)),
        actual:         parseFloat(actual.toFixed(2)),
        variance,
        variance_pct:   variancePct,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => (a.account_number || '').localeCompare(b.account_number || ''));

  const revenueLines  = lines.filter((l: any) => l.account_type === 'revenue');
  const expenseLines  = lines.filter((l: any) => l.account_type === 'expense');
  const totalBudgetedRevenue  = revenueLines.reduce((s: number, l: any) => s + l.budgeted, 0);
  const totalActualRevenue    = revenueLines.reduce((s: number, l: any) => s + l.actual,   0);
  const totalBudgetedExpenses = expenseLines.reduce((s: number, l: any) => s + l.budgeted, 0);
  const totalActualExpenses   = expenseLines.reduce((s: number, l: any) => s + l.actual,   0);

  return {
    period: { start_date: startDate, end_date: endDate },
    budget_period: budgetPeriod,
    has_budget: !!periodId && Object.keys(budgetByAccount).length > 0,
    revenue_lines:  revenueLines,
    expense_lines:  expenseLines,
    summary: {
      budgeted_revenue:  parseFloat(totalBudgetedRevenue.toFixed(2)),
      actual_revenue:    parseFloat(totalActualRevenue.toFixed(2)),
      budgeted_expenses: parseFloat(totalBudgetedExpenses.toFixed(2)),
      actual_expenses:   parseFloat(totalActualExpenses.toFixed(2)),
      budgeted_net:      parseFloat((totalBudgetedRevenue - totalBudgetedExpenses).toFixed(2)),
      actual_net:        parseFloat((totalActualRevenue   - totalActualExpenses).toFixed(2)),
      net_variance:      parseFloat(((totalActualRevenue - totalActualExpenses) - (totalBudgetedRevenue - totalBudgetedExpenses)).toFixed(2)),
    },
  };
};
