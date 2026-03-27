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

export const getReceivablesAgeing = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT
       c.id AS customer_id, c.name AS customer_name,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN amount_due ELSE 0 END) AS current_due,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN amount_due ELSE 0 END) AS overdue_1_30,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN amount_due ELSE 0 END) AS overdue_31_60,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN amount_due ELSE 0 END) AS overdue_61_90,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN amount_due ELSE 0 END) AS overdue_90_plus,
       SUM(amount_due) AS total_outstanding
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     WHERE i.company_id=? AND i.deleted_at IS NULL AND i.payment_status != 'paid'
     GROUP BY c.id, c.name
     HAVING SUM(amount_due) > 0
     ORDER BY total_outstanding DESC`,
    [companyId]
  );
  return rows as any[];
};

export const getPayablesAgeing = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT
       v.id AS vendor_id, v.name AS vendor_name,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) <= 0 THEN amount_due ELSE 0 END) AS current_due,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 1 AND 30 THEN amount_due ELSE 0 END) AS overdue_1_30,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 31 AND 60 THEN amount_due ELSE 0 END) AS overdue_31_60,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) BETWEEN 61 AND 90 THEN amount_due ELSE 0 END) AS overdue_61_90,
       SUM(CASE WHEN DATEDIFF(CURDATE(), due_date) > 90 THEN amount_due ELSE 0 END) AS overdue_90_plus,
       SUM(amount_due) AS total_outstanding
     FROM bills b
     JOIN vendors v ON v.id = b.vendor_id
     WHERE b.company_id=? AND b.deleted_at IS NULL AND b.payment_status != 'paid'
     GROUP BY v.id, v.name
     HAVING SUM(amount_due) > 0
     ORDER BY total_outstanding DESC`,
    [companyId]
  );
  return rows as any[];
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
    `SELECT id, name, sku, unit_of_measure, current_stock, unit_cost,
            (current_stock * COALESCE(unit_cost, 0)) AS total_value
     FROM products WHERE company_id=? AND deleted_at IS NULL AND track_inventory=true
     ORDER BY total_value DESC`,
    [companyId]
  );
  const totalValue = (rows as any[]).reduce((sum: number, r: any) => sum + parseFloat(r.total_value || 0), 0);
  return { products: rows as any[], total_inventory_value: totalValue };
};
