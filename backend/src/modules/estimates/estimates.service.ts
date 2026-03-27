import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: ['converted'],
  rejected: [],
  expired: [],
  converted: [],
};

const calculateTotals = (lineItems: any[], discountAmount = 0) => {
  const subtotal = lineItems.reduce((s: number, li: any) => s + li.ordered_qty * li.rate, 0);
  const taxAmount = lineItems.reduce((s: number, li: any) => s + li.ordered_qty * li.rate * (li.tax_rate || 0) / 100, 0);
  const grandTotal = subtotal + taxAmount - discountAmount;
  return { subtotal, tax_amount: taxAmount, grand_total: Math.max(0, grandTotal) };
};

export const peekNextEstimateNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='estimate'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'EST-001';
  const { prefix, next_number, padding, include_date } = (rows as any[])[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listEstimates = async (companyId: string, filters: any) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.status) { conditions.push(`status=?`); params.push(filters.status); }
  if (filters.customer_id) { conditions.push(`customer_id=?`); params.push(filters.customer_id); }
  if (filters.search) { conditions.push(`(estimate_no LIKE ? OR customer_name LIKE ?)`); const s = `%${filters.search}%`; params.push(s, s); }
  if (filters.date_from) { conditions.push(`estimate_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`estimate_date<=?`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM estimates WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id, estimate_no, customer_id, customer_name, estimate_date, expiry_date, status, grand_total, converted_to_sales_order, created_at
     FROM estimates WHERE ${where} ORDER BY estimate_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { estimates: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getEstimateById = async (companyId: string, estimateId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM estimates WHERE id=? AND company_id=? AND deleted_at IS NULL', [estimateId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Estimate');
  const estimate = (rows as any[])[0];
  const [items] = await pool.query(
    'SELECT * FROM estimate_line_items WHERE estimate_id=? ORDER BY line_number ASC', [estimateId]
  );
  return { ...estimate, line_items: items as any[] };
};

export const createEstimate = async (companyId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [custRes] = await client.query('SELECT name, billing_address, shipping_address FROM customers WHERE id=? AND company_id=? AND deleted_at IS NULL', [data.customer_id, companyId]);
    if (!(custRes as any[]).length) throw new ValidationError('Customer not found');
    const customer = (custRes as any[])[0];

    const estimateNo = data.estimate_no || await generateDocumentNumber(companyId, 'estimate', client);
    const { subtotal, tax_amount, grand_total } = calculateTotals(data.line_items, data.discount_amount);

    await client.query(
      `INSERT INTO estimates (company_id, estimate_no, customer_id, customer_name, bill_to, ship_to, reference_no, estimate_date, expiry_date, status, subtotal, tax_id, tax_rate, tax_amount, discount_amount, grand_total, terms_and_conditions, notes, internal_notes, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?,?,?,?,?)`,
      [companyId, estimateNo, data.customer_id, customer.name, data.bill_to || customer.billing_address, data.ship_to || customer.shipping_address, data.reference_no || null, data.estimate_date, data.expiry_date || null, subtotal, data.tax_id || null, data.tax_rate || 0, tax_amount, data.discount_amount || 0, grand_total, data.terms_and_conditions || null, data.notes || null, data.internal_notes || null, userId, userId]
    );
    const [estRows] = await client.query('SELECT * FROM estimates WHERE company_id=? AND estimate_no=? ORDER BY created_at DESC LIMIT 1', [companyId, estimateNo]);
    const est = (estRows as any[])[0];

    const lineItems = [];
    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      await client.query(
        `INSERT INTO estimate_line_items (estimate_id, line_number, product_id, sku, description, ordered_qty, unit_of_measure, rate, tax_id, tax_rate, tax_amount)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [est.id, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
      );
    }
    const [itemRows] = await client.query('SELECT * FROM estimate_line_items WHERE estimate_id=? ORDER BY line_number ASC', [est.id]);
    lineItems.push(...(itemRows as any[]));

    await createAuditLog({ company_id: companyId, entity_type: 'estimate', entity_id: est.id, action: 'create', user_id: userId, user_name: userName, description: `Estimate ${estimateNo} created` }, client);
    return { ...est, line_items: lineItems };
  });
};

