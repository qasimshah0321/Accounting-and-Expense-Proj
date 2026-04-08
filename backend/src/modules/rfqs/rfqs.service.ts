import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog } from '../../services/auditService';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['quoted', 'rejected', 'cancelled'],
  quoted: ['accepted', 'rejected'],
  accepted: ['cancelled'],
  rejected: [],
  cancelled: [],
};

const calcTotals = (items: any[]) => {
  const subtotal = items.reduce((s: number, li: any) => s + li.ordered_qty * li.rate, 0);
  const taxAmount = items.reduce((s: number, li: any) => s + li.ordered_qty * li.rate * (li.tax_rate || 0) / 100, 0);
  return { subtotal, tax_amount: taxAmount, grand_total: subtotal + taxAmount };
};

export const peekNextRFQNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='rfq'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'RFQ-0001';
  const { prefix, next_number, padding, include_date } = (rows as any[])[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listRFQs = async (companyId: string, filters: any) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  if (filters.status) { conditions.push('status=?'); params.push(filters.status); }
  if (filters.vendor_id) { conditions.push('vendor_id=?'); params.push(filters.vendor_id); }
  if (filters.search) {
    conditions.push('(rfq_no LIKE ? OR vendor_name LIKE ?)');
    const s = `%${filters.search}%`; params.push(s, s);
  }
  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM rfqs WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id, rfq_no, vendor_id, vendor_name, rfq_date, required_by_date, status, grand_total, converted_to_po, created_at
     FROM rfqs WHERE ${where} ORDER BY rfq_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { rfqs: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getRFQById = async (companyId: string, rfqId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM rfqs WHERE id=? AND company_id=? AND deleted_at IS NULL', [rfqId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('RFQ');
  const [items] = await pool.query(
    'SELECT * FROM rfq_line_items WHERE rfq_id=? ORDER BY line_number ASC', [rfqId]
  );
  return { ...(rows as any[])[0], line_items: items as any[] };
};

export const createRFQ = async (companyId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [vendRows] = await client.query(
      'SELECT name, address, city, state, postal_code, country FROM vendors WHERE id=? AND company_id=? AND deleted_at IS NULL',
      [data.vendor_id, companyId]
    );
    if (!(vendRows as any[]).length) throw new ValidationError('Vendor not found');
    const vend = (vendRows as any[])[0];
    const vendorAddress = [vend.address, vend.city, vend.state, vend.postal_code, vend.country].filter(Boolean).join(', ');

    const rfqNo = data.rfq_no || await generateDocumentNumber(companyId, 'rfq', client);
    const { subtotal, tax_amount, grand_total } = calcTotals(data.line_items);

    await client.query(
      `INSERT INTO rfqs (company_id, rfq_no, vendor_id, vendor_name, vendor_address, reference_no, rfq_date, required_by_date, status, subtotal, tax_id, tax_rate, tax_amount, grand_total, notes, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?,?)`,
      [companyId, rfqNo, data.vendor_id, vend.name, vendorAddress, data.reference_no || null, data.rfq_date, data.required_by_date || null, subtotal, data.tax_id || null, data.tax_rate || 0, tax_amount, grand_total, data.notes || null, userId, userId]
    );
    const [rfqRows] = await client.query(
      'SELECT * FROM rfqs WHERE company_id=? AND rfq_no=? ORDER BY created_at DESC LIMIT 1', [companyId, rfqNo]
    );
    const rfq = (rfqRows as any[])[0];

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      await client.query(
        `INSERT INTO rfq_line_items (rfq_id, line_number, product_id, sku, description, ordered_qty, unit_of_measure, rate, tax_id, tax_rate, tax_amount)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [rfq.id, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
      );
    }
    const [itemRows] = await client.query('SELECT * FROM rfq_line_items WHERE rfq_id=? ORDER BY line_number ASC', [rfq.id]);
    await createAuditLog({ company_id: companyId, entity_type: 'rfq', entity_id: rfq.id, action: 'create', user_id: userId, user_name: userName, description: `RFQ ${rfqNo} created` }, client);
    return { ...rfq, line_items: itemRows as any[] };
  });
};

export const updateRFQ = async (companyId: string, rfqId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [rfqRes] = await client.query('SELECT * FROM rfqs WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [rfqId, companyId]);
    if (!(rfqRes as any[]).length) throw new NotFoundError('RFQ');
    const rfq = (rfqRes as any[])[0];
    if (!['draft', 'sent'].includes(rfq.status)) throw new ConflictError('Only draft or sent RFQs can be edited');

    const fields: string[] = [];
    const values: unknown[] = [];
    const allowed = ['vendor_id', 'reference_no', 'rfq_date', 'required_by_date', 'tax_id', 'tax_rate', 'notes'];
    allowed.forEach(f => { if (data[f] !== undefined) { fields.push(f); values.push(data[f]); } });

    if (data.line_items) {
      await client.query('DELETE FROM rfq_line_items WHERE rfq_id=?', [rfqId]);
      const { subtotal, tax_amount, grand_total } = calcTotals(data.line_items);
      fields.push('subtotal', 'tax_amount', 'grand_total');
      values.push(subtotal, tax_amount, grand_total);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO rfq_line_items (rfq_id, line_number, product_id, sku, description, ordered_qty, unit_of_measure, rate, tax_id, tax_rate, tax_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [rfqId, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
        );
      }
    }
    if (fields.length) {
      const setClause = fields.map(f => `${f}=?`).join(', ');
      await client.query(`UPDATE rfqs SET ${setClause}, updated_by=?, updated_at=NOW() WHERE id=? AND company_id=?`, [...values, userId, rfqId, companyId]);
    }
    await createAuditLog({ company_id: companyId, entity_type: 'rfq', entity_id: rfqId, action: 'update', user_id: userId, user_name: userName, description: 'RFQ updated' }, client);
    return getRFQById(companyId, rfqId);
  });
};

export const deleteRFQ = async (companyId: string, rfqId: string) => {
  const rfq = await getRFQById(companyId, rfqId);
  if (rfq.status !== 'draft') throw new ConflictError('Only draft RFQs can be deleted');
  await pool.query('UPDATE rfqs SET deleted_at=NOW() WHERE id=? AND company_id=?', [rfqId, companyId]);
};

export const updateStatus = async (companyId: string, rfqId: string, userId: string, userName: string, newStatus: string) => {
  return withTransaction(async (client) => {
    const [rfqRes] = await client.query('SELECT * FROM rfqs WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [rfqId, companyId]);
    if (!(rfqRes as any[]).length) throw new NotFoundError('RFQ');
    const rfq = (rfqRes as any[])[0];
    const allowed = VALID_TRANSITIONS[rfq.status] || [];
    if (!allowed.includes(newStatus)) throw new ConflictError(`Cannot transition from ${rfq.status} to ${newStatus}`);
    await client.query('UPDATE rfqs SET status=?, updated_at=NOW(), updated_by=? WHERE id=?', [newStatus, userId, rfqId]);
    await createAuditLog({ company_id: companyId, entity_type: 'rfq', entity_id: rfqId, action: 'status_change', user_id: userId, user_name: userName, description: `RFQ status changed to ${newStatus}` }, client);
    return { ...rfq, status: newStatus };
  });
};

export const convertToPO = async (companyId: string, rfqId: string, userId: string, userName: string, data: any) => {
  const poNo = await generateDocumentNumber(companyId, 'purchase_order');
  return withTransaction(async (client) => {
    const [rfqRes] = await client.query('SELECT * FROM rfqs WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [rfqId, companyId]);
    if (!(rfqRes as any[]).length) throw new NotFoundError('RFQ');
    const rfq = (rfqRes as any[])[0];
    if (!['quoted', 'accepted'].includes(rfq.status)) throw new ConflictError('RFQ must be quoted or accepted to convert to PO');

    const [items] = await client.query('SELECT * FROM rfq_line_items WHERE rfq_id=? ORDER BY line_number ASC', [rfqId]);
    const totalOrderedQty = (items as any[]).reduce((s: number, li: any) => s + parseFloat(li.ordered_qty), 0);

    await client.query(
      `INSERT INTO purchase_orders (company_id, purchase_order_no, vendor_id, vendor_name, vendor_address, reference_no, order_date, expected_delivery_date, due_date, status, receipt_status, subtotal, tax_id, tax_rate, tax_amount, discount_amount, grand_total, total_ordered_qty, total_received_qty, notes, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,'draft','unreceived',?,?,?,?,?,?,?,0,?,?,?)`,
      [companyId, poNo, rfq.vendor_id, rfq.vendor_name, rfq.vendor_address, rfq.reference_no, data.order_date, data.expected_delivery_date || null, data.due_date || null, rfq.subtotal, rfq.tax_id, rfq.tax_rate, rfq.tax_amount, 0, rfq.grand_total, totalOrderedQty, rfq.notes || null, userId, userId]
    );
    const [poRows] = await client.query('SELECT * FROM purchase_orders WHERE company_id=? AND purchase_order_no=? ORDER BY created_at DESC LIMIT 1', [companyId, poNo]);
    const po = (poRows as any[])[0];

    for (let i = 0; i < (items as any[]).length; i++) {
      const li = (items as any[])[i];
      await client.query(
        `INSERT INTO purchase_order_line_items (purchase_order_id, line_number, product_id, sku, description, ordered_qty, received_qty, unit_of_measure, rate, tax_id, tax_rate, tax_amount)
         VALUES (?,?,?,?,?,?,0,?,?,?,?,?)`,
        [po.id, i + 1, li.product_id, li.sku, li.description, li.ordered_qty, li.unit_of_measure, li.rate, li.tax_id, li.tax_rate, li.tax_amount]
      );
    }

    await client.query('UPDATE rfqs SET converted_to_po=TRUE, purchase_order_id=?, status=\'accepted\', updated_at=NOW() WHERE id=?', [po.id, rfqId]);
    await createAuditLog({ company_id: companyId, entity_type: 'rfq', entity_id: rfqId, action: 'convert', user_id: userId, user_name: userName, description: `Converted to PO ${poNo}` }, client);
    return { purchase_order_no: poNo, purchase_order_id: po.id };
  });
};
