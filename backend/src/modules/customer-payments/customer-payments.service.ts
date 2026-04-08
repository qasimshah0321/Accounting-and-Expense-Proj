import { pool } from '../../config/database';
import { withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAutoJournalEntry, getSystemAccount } from '../accounting/accounting.service';

export const listCustomerPayments = async (companyId: string, filters: any) => {
  const conditions = ['cp.company_id=?', 'cp.deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.customer_id) { conditions.push(`cp.customer_id=?`); params.push(filters.customer_id); }
  if (filters.date_from) { conditions.push(`cp.payment_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`cp.payment_date<=?`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM customer_payments cp WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT cp.id, cp.payment_no, cp.customer_id, c.name AS customer_name,
            cp.payment_date, cp.amount, cp.unallocated_amount, cp.payment_method, cp.reference_no, cp.notes,
            CASE
              WHEN cp.unallocated_amount <= 0              THEN 'applied'
              WHEN cp.unallocated_amount < cp.amount       THEN 'partial'
              ELSE 'unapplied'
            END AS allocation_status
     FROM customer_payments cp
     LEFT JOIN customers c ON c.id = cp.customer_id
     WHERE ${where} ORDER BY cp.payment_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { payments: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getCustomerPaymentById = async (companyId: string, paymentId: string) => {
  const [rows] = await pool.query(
    `SELECT cp.*, c.name AS customer_name FROM customer_payments cp
     LEFT JOIN customers c ON c.id = cp.customer_id
     WHERE cp.id=? AND cp.company_id=? AND cp.deleted_at IS NULL`,
    [paymentId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Customer payment');
  return (rows as any[])[0];
};

export const createCustomerPayment = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const paymentNo = await generateDocumentNumber(companyId, 'customer_payment', client);
    await client.query(
      `INSERT INTO customer_payments (company_id, payment_no, customer_id, invoice_id, payment_date, amount, unallocated_amount, payment_method, reference_no, notes, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [companyId, paymentNo, data.customer_id, data.invoice_id || null, data.payment_date, data.amount, data.amount, data.payment_method, data.reference_no || null, data.notes || null, userId, userId]
    );
    const [pmtRows] = await client.query('SELECT * FROM customer_payments WHERE company_id=? AND payment_no=? ORDER BY created_at DESC LIMIT 1', [companyId, paymentNo]);
    const payment = (pmtRows as any[])[0];

    // Support both single invoice_id and multiple invoice_ids
    const invoiceIds: string[] = data.invoice_ids?.length
      ? data.invoice_ids
      : data.invoice_id ? [data.invoice_id] : [];

    if (invoiceIds.length > 0) {
      let remaining = data.amount;
      for (const invId of invoiceIds) {
        if (remaining <= 0) break;
        const [invRes] = await client.query(
          'SELECT amount_due, amount_paid FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL',
          [invId, companyId]
        );
        if ((invRes as any[]).length) {
          const amountDue = parseFloat((invRes as any[])[0].amount_due);
          const allocate = Math.min(remaining, amountDue);
          const newAmountPaid = parseFloat((invRes as any[])[0].amount_paid || 0) + allocate;
          const newAmountDue = amountDue - allocate;
          const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';
          await client.query(
            'UPDATE invoices SET amount_paid=?, amount_due=?, payment_status=?, updated_at=NOW() WHERE id=?',
            [newAmountPaid, newAmountDue, paymentStatus, invId]
          );
          remaining -= allocate;
        }
      }
      await client.query(
        'UPDATE customer_payments SET unallocated_amount=? WHERE id=?',
        [remaining, payment.id]
      );
      payment.unallocated_amount = remaining;
    }

    try {
      const cashAccountId = await getSystemAccount(companyId, '1000', client);
      const arAccountId = await getSystemAccount(companyId, '1100', client);
      if (cashAccountId && arAccountId) {
        const methodLabel: Record<string, string> = {
          cash: 'Cash received', check: 'Check received',
          bank_transfer: 'Bank transfer received', card: 'Card payment received', other: 'Payment received',
        };
        const debitDesc = methodLabel[data.payment_method] || 'Payment received';
        await createAutoJournalEntry(companyId, userId, 'System', 'customer_payment', payment.id, paymentNo, data.payment_date, [
          { account_id: cashAccountId, debit: data.amount, credit: 0, description: debitDesc },
          { account_id: arAccountId, debit: 0, credit: data.amount, description: 'Accounts Receivable cleared' },
        ], `Customer payment ${paymentNo}`, client);
      }
    } catch (glErr) {
      console.error('GL auto-post failed for customer payment:', glErr);
    }

    return payment;
  });
};

export const getUnallocatedPayments = async (companyId: string, customerId?: string) => {
  const conditions = ['company_id=?', 'unallocated_amount > 0', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (customerId) { conditions.push('customer_id=?'); params.push(customerId); }
  const [rows] = await pool.query(
    `SELECT id, payment_no, customer_id, payment_date, amount, unallocated_amount, payment_method FROM customer_payments WHERE ${conditions.join(' AND ')} ORDER BY payment_date ASC`,
    params
  );
  return rows as any[];
};

export const allocatePayment = async (companyId: string, paymentId: string, invoiceId: string, amount: number) => {
  return withTransaction(async (client) => {
    const [pmtRes] = await client.query(
      'SELECT * FROM customer_payments WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [paymentId, companyId]
    );
    if (!(pmtRes as any[]).length) throw new NotFoundError('Customer payment');
    const payment = (pmtRes as any[])[0];
    if (parseFloat(payment.unallocated_amount) < amount) throw new ConflictError('Insufficient unallocated amount');

    const [invRes] = await client.query(
      'SELECT * FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [invoiceId, companyId]
    );
    if (!(invRes as any[]).length) throw new NotFoundError('Invoice');
    const invoice = (invRes as any[])[0];
    const amountDue = parseFloat(invoice.amount_due);
    const allocate = Math.min(amount, amountDue);
    const newAmountPaid = parseFloat(invoice.amount_paid || 0) + allocate;
    const newAmountDue = amountDue - allocate;
    const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';

    await client.query(
      'UPDATE invoices SET amount_paid=?, amount_due=?, payment_status=?, updated_at=NOW() WHERE id=?',
      [newAmountPaid, newAmountDue, paymentStatus, invoiceId]
    );
    const newUnallocated = parseFloat(payment.unallocated_amount) - allocate;
    await client.query(
      'UPDATE customer_payments SET unallocated_amount=?, updated_at=NOW() WHERE id=?',
      [newUnallocated, paymentId]
    );
    const [updatedRows] = await client.query('SELECT * FROM customer_payments WHERE id=?', [paymentId]);
    return (updatedRows as any[])[0];
  });
};

export const deleteCustomerPayment = async (companyId: string, paymentId: string) => {
  const payment = await getCustomerPaymentById(companyId, paymentId);
  if (parseFloat(payment.unallocated_amount) < parseFloat(payment.amount)) {
    throw new ConflictError('Cannot delete a partially or fully allocated payment');
  }
  await pool.query('UPDATE customer_payments SET deleted_at=NOW() WHERE id=? AND company_id=?', [paymentId, companyId]);
};