export const updateEstimate = async (companyId: string, estimateId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [estRes] = await client.query('SELECT * FROM estimates WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [estimateId, companyId]);
    if (!(estRes as any[]).length) throw new NotFoundError('Estimate');
    const est = (estRes as any[])[0];
    if (est.status === 'converted') throw new ConflictError('Cannot edit a converted estimate');

    const fields: string[] = [];
    const values: unknown[] = [];
    const allowed = ['customer_id', 'reference_no', 'estimate_date', 'expiry_date', 'bill_to', 'ship_to', 'tax_id', 'tax_rate', 'discount_amount', 'terms_and_conditions', 'notes', 'internal_notes'];
    allowed.forEach(f => { if (data[f] !== undefined) { fields.push(f); values.push(data[f]); } });

    if (data.line_items) {
      await client.query('DELETE FROM estimate_line_items WHERE estimate_id=?', [estimateId]);
      const { subtotal, tax_amount, grand_total } = calculateTotals(data.line_items, data.discount_amount ?? est.discount_amount);
      fields.push('subtotal', 'tax_amount', 'grand_total');
      values.push(subtotal, tax_amount, grand_total);

      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO estimate_line_items (estimate_id, line_number, product_id, sku, description, ordered_qty, unit_of_measure, rate, tax_id, tax_rate, tax_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [estimateId, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
        );
      }
    }

    if (fields.length) {
      const setClause = fields.map(f => `${f}=?`).join(', ');
      await client.query(`UPDATE estimates SET ${setClause}, updated_by=?, updated_at=NOW() WHERE id=? AND company_id=?`, [...values, userId, estimateId, companyId]);
    }

    await createAuditLog({ company_id: companyId, entity_type: 'estimate', entity_id: estimateId, action: 'update', user_id: userId, user_name: userName, description: `Estimate updated` }, client);
    return getEstimateById(companyId, estimateId);
  });
};

export const deleteEstimate = async (companyId: string, estimateId: string) => {
  const est = await getEstimateById(companyId, estimateId);
  if (est.status !== 'draft') throw new ConflictError('Only draft estimates can be deleted');
  await pool.query('UPDATE estimates SET deleted_at=NOW() WHERE id=? AND company_id=?', [estimateId, companyId]);
};

export const updateStatus = async (companyId: string, estimateId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const [estRes] = await client.query('SELECT * FROM estimates WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [estimateId, companyId]);
    if (!(estRes as any[]).length) throw new NotFoundError('Estimate');
    const est = (estRes as any[])[0];
    const allowed = VALID_STATUS_TRANSITIONS[est.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictError(`Cannot transition from ${est.status} to ${newStatus}`);
    }
    await client.query('UPDATE estimates SET status=?, updated_at=NOW(), updated_by=? WHERE id=?', [newStatus, userId, estimateId]);
    await createStatusHistory({ company_id: companyId, document_type: 'estimate', document_id: estimateId, document_no: est.estimate_no, from_status: est.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...est, status: newStatus };
  });
};

