import { pool } from '../../config/database';
import { withTransaction } from '../../config/database';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';

export const listVendorPayments = async (companyId: string, filters: any) => {
  const conditions = ['vp.company_id=$1', 'vp.deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.vendor_id) { conditions.push(`vp.vendor_id=$${idx++}`); params.push(filters.vendor_id); }
  if (filters.date_from) { conditions.push(`vp.payment_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`vp.payment_date<=$${idx++}`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM vendor_payments vp WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT vp.id, vp.payment_no, vp.vendor_id, v.name AS vendor_name, vp.payment_date, vp.amount, vp.unallocated_amount, vp.payment_method, vp.reference_no
     FROM vendor_payments vp
     LEFT JOIN vendors v ON v.id = vp.vendor_id
     WHERE ${where} ORDER BY vp.payment_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { payments: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getVendorPaymentById = async (companyId: string, paymentId: string) => {
  const { rows } = await pool.query(
    `SELECT vp.*, v.name AS vendor_name FROM vendor_payments vp
     LEFT JOIN vendors v ON v.id = vp.vendor_id
     WHERE vp.id=$1 AND vp.company_id=$2 AND vp.deleted_at IS NULL`,
    [paymentId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Vendor payment');
  return rows[0];
};

export const createVendorPayment = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const paymentNo = await generateDocumentNumber(companyId, 'vendor_payment', client);
    const { rows } = await client.query(
      `INSERT INTO vendor_payments (company_id, payment_no, vendor_id, bill_id, payment_date, amount, unallocated_amount, payment_method, reference_no, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,$10,$10) RETURNING *`,
      [companyId, paymentNo, data.vendor_id, data.bill_id || null, data.payment_date, data.amount, data.payment_method, data.reference_no || null, data.notes || null, userId]
    );
    const payment = rows[0];

    // Auto-allocate if bill_id provided
    if (data.bill_id) {
      const billRes = await client.query(
        'SELECT * FROM bills WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL',
        [data.bill_id, companyId]
      );
      if (billRes.rows.length) {
        const bill = billRes.rows[0];
        const amountDue = parseFloat(bill.amount_due);
        const allocate = Math.min(data.amount, amountDue);
        const newAmountPaid = parseFloat(bill.amount_paid || 0) + allocate;
        const newAmountDue = amountDue - allocate;
        const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';
        await client.query(
          'UPDATE bills SET amount_paid=$1, amount_due=$2, payment_status=$3, updated_at=NOW() WHERE id=$4',
          [newAmountPaid, newAmountDue, paymentStatus, data.bill_id]
        );
        const unallocated = data.amount - allocate;
        await client.query(
          'UPDATE vendor_payments SET unallocated_amount=$1 WHERE id=$2',
          [unallocated, payment.id]
        );
        payment.unallocated_amount = unallocated;
      }
    }

    return payment;
  });
};

export const getUnallocatedVendorPayments = async (companyId: string, vendorId?: string) => {
  const conditions = ['company_id=$1', 'unallocated_amount > 0', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (vendorId) { conditions.push('vendor_id=$2'); params.push(vendorId); }
  const { rows } = await pool.query(
    `SELECT id, payment_no, vendor_id, payment_date, amount, unallocated_amount, payment_method FROM vendor_payments WHERE ${conditions.join(' AND ')} ORDER BY payment_date ASC`,
    params
  );
  return rows;
};

export const allocateVendorPayment = async (companyId: string, paymentId: string, billId: string, amount: number) => {
  return withTransaction(async (client) => {
    const pmtRes = await client.query(
      'SELECT * FROM vendor_payments WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE',
      [paymentId, companyId]
    );
    if (!pmtRes.rows.length) throw new NotFoundError('Vendor payment');
    const payment = pmtRes.rows[0];
    if (parseFloat(payment.unallocated_amount) < amount) throw new ConflictError('Insufficient unallocated amount');

    const billRes = await client.query(
      'SELECT * FROM bills WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE',
      [billId, companyId]
    );
    if (!billRes.rows.length) throw new NotFoundError('Bill');
    const bill = billRes.rows[0];
    const amountDue = parseFloat(bill.amount_due);
    const allocate = Math.min(amount, amountDue);
    const newAmountPaid = parseFloat(bill.amount_paid || 0) + allocate;
    const newAmountDue = amountDue - allocate;
    const paymentStatus = newAmountDue <= 0 ? 'paid' : 'partially_paid';

    await client.query(
      'UPDATE bills SET amount_paid=$1, amount_due=$2, payment_status=$3, updated_at=NOW() WHERE id=$4',
      [newAmountPaid, newAmountDue, paymentStatus, billId]
    );
    const newUnallocated = parseFloat(payment.unallocated_amount) - allocate;
    const { rows } = await client.query(
      'UPDATE vendor_payments SET unallocated_amount=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [newUnallocated, paymentId]
    );
    return rows[0];
  });
};

export const deleteVendorPayment = async (companyId: string, paymentId: string) => {
  const payment = await getVendorPaymentById(companyId, paymentId);
  if (parseFloat(payment.unallocated_amount) < parseFloat(payment.amount)) {
    throw new ConflictError('Cannot delete a partially or fully allocated payment');
  }
  await pool.query('UPDATE vendor_payments SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [paymentId, companyId]);
};
