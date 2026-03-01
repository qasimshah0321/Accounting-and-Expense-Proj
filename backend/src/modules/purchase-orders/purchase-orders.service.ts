import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['approved', 'cancelled'],
  approved: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

const calcTotals = (items: any[], discountAmount = 0) => {
  const subtotal = items.reduce((s: number, li: any) => s + li.ordered_qty * li.rate, 0);
  const taxAmount = items.reduce((s: number, li: any) => s + li.ordered_qty * li.rate * (li.tax_rate || 0) / 100, 0);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const totalOrderedQty = items.reduce((s: number, li: any) => s + li.ordered_qty, 0);
  return { subtotal, tax_amount: taxAmount, grand_total: grandTotal, total_ordered_qty: totalOrderedQty };
};

export const peekNextPurchaseOrderNumber = async (companyId: string): Promise<string> => {
  const { rows } = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=$1 AND document_type='purchase_order'`,
    [companyId]
  );
  if (!rows.length) return 'PO-001';
  const { prefix, next_number, padding, include_date } = rows[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listPurchaseOrders = async (companyId: string, filters: any) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.status) { conditions.push(`status=$${idx++}`); params.push(filters.status); }
  if (filters.vendor_id) { conditions.push(`vendor_id=$${idx++}`); params.push(filters.vendor_id); }
  if (filters.search) { conditions.push(`(purchase_order_no ILIKE $${idx} OR vendor_name ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }
  if (filters.date_from) { conditions.push(`order_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`order_date<=$${idx++}`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM purchase_orders WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,purchase_order_no,vendor_id,vendor_name,order_date,expected_delivery_date,status,receipt_status,grand_total,total_ordered_qty,total_received_qty,created_at FROM purchase_orders WHERE ${where} ORDER BY order_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { purchase_orders: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getPurchaseOrderById = async (companyId: string, poId: string) => {
  const { rows } = await pool.query('SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [poId, companyId]);
  if (!rows.length) throw new NotFoundError('Purchase Order');
  const { rows: items } = await pool.query('SELECT * FROM purchase_order_line_items WHERE purchase_order_id=$1 ORDER BY line_number ASC', [poId]);
  return { ...rows[0], line_items: items };
};

export const createPurchaseOrder = async (companyId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const vendRes = await client.query('SELECT name,address,city,state,postal_code,country FROM vendors WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [data.vendor_id, companyId]);
    if (!vendRes.rows.length) throw new ValidationError('Vendor not found');
    const vend = vendRes.rows[0];

    const poNo = data.purchase_order_no || await generateDocumentNumber(companyId, 'purchase_order', client);
    const { subtotal, tax_amount, grand_total, total_ordered_qty } = calcTotals(data.line_items, data.discount_amount);

    const vendorAddress = [vend.address, vend.city, vend.state, vend.postal_code, vend.country].filter(Boolean).join(', ');

    const { rows: [po] } = await client.query(
      `INSERT INTO purchase_orders (company_id,purchase_order_no,vendor_id,vendor_name,vendor_address,reference_no,order_date,expected_delivery_date,due_date,status,receipt_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,grand_total,total_ordered_qty,total_received_qty,notes,internal_notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft','unreceived',$10,$11,$12,$13,$14,$15,$16,0,$17,$18,$19,$19) RETURNING *`,
      [companyId, poNo, data.vendor_id, vend.name, vendorAddress, data.reference_no || null, data.order_date, data.expected_delivery_date || null, data.due_date || null, subtotal, data.tax_id || null, data.tax_rate || 0, tax_amount, data.discount_amount || 0, grand_total, total_ordered_qty, data.notes || null, data.internal_notes || null, userId]
    );

    const lineItems = [];
    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      const { rows: [item] } = await client.query(
        `INSERT INTO purchase_order_line_items (purchase_order_id,line_number,product_id,sku,description,ordered_qty,received_qty,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11) RETURNING *`,
        [po.id, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
      );
      lineItems.push(item);
    }

    await createAuditLog({ company_id: companyId, entity_type: 'purchase_order', entity_id: po.id, action: 'create', user_id: userId, user_name: userName, description: `Purchase Order ${poNo} created` }, client);
    return { ...po, line_items: lineItems };
  });
};

export const updatePurchaseOrder = async (companyId: string, poId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const poRes = await client.query('SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [poId, companyId]);
    if (!poRes.rows.length) throw new NotFoundError('Purchase Order');
    const po = poRes.rows[0];
    if (po.status !== 'draft') throw new ConflictError('Only draft purchase orders can be edited');

    if (data.line_items) {
      await client.query('DELETE FROM purchase_order_line_items WHERE purchase_order_id=$1', [poId]);
      const { subtotal, tax_amount, grand_total, total_ordered_qty } = calcTotals(data.line_items, data.discount_amount ?? po.discount_amount);
      await client.query('UPDATE purchase_orders SET subtotal=$1,tax_amount=$2,grand_total=$3,total_ordered_qty=$4,updated_at=NOW(),updated_by=$5 WHERE id=$6',
        [subtotal, tax_amount, grand_total, total_ordered_qty, userId, poId]);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO purchase_order_line_items (purchase_order_id,line_number,product_id,sku,description,ordered_qty,received_qty,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11)`,
          [poId, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
        );
      }
    }

    const fields: string[] = [];
    const vals: unknown[] = [];
    const allowed = ['reference_no', 'order_date', 'expected_delivery_date', 'due_date', 'tax_id', 'tax_rate', 'discount_amount', 'notes', 'internal_notes'];
    allowed.forEach(f => { if (data[f] !== undefined) { fields.push(f); vals.push(data[f]); } });
    if (fields.length) {
      const setClause = fields.map((f, i) => `${f}=$${i + 3}`).join(', ');
      await client.query(`UPDATE purchase_orders SET ${setClause}, updated_by=$${fields.length + 3}, updated_at=NOW() WHERE id=$1 AND company_id=$2`, [poId, companyId, ...vals, userId]);
    }

    await createAuditLog({ company_id: companyId, entity_type: 'purchase_order', entity_id: poId, action: 'update', user_id: userId, user_name: userName, description: `Purchase Order updated` }, client);
    return getPurchaseOrderById(companyId, poId);
  });
};

export const deletePurchaseOrder = async (companyId: string, poId: string) => {
  const po = await getPurchaseOrderById(companyId, poId);
  if (po.status !== 'draft') throw new ConflictError('Only draft purchase orders can be deleted');
  await pool.query('UPDATE purchase_orders SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [poId, companyId]);
};

export const updateStatus = async (companyId: string, poId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const poRes = await client.query('SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [poId, companyId]);
    if (!poRes.rows.length) throw new NotFoundError('Purchase Order');
    const po = poRes.rows[0];
    const allowed = VALID_TRANSITIONS[po.status] || [];
    if (!allowed.includes(newStatus)) throw new ConflictError(`Cannot transition from ${po.status} to ${newStatus}`);
    await client.query('UPDATE purchase_orders SET status=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3', [newStatus, userId, poId]);
    await createStatusHistory({ company_id: companyId, document_type: 'purchase_order', document_id: poId, document_no: po.purchase_order_no, from_status: po.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...po, status: newStatus };
  });
};
