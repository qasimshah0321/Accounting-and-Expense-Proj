import { pool } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { createInvoice } from '../invoices/invoices.service';
import { createBill } from '../bills/bills.service';
import { createExpense } from '../expenses/expenses.service';

export const listRecurring = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT * FROM recurring_documents
     WHERE company_id = ? AND deleted_at IS NULL
     ORDER BY next_run_date ASC`,
    [companyId]
  );
  return rows as any[];
};

export const getRecurringById = async (companyId: string, id: string) => {
  const [rows] = await pool.query(
    `SELECT * FROM recurring_documents
     WHERE id = ? AND company_id = ? AND deleted_at IS NULL`,
    [id, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Recurring document');
  return (rows as any[])[0];
};

export const createRecurring = async (companyId: string, userId: string, data: any) => {
  await pool.query(
    `INSERT INTO recurring_documents
       (company_id, document_type, name, description, frequency,
        start_date, end_date, next_run_date, max_runs, template_data, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      companyId,
      data.document_type,
      data.name,
      data.description || null,
      data.frequency,
      data.start_date,
      data.end_date || null,
      data.start_date,
      data.max_runs || null,
      JSON.stringify(data.template_data || {}),
      userId,
    ]
  );
  const [newRows] = await pool.query(
    'SELECT * FROM recurring_documents WHERE company_id=? AND name=? ORDER BY created_at DESC LIMIT 1',
    [companyId, data.name]
  );
  return (newRows as any[])[0];
};

export const updateRecurring = async (companyId: string, id: string, data: any) => {
  const existing = await getRecurringById(companyId, id);

  const fields: string[] = [];
  const values: any[] = [];

  const allowed = [
    'name', 'document_type', 'frequency', 'start_date', 'end_date',
    'max_runs', 'description', 'is_active',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (data.template_data !== undefined) {
    fields.push(`template_data = ?`);
    values.push(JSON.stringify(data.template_data));
  }

  if (!fields.length) return existing;

  fields.push(`updated_at = NOW()`);

  await pool.query(
    `UPDATE recurring_documents SET ${fields.join(', ')}
     WHERE company_id = ? AND id = ? AND deleted_at IS NULL`,
    [...values, companyId, id]
  );
  const [updatedRows] = await pool.query('SELECT * FROM recurring_documents WHERE id=? AND company_id=?', [id, companyId]);
  if (!(updatedRows as any[]).length) throw new NotFoundError('Recurring document');
  return (updatedRows as any[])[0];
};

export const deleteRecurring = async (companyId: string, id: string) => {
  await getRecurringById(companyId, id);
  await pool.query(
    `UPDATE recurring_documents SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = ? AND company_id = ? AND deleted_at IS NULL`,
    [id, companyId]
  );
  return { id };
};

/**
 * Calculate the next run date based on frequency.
 */
const advanceDate = (dateStr: string, frequency: string): string => {
  const d = new Date(dateStr);
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'annually':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split('T')[0];
};

/**
 * Generate a document from a recurring template.
 * Creates the actual invoice/bill/expense, updates run tracking.
 */
export const generateDocument = async (companyId: string, userId: string, id: string) => {
  const rec = await getRecurringById(companyId, id);

  if (!rec.is_active) {
    throw new ValidationError('This recurring document is inactive');
  }

  if (rec.max_runs && rec.total_runs >= rec.max_runs) {
    throw new ValidationError('Maximum number of runs reached');
  }

  const templateData = typeof rec.template_data === 'string'
    ? JSON.parse(rec.template_data)
    : rec.template_data;

  let created: any;
  const userName = 'System (Recurring)';

  try {
    switch (rec.document_type) {
      case 'invoice':
        created = await createInvoice(companyId, userId, userName, templateData);
        break;
      case 'bill':
        created = await createBill(companyId, userId, templateData);
        break;
      case 'expense':
        created = await createExpense(companyId, userId, templateData);
        break;
      default:
        throw new ValidationError(`Unknown document type: ${rec.document_type}`);
    }
  } catch (err: any) {
    throw new ValidationError(
      `Failed to generate ${rec.document_type}: ${err.message}`
    );
  }

  // Update run tracking
  const nextRunDate = advanceDate(rec.next_run_date, rec.frequency);
  const newTotalRuns = (rec.total_runs || 0) + 1;
  const shouldDeactivate = rec.max_runs && newTotalRuns >= rec.max_runs;
  const pastEndDate = rec.end_date && new Date(nextRunDate) > new Date(rec.end_date);

  await pool.query(
    `UPDATE recurring_documents
     SET next_run_date = ?,
         last_run_date = CURDATE(),
         total_runs = ?,
         is_active = ?,
         updated_at = NOW()
     WHERE id = ? AND company_id = ?`,
    [
      nextRunDate,
      newTotalRuns,
      !(shouldDeactivate || pastEndDate),
      id,
      companyId,
    ]
  );

  return {
    document: created,
    document_type: rec.document_type,
    total_runs: newTotalRuns,
    next_run_date: nextRunDate,
    is_active: !(shouldDeactivate || pastEndDate),
  };
};
