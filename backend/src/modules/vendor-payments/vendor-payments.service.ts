import { pool } from '../../config/database';
import { withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAutoJournalEntry, getSystemAccount } from '../accounting/accounting.service';

export const listVendorPayments = async (companyId: string, filters: any) => {
  const conditions = ['vp.company_id=?', 'vp.deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.vendor_id) { conditions.push(`vp.vendor_id=?`); params.push(filters.vendor_id); }
  if (filters.date_from) { conditions.push(`vp.payment_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`vp.payment_date<=?`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM vendor_payments vp WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT vp.id, vp.payment_no, vp.vendor_id, v.name AS vendor_name, vp.payment_date, vp.amount, vp.unallocated_amount, vp.payment_method, vp.reference_no
     FROM vendor_payments vp
     LEFT JOIN vendors v ON v.id = vp.vendor_id
     WHERE ${where} ORDER BY vp.payment_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { payments: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getVendorPaymentById = async (companyId: string, paymentId: string) => {
  const [rows] = await pool.query(
    `SELECT vp.*, v.name AS vendor_name FROM vendor_payments vp
     LEFT JOIN vendors v ON v.id = vp.vendor_id
     WHERE vp.id=? AND vp.company_id=? AND vp.deleted_at IS NULL`,
    [paymentId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Vendor payment');
  return (rows as any[])[0];
};

export const createVendorPayment = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const paymentNo = await generateDocumentNumber(companyId, 'vendor_payment', client);
    await client.query(
      `INSERT INTO vendor_payments (company_id, payment_no, vendor_id, bill_id, payment_date, amount, unallocated_amount, payment_method, reference_no, notes, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [companyId, paymentNo, data.vendor_id, data.bill_id || null, data.payment_date, data.amount, data.amount, data.payment_method, data.reference_no || null, data.notes || null, userId, userId]
    );
    const [pmtRows] = await client.query('SELECT * FROM vendor_payments WHERE company_id=? AND payment_no=? ORDER BY created_at DESC LIMIT 1', [companyId, paymentNo]);
    const payment = (pmtRows as any[])[0];

    // Auto-allocate if bill_id provided
    if (data.bill_id) {
      const [billRes] = await client.query(
        'SELECT * FROM bills WHERE id=? AND company_id=? AND deleted_at IS NULL',
        [data.bill_id, companyId]
      );
      if ((billRes as any[]).length) {
        const bill = (billRes as any[])[0];
        const amountDue = parseFloat(bill.amount_due);
        const allocate = Math.min(data.amount, amountDue);
        const newAmountPaid = parseFloat(bill.amount_paid || 0) + allocate;
        const newAmountDue = amountDue - allocate;
        const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';
        await client.query(
          'UPDATE bills SET amount_paid=?, amount_due=?, payment_status=?, updated_at=NOW() WHERE id=?',
          [newAmountPaid, newAmountDue, paymentStatus, data.bill_id]
        );
        const unallocated = data.amount - allocate;
        await client.query(
          'UPDATE vendor_payments SET unallocated_amount=? WHERE id=?',
          [unallocated, payment.id]
        );
        payment.unallocated_amount = unallocated;
      }
    }

    // GL auto-post: DR Accounts Payable, CR Cash
    try {
      const apAccountId = await getSystemAccount(companyId, '2000', client);
      const cashAccountId = await getSystemAccount(companyId, '1000', client);
      if (apAccountId && cashAccountId) {
        await createAutoJournalEntry(companyId, userId, 'System', 'vendor_payment', payment.id, paymentNo, data.payment_date, [
          { account_id: apAccountId, debit: data.amount, credit: 0, description: 'Accounts Payable' },
          { account_id: cashAccountId, debit: 0, credit: data.amount, description: 'Cash payment' },
        ], `Vendor payment ${paymentNo}`, client);
      }
    } catch (glErr) {
      console.error('GL auto-post failed for vendor payment:', glErr);
    }

    return payment;
  });
};

export const getUnallocatedVendorPayments = async (companyId: string, vendorId?: string) => {
  const conditions = ['company_id=?', 'unallocated_amount > 0', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (vendorId) { conditions.push('vendor_id=?'); params.push(vendorId); }
  const [rows] = await pool.query(
    `SELECT id, payment_no, vendor_id, payment_date, amount, unallocated_amount, payment_method FROM vendor_payments WHERE ${conditions.join(' AND ')} ORDER BY payment_date ASC`,
    params
  );
  return rows as any[];
};

export const allocateVendorPayment = async (companyId: string, paymentId: string, billId: string, amount: number) => {
  return withTransaction(async (client) => {
    const [pmtRes] = await client.query(
      'SELECT * FROM vendor_payments WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [paymentId, companyId]
    );
    if (!(pmtRes as any[]).length) throw new NotFoundError('Vendor payment');
    const payment = (pmtRes as any[])[0];
    if (parseFloat(payment.unallocated_amount) < amount) throw new ConflictError('Insufficient unallocated amount');

    const [billRes] = await client.query(
      'SELECT * FROM bills WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [billId, companyId]
    );
    if (!(billRes as any[]).length) throw new NotFoundError('Bill');
    const bill = (billRes as any[])[0];
    const amountDue = parseFloat(bill.amount_due);
    const allocate = Math.min(amount, amountDue);
    const newAmountPaid = parseFloat(bill.amount_paid || 0) + allocate;
    const newAmountDue = amountDue - allocate;
    const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';

    await client.query(
      'UPDATE bills SET amount_paid=?, amount_due=?, payment_status=?, updated_at=NOW() WHERE id=?',
      [newAmountPaid, newAmountDue, paymentStatus, billId]
    );
    const newUnallocated = parseFloat(payment.unallocated_amount) - allocate;
    await client.query(
      'UPDATE vendor_payments SET unallocated_amount=?, updated_at=NOW() WHERE id=?',
      [newUnallocated, paymentId]
    );
    const [updatedRows] = await client.query('SELECT * FROM vendor_payments WHERE id=?', [paymentId]);
    return (updatedRows as any[])[0];
  });
};

export const deleteVendorPayment = async (companyId: string, paymentId: string) => {
  const payment = await getVendorPaymentById(companyId, paymentId);
  if (parseFloat(payment.unallocated_amount) < parseFloat(payment.amount)) {
    throw new ConflictError('Cannot delete a partially or fully allocated payment');
  }
  await pool.query('UPDATE vendor_payments SET deleted_at=NOW() WHERE id=? AND company_id=?', [paymentId, companyId]);
};
