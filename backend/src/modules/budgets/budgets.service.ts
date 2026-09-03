import { pool } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';

export interface BudgetPeriodInput {
  name: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  status?: 'draft' | 'active' | 'locked';
  notes?: string;
}

export interface BudgetLineInput {
  account_id: string;
  month: number;
  year: number;
  amount: number;
  notes?: string;
}

export const listBudgetPeriods = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT bp.id, bp.name, bp.fiscal_year, bp.start_date, bp.end_date,
            bp.status, bp.notes, bp.created_at, bp.updated_at,
            COUNT(bl.id) AS line_count,
            COALESCE(SUM(bl.amount), 0) AS total_budgeted
     FROM budget_periods bp
     LEFT JOIN budget_lines bl ON bl.budget_period_id = bp.id
     WHERE bp.company_id = ?
     GROUP BY bp.id
     ORDER BY bp.fiscal_year DESC, bp.start_date DESC`,
    [companyId]
  );
  return rows as any[];
};

export const getBudgetPeriod = async (companyId: string, periodId: string) => {
  const [rows] = await pool.query(
    `SELECT id, name, fiscal_year, start_date, end_date, status, notes, created_at, updated_at
     FROM budget_periods WHERE id = ? AND company_id = ?`,
    [periodId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Budget period');
  return (rows as any[])[0];
};

export const createBudgetPeriod = async (
  companyId: string,
  userId: string,
  data: BudgetPeriodInput
) => {
  if (!data.name) throw new ValidationError('name is required');
  if (!data.fiscal_year) throw new ValidationError('fiscal_year is required');
  if (!data.start_date || !data.end_date) throw new ValidationError('start_date and end_date are required');

  const [result] = await pool.query(
    `INSERT INTO budget_periods (company_id, name, fiscal_year, start_date, end_date, status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      data.name,
      data.fiscal_year,
      data.start_date,
      data.end_date,
      data.status || 'draft',
      data.notes || null,
      userId,
    ]
  );

  // UUID() default means insertId isn't usable — re-query the just-created row.
  const [rows] = await pool.query(
    `SELECT id, name, fiscal_year, start_date, end_date, status, notes, created_at, updated_at
     FROM budget_periods
     WHERE company_id = ? AND name = ? AND fiscal_year = ?
     ORDER BY created_at DESC LIMIT 1`,
    [companyId, data.name, data.fiscal_year]
  );
  void result;
  return (rows as any[])[0];
};

export const updateBudgetPeriod = async (
  companyId: string,
  periodId: string,
  data: Partial<BudgetPeriodInput>
) => {
  await getBudgetPeriod(companyId, periodId); // throws if not found

  const sets: string[] = [];
  const params: unknown[] = [];
  if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
  if (data.fiscal_year !== undefined) { sets.push('fiscal_year = ?'); params.push(data.fiscal_year); }
  if (data.start_date !== undefined) { sets.push('start_date = ?'); params.push(data.start_date); }
  if (data.end_date !== undefined) { sets.push('end_date = ?'); params.push(data.end_date); }
  if (data.status !== undefined) { sets.push('status = ?'); params.push(data.status); }
  if (data.notes !== undefined) { sets.push('notes = ?'); params.push(data.notes); }

  if (sets.length) {
    params.push(periodId, companyId);
    await pool.query(
      `UPDATE budget_periods SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
      params
    );
  }
  return getBudgetPeriod(companyId, periodId);
};

export const deleteBudgetPeriod = async (companyId: string, periodId: string) => {
  await getBudgetPeriod(companyId, periodId); // throws if not found
  // budget_lines are removed via ON DELETE CASCADE
  await pool.query('DELETE FROM budget_periods WHERE id = ? AND company_id = ?', [periodId, companyId]);
};

export const getBudgetLines = async (companyId: string, periodId: string) => {
  await getBudgetPeriod(companyId, periodId); // verify ownership
  const [rows] = await pool.query(
    `SELECT bl.id, bl.account_id, bl.month, bl.year, bl.amount, bl.notes,
            coa.account_number, coa.name AS account_name, coa.account_type
     FROM budget_lines bl
     LEFT JOIN chart_of_accounts coa ON coa.id = bl.account_id
     WHERE bl.budget_period_id = ?
     ORDER BY coa.account_number, bl.year, bl.month`,
    [periodId]
  );
  return (rows as any[]).map((r) => ({
    ...r,
    amount: parseFloat(r.amount) || 0,
  }));
};

// Upsert an array of budget lines for a period. Each {account_id, month, year, amount}
// is inserted, or its amount/notes updated if the (period, account, month, year) exists.
export const saveBudgetLines = async (
  companyId: string,
  periodId: string,
  lines: BudgetLineInput[]
) => {
  await getBudgetPeriod(companyId, periodId); // verify ownership
  if (!Array.isArray(lines)) throw new ValidationError('lines must be an array');

  for (const line of lines) {
    if (!line.account_id) throw new ValidationError('account_id is required for each line');
    if (!line.month || line.month < 1 || line.month > 12) throw new ValidationError('month must be 1-12');
    if (!line.year) throw new ValidationError('year is required for each line');
    const amount = Number(line.amount);
    if (Number.isNaN(amount)) throw new ValidationError('amount must be a number');

    await pool.query(
      `INSERT INTO budget_lines (budget_period_id, account_id, month, year, amount, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), notes = VALUES(notes), updated_at = NOW()`,
      [periodId, line.account_id, line.month, line.year, amount, line.notes || null]
    );
  }

  return getBudgetLines(companyId, periodId);
};
