import { pool } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createStatusHistory } from '../../services/auditService';
import { createAutoJournalEntry, getSystemAccount } from '../accounting/accounting.service';

export const listExpenses = async (companyId: string, filters: any) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.status) { conditions.push(`status=?`); params.push(filters.status); }
  if (filters.vendor_id) { conditions.push(`vendor_id=?`); params.push(filters.vendor_id); }
  if (filters.expense_category) { conditions.push(`expense_category=?`); params.push(filters.expense_category); }
  if (filters.date_from) { conditions.push(`expense_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`expense_date<=?`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM expenses WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id,expense_no,expense_category,payee_name,expense_date,amount,total_amount,status,payment_status FROM expenses WHERE ${where} ORDER BY expense_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { expenses: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getExpenseById = async (companyId: string, expenseId: string) => {
  const [rows] = await pool.query('SELECT * FROM expenses WHERE id=? AND company_id=? AND deleted_at IS NULL', [expenseId, companyId]);
  if (!(rows as any[]).length) throw new NotFoundError('Expense');
  return (rows as any[])[0];
};

export const createExpense = async (companyId: string, userId: string, data: any) => {
  const expNo = await generateDocumentNumber(companyId, 'expense');
  const totalAmount = (data.amount || 0) + (data.tax_amount || 0);
  await pool.query(
    `INSERT INTO expenses (company_id,expense_no,vendor_id,payee_name,expense_category,expense_account,reference_no,invoice_no,expense_date,amount,tax_id,tax_amount,payment_method,status,payment_status,description,notes,created_by,updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'draft','unpaid',?,?,?,?)`,
    [companyId, expNo, data.vendor_id || null, data.payee_name || null, data.expense_category, data.expense_account || null, data.reference_no || null, data.invoice_no || null, data.expense_date, data.amount, data.tax_id || null, data.tax_amount || 0, data.payment_method || null, data.description || null, data.notes || null, userId, userId]
  );
  const [newRows] = await pool.query('SELECT * FROM expenses WHERE company_id=? AND expense_no=? ORDER BY created_at DESC LIMIT 1', [companyId, expNo]);
  return (newRows as any[])[0];
};

export const updateExpense = async (companyId: string, expenseId: string, userId: string, data: any) => {
  const exp = await getExpenseById(companyId, expenseId);
  if (exp.status !== 'draft') throw new ConflictError('Only draft expenses can be edited');
  const fields = Object.keys(data).filter(k => !['company_id', 'id'].includes(k));
  if (!fields.length) return exp;
  const setClause = fields.map(f => `${f}=?`).join(', ');
  await pool.query(
    `UPDATE expenses SET ${setClause}, updated_by=?, updated_at=NOW() WHERE id=? AND company_id=? AND deleted_at IS NULL`,
    [...fields.map(f => data[f]), userId, expenseId, companyId]
  );
  return getExpenseById(companyId, expenseId);
};

export const deleteExpense = async (companyId: string, expenseId: string) => {
  const exp = await getExpenseById(companyId, expenseId);
  if (exp.status !== 'draft') throw new ConflictError('Only draft expenses can be deleted');
  await pool.query('UPDATE expenses SET deleted_at=NOW() WHERE id=? AND company_id=?', [expenseId, companyId]);
};

export const updateStatus = async (companyId: string, expenseId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  const exp = await getExpenseById(companyId, expenseId);
  await pool.query('UPDATE expenses SET status=?,updated_by=?,updated_at=NOW() WHERE id=?', [newStatus, userId, expenseId]);
  await createStatusHistory({ company_id: companyId, document_type: 'expense', document_id: expenseId, document_no: exp.expense_no, from_status: exp.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason });
  return { ...exp, status: newStatus };
};

export const approveExpense = async (companyId: string, expenseId: string, userId: string, userName: string) => {
  const exp = await getExpenseById(companyId, expenseId);
  if (exp.status !== 'draft') throw new ConflictError('Only draft expenses can be approved');
  const result = await updateStatus(companyId, expenseId, userId, userName, 'approved');

  try {
    const expenseAccountId = await getSystemAccount(companyId, '5900');
    const cashAccountId = await getSystemAccount(companyId, '1000');
    if (expenseAccountId && cashAccountId) {
      const totalAmount = parseFloat(exp.total_amount || exp.amount) || 0;
      await createAutoJournalEntry(companyId, userId, userName, 'expense', expenseId, exp.expense_no, exp.expense_date, [
        { account_id: expenseAccountId, debit: totalAmount, credit: 0, description: `Expense: ${exp.expense_category || ''}` },
        { account_id: cashAccountId, debit: 0, credit: totalAmount, description: 'Cash payment' },
      ], `Expense ${exp.expense_no} approved`);
    }
  } catch (glErr) {
    console.error('GL auto-post failed for expense approval:', glErr);
  }

  return result;
};

export const markPaid = async (companyId: string, expenseId: string, userId: string, data: any) => {
  await getExpenseById(companyId, expenseId);
  const paidDate = data.paid_date || new Date().toISOString().split('T')[0];
  await pool.query(
    'UPDATE expenses SET payment_status=\'paid\',paid_date=?,payment_method=COALESCE(?,payment_method),updated_by=?,updated_at=NOW() WHERE id=? AND company_id=?',
    [paidDate, data.payment_method || null, userId, expenseId, companyId]
  );
  return getExpenseById(companyId, expenseId);
};
