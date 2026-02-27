import { pool } from '../../config/database';
import { withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';

export const listCustomerPayments = async (companyId: string, filters: any) => {
  const conditions = ['cp.company_id=$1', 'cp.deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.customer_id) { conditions.push(`cp.customer_id=$${idx++}`); params.push(filters.customer_id); }
  if (filters.date_from) { conditions.push(`cp.payment_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`cp.payment_date<=$${idx++}`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM customer_payments cp WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT cp.id, cp.payment_no, cp.customer_id, c.name AS customer_name, cp.payment_date, cp.amount, cp.unallocated_amount, cp.payment_method, cp.reference_no
     FROM customer_payments cp
     LEFT JOIN customers c ON c.id = cp.customer_id
     WHERE ${where} ORDER BY cp.payment_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { payments: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getCustomerPaymentById = async (companyId: string, paymentId: string) => {
  const { rows } = await pool.query(
    `SELECT cp.*, c.name AS customer_name FROM customer_payments cp
     LEFT JOIN customers c ON c.id = cp.customer_id
     WHERE cp.id=$1 AND cp.company_id=$2 AND cp.deleted_at IS NULL`,
    [paymentId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Customer payment');
  return rows[0];
};

export const createCustomerPayment = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const paymentNo = await generateDocumentNumber(companyId, 'customer_payment', client);
    const { rows } = await client.query(
      `INSERT INTO customer_payments (company_id, payment_no, customer_id, invoice_id, payment_date, amount, unallocated_amount, payment_method, reference_no, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [companyId, paymentNo, data.customer_id, data.invoice_id || null, data.payment_date, data.amount, data.payment_method, data.reference_no || null, data.notes || null, userId]
    );
    const payment = rows[0];

    // Auto-allocate if invoice_id provided
    if (data.invoice_id) {
      const invRes = await client.query(
        'SELECT amount_due FROM invoices WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL',
        [data.invoice_id, companyId]
      );
      if (invRes.rows.length) {
        const amountDue = parseFloat(invRes.rows[0].amount_due);
        const allocate = Math.min(data.amount, amountDue);
        const newAmountPaid = parseFloat(invRes.rows[0].amount_paid || 0) + allocate;
        const newAmountDue = amountDue - allocate;
        const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';
        await client.query(
          'UPDATE invoices SET amount_paid=$1, amount_due=$2, payment_status=$3, updated_at=NOW() WHERE id=$4',
          [newAmountPaid, newAmountDue, paymentStatus, data.invoice_id]
        );
        const unallocated = data.amount - allocate;
        await client.query(
          'UPDATE customer_payments SET unallocated_amount=$1 WHERE id=$2',
          [unallocated, payment.id]
        );
        payment.unallocated_amount = unallocated;
      }
    }

    return payment;
  });
};

export const getUnallocatedPayments = async (companyId: string, customerId?: string) => {
  const conditions = ['company_id=$1', 'unallocated_amount > 0', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (customerId) { conditions.push('customer_id=$2'); params.push(customerId); }
  const { rows } = await pool.query(
    `SELECT id, payment_no, customer_id, payment_date, amount, unallocated_amount, payment_method FROM customer_payments WHERE ${conditions.join(' AND ')} ORDER BY payment_date ASC`,
    params
  );
  return rows;
};

export const allocatePayment = async (companyId: string, paymentId: string, invoiceId: string, amount: number) => {
  return withTransaction(async (client) => {
    const pmtRes = await client.query(
      'SELECT * FROM customer_payments WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE',
      [paymentId, companyId]
    );
    if (!pmtRes.rows.length) throw new NotFoundError('Customer payment');
    const payment = pmtRes.rows[0];
    if (parseFloat(payment.unallocated_amount) < amount) throw new ConflictError('Insufficient unallocated amount');

    const invRes = await client.query(
      'SELECT * FROM invoices WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE',
      [invoiceId, companyId]
    );
    if (!invRes.rows.length) throw new NotFoundError('Invoice');
    const invoice = invRes.rows[0];
    const amountDue = parseFloat(invoice.amount_due);
    const allocate = Math.min(amount, amountDue);
    const newAmountPaid = parseFloat(invoice.amount_paid || 0) + allocate;
    const newAmountDue = amountDue - allocate;
    const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';

    await client.query(
      'UPDATE invoices SET amount_paid=$1, amount_due=$2, payment_status=$3, updated_at=NOW() WHERE id=$4',
      [newAmountPaid, newAmountDue, paymentStatus, invoiceId]
    );
    const newUnallocated = parseFloat(payment.unallocated_amount) - allocate;
    const { rows } = await client.query(
      'UPDATE customer_payments SET unallocated_amount=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [newUnallocated, paymentId]
    );
    return rows[0];
  });
};

export const deleteCustomerPayment = async (companyId: string, paymentId: string) => {
  const payment = await getCustomerPaymentById(companyId, paymentId);
  if (parseFloat(payment.unallocated_amount) < parseFloat(payment.amount)) {
    throw new ConflictError('Cannot delete a partially or fully allocated payment');
  }
  await pool.query('UPDATE customer_payments SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [paymentId, companyId]);
};
