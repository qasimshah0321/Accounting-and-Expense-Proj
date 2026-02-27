import { pool } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createStatusHistory } from '../../services/auditService';

export const listExpenses = async (companyId: string, filters: any) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.status) { conditions.push(`status=$${idx++}`); params.push(filters.status); }
  if (filters.vendor_id) { conditions.push(`vendor_id=$${idx++}`); params.push(filters.vendor_id); }
  if (filters.expense_category) { conditions.push(`expense_category=$${idx++}`); params.push(filters.expense_category); }
  if (filters.date_from) { conditions.push(`expense_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`expense_date<=$${idx++}`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM expenses WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,expense_no,expense_category,payee_name,expense_date,amount,total_amount,status,payment_status FROM expenses WHERE ${where} ORDER BY expense_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { expenses: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getExpenseById = async (companyId: string, expenseId: string) => {
  const { rows } = await pool.query('SELECT * FROM expenses WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [expenseId, companyId]);
  if (!rows.length) throw new NotFoundError('Expense');
  return rows[0];
};

export const createExpense = async (companyId: string, userId: string, data: any) => {
  const expNo = await generateDocumentNumber(companyId, 'expense');
  const totalAmount = (data.amount || 0) + (data.tax_amount || 0);
  const { rows } = await pool.query(
    `INSERT INTO expenses (company_id,expense_no,vendor_id,payee_name,expense_category,expense_account,reference_no,invoice_no,expense_date,amount,tax_id,tax_amount,payment_method,status,payment_status,description,notes,created_by,updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft','unpaid',$14,$15,$16,$16) RETURNING *`,
    [companyId, expNo, data.vendor_id || null, data.payee_name || null, data.expense_category, data.expense_account || null, data.reference_no || null, data.invoice_no || null, data.expense_date, data.amount, data.tax_id || null, data.tax_amount || 0, data.payment_method || null, data.description || null, data.notes || null, userId]
  );
  return rows[0];
};

export const updateExpense = async (companyId: string, expenseId: string, userId: string, data: any) => {
  const exp = await getExpenseById(companyId, expenseId);
  if (exp.status !== 'draft') throw new ConflictError('Only draft expenses can be edited');
  const fields = Object.keys(data).filter(k => !['company_id', 'id'].includes(k));
  if (!fields.length) return exp;
  const setClause = fields.map((f, i) => `${f}=$${i + 3}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE expenses SET ${setClause}, updated_by=$${fields.length + 3}, updated_at=NOW() WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL RETURNING *`,
    [expenseId, companyId, ...fields.map(f => data[f]), userId]
  );
  return rows[0];
};

export const deleteExpense = async (companyId: string, expenseId: string) => {
  const exp = await getExpenseById(companyId, expenseId);
  if (exp.status !== 'draft') throw new ConflictError('Only draft expenses can be deleted');
  await pool.query('UPDATE expenses SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [expenseId, companyId]);
};

export const updateStatus = async (companyId: string, expenseId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  const exp = await getExpenseById(companyId, expenseId);
  await pool.query('UPDATE expenses SET status=$1,updated_by=$2,updated_at=NOW() WHERE id=$3', [newStatus, userId, expenseId]);
  await createStatusHistory({ company_id: companyId, document_type: 'expense', document_id: expenseId, document_no: exp.expense_no, from_status: exp.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason });
  return { ...exp, status: newStatus };
};

export const approveExpense = async (companyId: string, expenseId: string, userId: string, userName: string) => {
  const exp = await getExpenseById(companyId, expenseId);
  if (exp.status !== 'draft') throw new ConflictError('Only draft expenses can be approved');
  return updateStatus(companyId, expenseId, userId, userName, 'approved');
};

export const markPaid = async (companyId: string, expenseId: string, userId: string, data: any) => {
  await getExpenseById(companyId, expenseId);
  const paidDate = data.paid_date || new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    'UPDATE expenses SET payment_status=\'paid\',paid_date=$1,payment_method=COALESCE($2,payment_method),updated_by=$3,updated_at=NOW() WHERE id=$4 AND company_id=$5 RETURNING *',
    [paidDate, data.payment_method || null, userId, expenseId, companyId]
  );
  return rows[0];
};