export const convertToSalesOrder = async (companyId: string, estimateId: string, userId: string, userName: string, data: any) => {
  // Generate document number outside the transaction so the sequence increment
  // commits independently — prevents stuck sequence on transaction rollback.
  const soNo = await generateDocumentNumber(companyId, 'sales_order');

  return withTransaction(async (client) => {
    const [estRes] = await client.query('SELECT * FROM estimates WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [estimateId, companyId]);
    if (!(estRes as any[]).length) throw new NotFoundError('Estimate');
    const est = (estRes as any[])[0];
    if (!['draft', 'accepted'].includes(est.status)) {
      throw new ConflictError('Estimate must be in draft or accepted status to convert');
    }
    const [items] = await client.query('SELECT * FROM estimate_line_items WHERE estimate_id=? ORDER BY line_number ASC', [estimateId]);
    const totalOrderedQty = (items as any[]).reduce((s: number, li: any) => s + parseFloat(li.ordered_qty), 0);

    await client.query(
      `INSERT INTO sales_orders (company_id, sales_order_no, customer_id, customer_name, bill_to, ship_to, reference_no, po_number, source_type, estimate_id, order_date, due_date, expected_delivery_date, status, fulfillment_status, subtotal, tax_id, tax_rate, tax_amount, discount_amount, grand_total, total_ordered_qty, notes, terms_and_conditions, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,'estimate',?,?,?,?,'draft','unfulfilled',?,?,?,?,?,?,?,?,?,?,?)`,
      [companyId, soNo, est.customer_id, est.customer_name, est.bill_to, est.ship_to, est.reference_no, data.po_number || null, estimateId, data.order_date, data.due_date || null, data.expected_delivery_date || null, est.subtotal, est.tax_id, est.tax_rate, est.tax_amount, est.discount_amount, est.grand_total, totalOrderedQty, est.notes, est.terms_and_conditions, userId, userId]
    );
    const [soRows] = await client.query('SELECT * FROM sales_orders WHERE company_id=? AND sales_order_no=? ORDER BY created_at DESC LIMIT 1', [companyId, soNo]);
    const so = (soRows as any[])[0];

    for (let i = 0; i < (items as any[]).length; i++) {
      const li = (items as any[])[i];
      await client.query(
        `INSERT INTO sales_order_line_items (sales_order_id, line_number, product_id, sku, description, ordered_qty, delivered_qty, unit_of_measure, rate, tax_id, tax_rate, tax_amount)
         VALUES (?,?,?,?,?,?,0,?,?,?,?,?)`,
        [so.id, i + 1, li.product_id, li.sku, li.description, li.ordered_qty, li.unit_of_measure, li.rate, li.tax_id, li.tax_rate, li.tax_amount]
      );
    }

    if (data.mark_estimate_converted !== false) {
      await client.query('UPDATE estimates SET status=\'converted\', converted_to_sales_order=true, sales_order_id=?, updated_at=NOW() WHERE id=?', [so.id, estimateId]);
    }

    await createAuditLog({ company_id: companyId, entity_type: 'estimate', entity_id: estimateId, action: 'convert', user_id: userId, user_name: userName, description: `Converted to Sales Order ${soNo}` }, client);
    await createAuditLog({ company_id: companyId, entity_type: 'sales_order', entity_id: so.id, action: 'create', user_id: userId, user_name: userName, description: `Created from Estimate ${est.estimate_no}` }, client);

    const [soItems] = await client.query('SELECT * FROM sales_order_line_items WHERE sales_order_id=? ORDER BY line_number ASC', [so.id]);
    return {
      sales_order: { ...so, line_items: soItems as any[] },
      estimate_updated: { id: estimateId, status: 'converted', converted_to_sales_order: true, sales_order_id: so.id },
    };
  });
};

export const duplicateEstimate = async (companyId: string, estimateId: string, userId: string, userName: string) => {
  return withTransaction(async (client) => {
    const [estRes] = await client.query('SELECT * FROM estimates WHERE id=? AND company_id=? AND deleted_at IS NULL', [estimateId, companyId]);
    if (!(estRes as any[]).length) throw new NotFoundError('Estimate');
    const est = (estRes as any[])[0];
    const [items] = await client.query('SELECT * FROM estimate_line_items WHERE estimate_id=? ORDER BY line_number', [estimateId]);

    const newNo = await generateDocumentNumber(companyId, 'estimate', client);
    const today = new Date().toISOString().split('T')[0];

    await client.query(
      `INSERT INTO estimates (company_id, estimate_no, customer_id, customer_name, bill_to, ship_to, reference_no, estimate_date, tax_id, tax_rate, tax_amount, discount_amount, subtotal, grand_total, status, notes, terms_and_conditions, created_by, updated_by)
       SELECT ?,?,customer_id,customer_name,bill_to,ship_to,reference_no,?,tax_id,tax_rate,tax_amount,discount_amount,subtotal,grand_total,'draft',notes,terms_and_conditions,?,? FROM estimates WHERE id=?`,
      [companyId, newNo, today, userId, userId, estimateId]
    );
    const [newEstRows] = await client.query('SELECT * FROM estimates WHERE company_id=? AND estimate_no=? ORDER BY created_at DESC LIMIT 1', [companyId, newNo]);
    const newEst = (newEstRows as any[])[0];

    for (let i = 0; i < (items as any[]).length; i++) {
      const li = (items as any[])[i];
      await client.query(
        `INSERT INTO estimate_line_items (estimate_id,line_number,product_id,sku,description,ordered_qty,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [newEst.id, i + 1, li.product_id, li.sku, li.description, li.ordered_qty, li.unit_of_measure, li.rate, li.tax_id, li.tax_rate, li.tax_amount]
      );
    }

    return getEstimateById(companyId, newEst.id);
  });
};
