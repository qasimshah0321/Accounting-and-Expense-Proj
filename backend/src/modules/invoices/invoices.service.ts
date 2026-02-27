import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';

export const listInvoices = async (companyId: string, filters: any) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.status) { conditions.push(`status=$${idx++}`); params.push(filters.status); }
  if (filters.payment_status) { conditions.push(`payment_status=$${idx++}`); params.push(filters.payment_status); }
  if (filters.customer_id) { conditions.push(`customer_id=$${idx++}`); params.push(filters.customer_id); }
  if (filters.overdue === 'true') { conditions.push(`due_date < CURRENT_DATE AND payment_status != 'paid'`); }
  if (filters.date_from) { conditions.push(`invoice_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`invoice_date<=$${idx++}`); params.push(filters.date_to); }
  if (filters.search) { conditions.push(`(invoice_no ILIKE $${idx} OR customer_name ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM invoices WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,invoice_no,customer_id,customer_name,invoice_date,due_date,status,payment_status,grand_total,amount_paid,amount_due,created_at FROM invoices WHERE ${where} ORDER BY invoice_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { invoices: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getInvoiceById = async (companyId: string, invoiceId: string) => {
  const { rows } = await pool.query('SELECT * FROM invoices WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [invoiceId, companyId]);
  if (!rows.length) throw new NotFoundError('Invoice');
  const { rows: items } = await pool.query('SELECT * FROM invoice_line_items WHERE invoice_id=$1 ORDER BY line_number', [invoiceId]);
  return { ...rows[0], line_items: items };
};

export const createInvoice = async (companyId: string, userId: string, _userName: string, data: any) => {
  return withTransaction(async (client) => {
    const custRes = await client.query('SELECT name,billing_address,shipping_address FROM customers WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [data.customer_id, companyId]);
    if (!custRes.rows.length) throw new ValidationError('Customer not found');
    const cust = custRes.rows[0];

    const invNo = await generateDocumentNumber(companyId, 'invoice', client);
    const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate - (li.discount_per_item || 0), 0);
    const taxAmount = data.line_items.reduce((s: number, li: any) => s + (li.tax_amount || 0), 0);
    const grandTotal = subtotal + taxAmount + (data.shipping_charges || 0) - (data.discount_amount || 0);

    const { rows: [inv] } = await client.query(
      `INSERT INTO invoices (company_id,invoice_no,customer_id,customer_name,bill_to,ship_to,sales_order_id,delivery_note_id,po_number,reference_no,invoice_date,due_date,status,payment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,shipping_charges,grand_total,amount_paid,terms_and_conditions,notes,internal_notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft','unpaid',$13,$14,$15,$16,$17,$18,$19,0,$20,$21,$22,$23,$23) RETURNING *`,
      [companyId, invNo, data.customer_id, cust.name, data.bill_to || cust.billing_address, data.ship_to || cust.shipping_address, data.sales_order_id || null, data.delivery_note_id || null, data.po_number || null, data.reference_no || null, data.invoice_date, data.due_date, subtotal, data.tax_id || null, data.tax_rate || 0, taxAmount, data.discount_amount || 0, data.shipping_charges || 0, grandTotal, data.terms_and_conditions || null, data.notes || null, data.internal_notes || null, userId]
    );

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      await client.query(
        `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,discount_per_item,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [inv.id, i + 1, li.product_id || null, li.sku || null, li.description, li.quantity, li.unit_of_measure || 'pcs', li.rate, li.discount_per_item || 0, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
      );
    }

    const { rows: invItems } = await client.query('SELECT * FROM invoice_line_items WHERE invoice_id=$1 ORDER BY line_number', [inv.id]);
    return { ...inv, line_items: invItems };
  });
};

export const updateInvoice = async (companyId: string, invoiceId: string, userId: string, _userName: string, data: any) => {
  const inv = await getInvoiceById(companyId, invoiceId);
  if (inv.status !== 'draft') throw new ConflictError('Only draft invoices can be edited');

  return withTransaction(async (client) => {
    if (data.line_items) {
      await client.query('DELETE FROM invoice_line_items WHERE invoice_id=$1', [invoiceId]);
      const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate - (li.discount_per_item || 0), 0);
      const taxAmount = data.line_items.reduce((s: number, li: any) => s + (li.tax_amount || 0), 0);
      const grandTotal = subtotal + taxAmount + (data.shipping_charges || inv.shipping_charges || 0) - (data.discount_amount || inv.discount_amount || 0);
      await client.query('UPDATE invoices SET subtotal=$1,tax_amount=$2,grand_total=$3,updated_by=$4,updated_at=NOW() WHERE id=$5', [subtotal, taxAmount, grandTotal, userId, invoiceId]);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,discount_per_item,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [invoiceId, i + 1, li.product_id || null, li.sku || null, li.description, li.quantity, li.unit_of_measure || 'pcs', li.rate, li.discount_per_item || 0, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
        );
      }
    }
    return getInvoiceById(companyId, invoiceId);
  });
};

export const deleteInvoice = async (companyId: string, invoiceId: string) => {
  const inv = await getInvoiceById(companyId, invoiceId);
  if (inv.status !== 'draft') throw new ConflictError('Only draft invoices can be deleted');
  await pool.query('UPDATE invoices SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [invoiceId, companyId]);
};

export const updateStatus = async (companyId: string, invoiceId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const invRes = await client.query('SELECT * FROM invoices WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [invoiceId, companyId]);
    if (!invRes.rows.length) throw new NotFoundError('Invoice');
    const inv = invRes.rows[0];
    await client.query('UPDATE invoices SET status=$1,updated_by=$2,updated_at=NOW() WHERE id=$3', [newStatus, userId, invoiceId]);
    await createStatusHistory({ company_id: companyId, document_type: 'invoice', document_id: invoiceId, document_no: inv.invoice_no, from_status: inv.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...inv, status: newStatus };
  });
};

export const recordPayment = async (companyId: string, invoiceId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const invRes = await client.query('SELECT * FROM invoices WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [invoiceId, companyId]);
    if (!invRes.rows.length) throw new NotFoundError('Invoice');
    const inv = invRes.rows[0];
    const amountDue = parseFloat(inv.grand_total) - parseFloat(inv.amount_paid);

    if (data.amount > amountDue + 0.01) throw new ValidationError(`Payment amount (${data.amount}) exceeds amount due (${amountDue})`);

    const paymentNo = await generateDocumentNumber(companyId, 'payment', client);
    const { rows: [payment] } = await client.query(
      `INSERT INTO customer_payments (company_id,payment_no,customer_id,customer_name,payment_date,payment_method,bank_name,bank_account,transaction_reference,check_number,amount,invoice_id,allocated_amount,status,deposit_to_account,notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'received',$14,$15,$16,$16) RETURNING *`,
      [companyId, paymentNo, inv.customer_id, inv.customer_name, data.payment_date, data.payment_method, data.bank_name || null, data.bank_account || null, data.transaction_reference || null, data.check_number || null, data.amount, invoiceId, data.amount, data.deposit_to_account || null, data.notes || null, userId]
    );

    const newAmountPaid = parseFloat(inv.amount_paid) + data.amount;
    const newAmountDue = parseFloat(inv.grand_total) - newAmountPaid;
    const paymentStatus = newAmountDue <= 0.01 ? 'paid' : 'partially_paid';
    const newStatus = newAmountDue <= 0.01 ? 'paid' : 'partially_paid';

    await client.query('UPDATE invoices SET amount_paid=$1,payment_status=$2,status=$3,updated_by=$4,updated_at=NOW() WHERE id=$5', [newAmountPaid, paymentStatus, newStatus, userId, invoiceId]);
    await createAuditLog({ company_id: companyId, entity_type: 'invoice', entity_id: invoiceId, action: 'payment', user_id: userId, user_name: userName, description: `Payment of ${data.amount} recorded` }, client);

    return { payment, invoice_updated: { id: invoiceId, status: newStatus, payment_status: paymentStatus, amount_paid: newAmountPaid, amount_due: Math.max(0, newAmountDue) } };
  });
};

export const getInvoicePayments = async (companyId: string, invoiceId: string, pagination: any) => {
  await getInvoiceById(companyId, invoiceId);
  const countRes = await pool.query('SELECT COUNT(*) FROM customer_payments WHERE company_id=$1 AND invoice_id=$2 AND deleted_at IS NULL', [companyId, invoiceId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT * FROM customer_payments WHERE company_id=$1 AND invoice_id=$2 AND deleted_at IS NULL ORDER BY payment_date DESC LIMIT $3 OFFSET $4`,
    [companyId, invoiceId, pagination.limit, pagination.offset]
  );
  return { payments: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getOverdueInvoices = async (companyId: string, filters: any) => {
  const countRes = await pool.query(`SELECT COUNT(*) FROM invoices WHERE company_id=$1 AND due_date < CURRENT_DATE AND payment_status != 'paid' AND deleted_at IS NULL`, [companyId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,invoice_no,customer_name,invoice_date,due_date,grand_total,amount_paid,amount_due,status FROM invoices WHERE company_id=$1 AND due_date < CURRENT_DATE AND payment_status != 'paid' AND deleted_at IS NULL ORDER BY due_date ASC LIMIT $2 OFFSET $3`,
    [companyId, filters.limit, filters.offset]
  );
  return { invoices: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};
