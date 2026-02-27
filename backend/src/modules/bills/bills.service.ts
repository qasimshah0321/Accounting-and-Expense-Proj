import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';

export const listBills = async (companyId: string, filters: any) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.status) { conditions.push(`status=$${idx++}`); params.push(filters.status); }
  if (filters.payment_status) { conditions.push(`payment_status=$${idx++}`); params.push(filters.payment_status); }
  if (filters.vendor_id) { conditions.push(`vendor_id=$${idx++}`); params.push(filters.vendor_id); }
  if (filters.overdue === 'true') { conditions.push(`due_date < CURRENT_DATE AND payment_status != 'paid'`); }
  if (filters.search) { conditions.push(`(bill_no ILIKE $${idx} OR vendor_name ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM bills WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,bill_no,vendor_id,vendor_name,bill_date,due_date,status,payment_status,grand_total,amount_paid,amount_due FROM bills WHERE ${where} ORDER BY bill_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { bills: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getBillById = async (companyId: string, billId: string) => {
  const { rows } = await pool.query('SELECT * FROM bills WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [billId, companyId]);
  if (!rows.length) throw new NotFoundError('Bill');
  const { rows: items } = await pool.query('SELECT * FROM bill_line_items WHERE bill_id=$1 ORDER BY line_number', [billId]);
  return { ...rows[0], line_items: items };
};

export const createBill = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const vendRes = await client.query('SELECT name,address FROM vendors WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [data.vendor_id, companyId]);
    if (!vendRes.rows.length) throw new ValidationError('Vendor not found');
    const vendor = vendRes.rows[0];

    const billNo = await generateDocumentNumber(companyId, 'bill', client);
    const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate, 0);
    const taxAmount = data.line_items.reduce((s: number, li: any) => s + (li.tax_amount || 0), 0);
    const grandTotal = subtotal + taxAmount + (data.shipping_charges || 0) - (data.discount_amount || 0);

    const { rows: [bill] } = await client.query(
      `INSERT INTO bills (company_id,bill_no,vendor_id,vendor_name,vendor_address,vendor_invoice_no,reference_no,bill_date,due_date,status,payment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,shipping_charges,grand_total,amount_paid,notes,internal_notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft','unpaid',$10,$11,$12,$13,$14,$15,$16,0,$17,$18,$19,$19) RETURNING *`,
      [companyId, billNo, data.vendor_id, vendor.name, vendor.address, data.vendor_invoice_no || null, data.reference_no || null, data.bill_date, data.due_date, subtotal, data.tax_id || null, data.tax_rate || 0, taxAmount, data.discount_amount || 0, data.shipping_charges || 0, grandTotal, data.notes || null, data.internal_notes || null, userId]
    );

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      await client.query(
        `INSERT INTO bill_line_items (bill_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [bill.id, i + 1, li.product_id || null, li.sku || null, li.description, li.quantity, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
      );
    }

    const { rows: billItems } = await client.query('SELECT * FROM bill_line_items WHERE bill_id=$1 ORDER BY line_number', [bill.id]);
    return { ...bill, line_items: billItems };
  });
};

export const updateBill = async (companyId: string, billId: string, userId: string, data: any) => {
  const bill = await getBillById(companyId, billId);
  if (bill.status !== 'draft') throw new ConflictError('Only draft bills can be edited');
  return withTransaction(async (client) => {
    if (data.line_items) {
      await client.query('DELETE FROM bill_line_items WHERE bill_id=$1', [billId]);
      const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate, 0);
      const taxAmount = data.line_items.reduce((s: number, li: any) => s + (li.tax_amount || 0), 0);
      const grandTotal = subtotal + taxAmount + (data.shipping_charges || bill.shipping_charges || 0) - (data.discount_amount || bill.discount_amount || 0);
      await client.query('UPDATE bills SET subtotal=$1,tax_amount=$2,grand_total=$3,updated_by=$4,updated_at=NOW() WHERE id=$5', [subtotal, taxAmount, grandTotal, userId, billId]);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO bill_line_items (bill_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [billId, i + 1, li.product_id || null, li.sku || null, li.description, li.quantity, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
        );
      }
    }
    return getBillById(companyId, billId);
  });
};

export const deleteBill = async (companyId: string, billId: string) => {
  const bill = await getBillById(companyId, billId);
  if (bill.status !== 'draft') throw new ConflictError('Only draft bills can be deleted');
  await pool.query('UPDATE bills SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [billId, companyId]);
};

export const updateStatus = async (companyId: string, billId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const billRes = await client.query('SELECT * FROM bills WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [billId, companyId]);
    if (!billRes.rows.length) throw new NotFoundError('Bill');
    const bill = billRes.rows[0];
    await client.query('UPDATE bills SET status=$1,updated_by=$2,updated_at=NOW() WHERE id=$3', [newStatus, userId, billId]);
    await createStatusHistory({ company_id: companyId, document_type: 'bill', document_id: billId, document_no: bill.bill_no, from_status: bill.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...bill, status: newStatus };
  });
};

export const recordPayment = async (companyId: string, billId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const billRes = await client.query('SELECT * FROM bills WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [billId, companyId]);
    if (!billRes.rows.length) throw new NotFoundError('Bill');
    const bill = billRes.rows[0];
    const amountDue = parseFloat(bill.grand_total) - parseFloat(bill.amount_paid);
    if (data.amount > amountDue + 0.01) throw new ValidationError(`Payment exceeds amount due (${amountDue})`);

    const payNo = await generateDocumentNumber(companyId, 'vendor_payment', client);
    const { rows: [payment] } = await client.query(
      `INSERT INTO vendor_payments (company_id,payment_no,vendor_id,vendor_name,payment_date,payment_method,bank_name,bank_account,transaction_reference,check_number,amount,bill_id,allocated_amount,status,payment_from_account,notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'paid',$14,$15,$16,$16) RETURNING *`,
      [companyId, payNo, bill.vendor_id, bill.vendor_name, data.payment_date, data.payment_method, data.bank_name || null, data.bank_account || null, data.transaction_reference || null, data.check_number || null, data.amount, billId, data.amount, data.payment_from_account || null, data.notes || null, userId]
    );

    const newAmountPaid = parseFloat(bill.amount_paid) + data.amount;
    const newAmountDue = parseFloat(bill.grand_total) - newAmountPaid;
    const paymentStatus = newAmountDue <= 0.01 ? 'paid' : 'partially_paid';
    await client.query('UPDATE bills SET amount_paid=$1,payment_status=$2,status=$3,updated_by=$4,updated_at=NOW() WHERE id=$5', [newAmountPaid, paymentStatus, paymentStatus, userId, billId]);

    return { payment, bill_updated: { id: billId, payment_status: paymentStatus, amount_paid: newAmountPaid, amount_due: Math.max(0, newAmountDue) } };
  });
};

export const getBillPayments = async (companyId: string, billId: string, pagination: any) => {
  await getBillById(companyId, billId);
  const countRes = await pool.query('SELECT COUNT(*) FROM vendor_payments WHERE company_id=$1 AND bill_id=$2 AND deleted_at IS NULL', [companyId, billId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT * FROM vendor_payments WHERE company_id=$1 AND bill_id=$2 AND deleted_at IS NULL ORDER BY payment_date DESC LIMIT $3 OFFSET $4`,
    [companyId, billId, pagination.limit, pagination.offset]
  );
  return { payments: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getOverdueBills = async (companyId: string, filters: any) => {
  const countRes = await pool.query(`SELECT COUNT(*) FROM bills WHERE company_id=$1 AND due_date < CURRENT_DATE AND payment_status != 'paid' AND deleted_at IS NULL`, [companyId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,bill_no,vendor_name,bill_date,due_date,grand_total,amount_paid,amount_due,status FROM bills WHERE company_id=$1 AND due_date < CURRENT_DATE AND payment_status != 'paid' AND deleted_at IS NULL ORDER BY due_date ASC LIMIT $2 OFFSET $3`,
    [companyId, filters.limit, filters.offset]
  );
  return { bills: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};
