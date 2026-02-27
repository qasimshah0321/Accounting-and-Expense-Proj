import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['partially_fulfilled', 'fulfilled', 'cancelled'],
  partially_fulfilled: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

const calcTotals = (items: any[], discountAmount = 0) => {
  const subtotal = items.reduce((s: number, li: any) => s + li.ordered_qty * li.rate, 0);
  const taxAmount = items.reduce((s: number, li: any) => s + (li.tax_amount || 0), 0);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const totalOrderedQty = items.reduce((s: number, li: any) => s + li.ordered_qty, 0);
  return { subtotal, tax_amount: taxAmount, grand_total: grandTotal, total_ordered_qty: totalOrderedQty };
};

export const listSalesOrders = async (companyId: string, filters: any) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.status) { conditions.push(`status=$${idx++}`); params.push(filters.status); }
  if (filters.fulfillment_status) { conditions.push(`fulfillment_status=$${idx++}`); params.push(filters.fulfillment_status); }
  if (filters.customer_id) { conditions.push(`customer_id=$${idx++}`); params.push(filters.customer_id); }
  if (filters.search) { conditions.push(`(sales_order_no ILIKE $${idx} OR customer_name ILIKE $${idx} OR po_number ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }
  if (filters.date_from) { conditions.push(`order_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`order_date<=$${idx++}`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM sales_orders WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,sales_order_no,customer_id,customer_name,order_date,due_date,status,fulfillment_status,grand_total,total_ordered_qty,total_delivered_qty,created_at FROM sales_orders WHERE ${where} ORDER BY order_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { sales_orders: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getSalesOrderById = async (companyId: string, orderId: string) => {
  const { rows } = await pool.query('SELECT * FROM sales_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [orderId, companyId]);
  if (!rows.length) throw new NotFoundError('Sales Order');
  const { rows: items } = await pool.query('SELECT * FROM sales_order_line_items WHERE sales_order_id=$1 ORDER BY line_number ASC', [orderId]);
  return { ...rows[0], line_items: items };
};

export const createSalesOrder = async (companyId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const custRes = await client.query('SELECT name,billing_address,shipping_address FROM customers WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [data.customer_id, companyId]);
    if (!custRes.rows.length) throw new ValidationError('Customer not found');
    const cust = custRes.rows[0];

    const soNo = await generateDocumentNumber(companyId, 'sales_order', client);
    const { subtotal, tax_amount, grand_total, total_ordered_qty } = calcTotals(data.line_items, data.discount_amount);

    const { rows: [so] } = await client.query(
      `INSERT INTO sales_orders (company_id,sales_order_no,customer_id,customer_name,bill_to,ship_to,reference_no,po_number,source_type,estimate_id,order_date,due_date,expected_delivery_date,status,fulfillment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,grand_total,total_ordered_qty,total_delivered_qty,total_pending_qty,notes,terms_and_conditions,internal_notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft','unfulfilled',$14,$15,$16,$17,$18,$19,$20,0,$20,$21,$22,$23,$24,$24) RETURNING *`,
      [companyId, soNo, data.customer_id, cust.name, data.bill_to || cust.billing_address, data.ship_to || cust.shipping_address, data.reference_no || null, data.po_number || null, data.source_type || 'manual', data.estimate_id || null, data.order_date, data.due_date || null, data.expected_delivery_date || null, subtotal, data.tax_id || null, data.tax_rate || 0, tax_amount, data.discount_amount || 0, grand_total, total_ordered_qty, data.notes || null, data.terms_and_conditions || null, data.internal_notes || null, userId]
    );

    const lineItems = [];
    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      const { rows: [item] } = await client.query(
        `INSERT INTO sales_order_line_items (sales_order_id,line_number,product_id,sku,description,ordered_qty,delivered_qty,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11) RETURNING *`,
        [so.id, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
      );
      lineItems.push(item);
    }

    await createAuditLog({ company_id: companyId, entity_type: 'sales_order', entity_id: so.id, action: 'create', user_id: userId, user_name: userName, description: `Sales Order ${soNo} created` }, client);
    return { ...so, line_items: lineItems };
  });
};

export const updateSalesOrder = async (companyId: string, orderId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const soRes = await client.query('SELECT * FROM sales_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [orderId, companyId]);
    if (!soRes.rows.length) throw new NotFoundError('Sales Order');
    const so = soRes.rows[0];
    if (so.status !== 'draft') throw new ConflictError('Only draft sales orders can be edited');

    if (data.line_items) {
      await client.query('DELETE FROM sales_order_line_items WHERE sales_order_id=$1', [orderId]);
      const { subtotal, tax_amount, grand_total, total_ordered_qty } = calcTotals(data.line_items, data.discount_amount ?? so.discount_amount);
      await client.query('UPDATE sales_orders SET subtotal=$1,tax_amount=$2,grand_total=$3,total_ordered_qty=$4,updated_at=NOW(),updated_by=$5 WHERE id=$6',
        [subtotal, tax_amount, grand_total, total_ordered_qty, userId, orderId]);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO sales_order_line_items (sales_order_id,line_number,product_id,sku,description,ordered_qty,delivered_qty,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9,$10,$11)`,
          [orderId, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
        );
      }
    }

    return getSalesOrderById(companyId, orderId);
  });
};

export const deleteSalesOrder = async (companyId: string, orderId: string) => {
  const so = await getSalesOrderById(companyId, orderId);
  if (so.status !== 'draft') throw new ConflictError('Only draft sales orders can be deleted');
  await pool.query('UPDATE sales_orders SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [orderId, companyId]);
};

export const updateStatus = async (companyId: string, orderId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const soRes = await client.query('SELECT * FROM sales_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [orderId, companyId]);
    if (!soRes.rows.length) throw new NotFoundError('Sales Order');
    const so = soRes.rows[0];
    const allowed = VALID_TRANSITIONS[so.status] || [];
    if (!allowed.includes(newStatus)) throw new ConflictError(`Cannot transition from ${so.status} to ${newStatus}`);
    await client.query('UPDATE sales_orders SET status=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3', [newStatus, userId, orderId]);
    await createStatusHistory({ company_id: companyId, document_type: 'sales_order', document_id: orderId, document_no: so.sales_order_no, from_status: so.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...so, status: newStatus };
  });
};

export const convertToDeliveryNote = async (companyId: string, orderId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const soRes = await client.query('SELECT * FROM sales_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [orderId, companyId]);
    if (!soRes.rows.length) throw new NotFoundError('Sales Order');
    const so = soRes.rows[0];
    if (!['confirmed', 'in_progress'].includes(so.status)) throw new ConflictError('Sales Order must be confirmed or in_progress');

    let shipViaName = null;
    if (data.ship_via_id) {
      const svRes = await client.query('SELECT name FROM ship_via WHERE id=$1 AND company_id=$2', [data.ship_via_id, companyId]);
      if (svRes.rows.length) shipViaName = svRes.rows[0].name;
    }

    const dnNo = await generateDocumentNumber(companyId, 'delivery_note', client);
    let totalOrderedQty = 0, totalShippedQty = 0;

    const dnLineItems = [];
    for (const reqItem of data.line_items) {
      const soliRes = await client.query('SELECT * FROM sales_order_line_items WHERE id=$1 AND sales_order_id=$2 FOR UPDATE', [reqItem.sales_order_line_item_id, orderId]);
      if (!soliRes.rows.length) throw new ValidationError(`Line item ${reqItem.sales_order_line_item_id} not found`);
      const soli = soliRes.rows[0];
      const pendingQty = parseFloat(soli.ordered_qty) - parseFloat(soli.delivered_qty);
      if (reqItem.shipped_qty > pendingQty) throw new ConflictError(`Shipped qty (${reqItem.shipped_qty}) exceeds pending qty (${pendingQty}) for item ${soli.sku || soli.description}`);

      await client.query('UPDATE sales_order_line_items SET delivered_qty=delivered_qty+$1,updated_at=NOW() WHERE id=$2', [reqItem.shipped_qty, soli.id]);

      dnLineItems.push({ product_id: soli.product_id, sku: soli.sku, description: soli.description, ordered_qty: soli.ordered_qty, shipped_qty: reqItem.shipped_qty, unit_of_measure: soli.unit_of_measure });
      totalOrderedQty += parseFloat(soli.ordered_qty);
      totalShippedQty += reqItem.shipped_qty;
    }

    const { rows: [dn] } = await client.query(
      `INSERT INTO delivery_notes (company_id,delivery_note_no,customer_id,customer_name,ship_to,sales_order_id,po_number,delivery_date,shipment_date,ship_via_id,ship_via_name,tracking_number,status,total_ordered_qty,total_shipped_qty,total_backordered_qty,notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'draft',$13,$14,$15,$16,$17,$17) RETURNING *`,
      [companyId, dnNo, so.customer_id, so.customer_name, so.ship_to, orderId, so.po_number, data.delivery_date, data.shipment_date || null, data.ship_via_id || null, shipViaName, data.tracking_number || null, totalOrderedQty, totalShippedQty, Math.max(0, totalOrderedQty - totalShippedQty), data.notes || null, userId]
    );

    for (let i = 0; i < dnLineItems.length; i++) {
      const li = dnLineItems[i];
      await client.query(
        `INSERT INTO delivery_note_line_items (delivery_note_id,line_number,product_id,sku,description,ordered_qty,shipped_qty,unit_of_measure) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [dn.id, i + 1, li.product_id, li.sku, li.description, li.ordered_qty, li.shipped_qty, li.unit_of_measure]
      );
    }

    // Update SO fulfillment status
    const allItemsRes = await client.query('SELECT ordered_qty,delivered_qty FROM sales_order_line_items WHERE sales_order_id=$1', [orderId]);
    const allFulfilled = allItemsRes.rows.every((r: any) => parseFloat(r.delivered_qty) >= parseFloat(r.ordered_qty));
    const anyFulfilled = allItemsRes.rows.some((r: any) => parseFloat(r.delivered_qty) > 0);
    const fulfillmentStatus = allFulfilled ? 'fulfilled' : anyFulfilled ? 'partially_fulfilled' : 'unfulfilled';
    const newStatus = so.status === 'confirmed' ? 'in_progress' : so.status;
    await client.query('UPDATE sales_orders SET fulfillment_status=$1,status=$2,total_delivered_qty=total_delivered_qty+$3,updated_at=NOW() WHERE id=$4', [fulfillmentStatus, newStatus, totalShippedQty, orderId]);

    const { rows: dnItems } = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=$1 ORDER BY line_number', [dn.id]);
    return { delivery_note: { ...dn, line_items: dnItems }, sales_order_fulfillment_status: fulfillmentStatus };
  });
};

export const convertToInvoice = async (companyId: string, orderId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const soRes = await client.query('SELECT * FROM sales_orders WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [orderId, companyId]);
    if (!soRes.rows.length) throw new NotFoundError('Sales Order');
    const so = soRes.rows[0];

    const { rows: items } = await client.query('SELECT * FROM sales_order_line_items WHERE sales_order_id=$1 ORDER BY line_number', [orderId]);
    const invNo = await generateDocumentNumber(companyId, 'invoice', client);

    const subtotal = items.reduce((s: number, li: any) => s + parseFloat(li.ordered_qty) * parseFloat(li.rate), 0);
    const taxAmount = items.reduce((s: number, li: any) => s + parseFloat(li.tax_amount || 0), 0);
    const grandTotal = subtotal + taxAmount - parseFloat(so.discount_amount || 0);

    const { rows: [inv] } = await client.query(
      `INSERT INTO invoices (company_id,invoice_no,customer_id,customer_name,bill_to,ship_to,sales_order_id,po_number,reference_no,invoice_date,due_date,status,payment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,grand_total,amount_paid,notes,terms_and_conditions,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft','unpaid',$12,$13,$14,$15,$16,$17,0,$18,$19,$20,$20) RETURNING *`,
      [companyId, invNo, so.customer_id, so.customer_name, so.bill_to, so.ship_to, orderId, so.po_number, so.reference_no, data.invoice_date, data.due_date, subtotal, so.tax_id, so.tax_rate, taxAmount, so.discount_amount || 0, grandTotal, data.notes || so.notes, so.terms_and_conditions, userId]
    );

    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      await client.query(
        `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [inv.id, i + 1, li.product_id, li.sku, li.description, li.ordered_qty, li.unit_of_measure, li.rate, li.tax_id, li.tax_rate, li.tax_amount]
      );
    }

    const { rows: invItems } = await client.query('SELECT * FROM invoice_line_items WHERE invoice_id=$1 ORDER BY line_number', [inv.id]);
    return { invoice: { ...inv, line_items: invItems } };
  });
};

export const getFulfillmentStatus = async (companyId: string, orderId: string) => {
  const so = await getSalesOrderById(companyId, orderId);
  return {
    sales_order_id: orderId,
    status: so.status,
    fulfillment_status: so.fulfillment_status,
    total_ordered_qty: so.total_ordered_qty,
    total_delivered_qty: so.total_delivered_qty,
    total_pending_qty: so.total_pending_qty,
    line_items: so.line_items,
  };
};

export const getDeliveryNotes = async (companyId: string, orderId: string, pagination: any) => {
  await getSalesOrderById(companyId, orderId);
  const countRes = await pool.query('SELECT COUNT(*) FROM delivery_notes WHERE company_id=$1 AND sales_order_id=$2 AND deleted_at IS NULL', [companyId, orderId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,delivery_note_no,delivery_date,status,total_shipped_qty FROM delivery_notes WHERE company_id=$1 AND sales_order_id=$2 AND deleted_at IS NULL ORDER BY delivery_date DESC LIMIT $3 OFFSET $4`,
    [companyId, orderId, pagination.limit, pagination.offset]
  );
  return { delivery_notes: rows, pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};
