import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';
import { notifyAdmins, notifyCustomer } from '../../services/pushNotificationService';
import { createForAdmins, createForCustomer } from '../../services/notificationService';
import { emailAdmins, emailCustomer } from '../../services/emailService';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['partially_fulfilled', 'fulfilled', 'cancelled'],
  partially_fulfilled: ['fulfilled', 'cancelled'],
  fulfilled: ['completed'],
  cancelled: [],
  completed: [],
};

const calcTotals = (items: any[], discountAmount = 0) => {
  const subtotal = items.reduce((s: number, li: any) => s + li.ordered_qty * li.rate, 0);
  const taxAmount = items.reduce((s: number, li: any) => s + li.ordered_qty * li.rate * (li.tax_rate || 0) / 100, 0);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountAmount);
  const totalOrderedQty = items.reduce((s: number, li: any) => s + li.ordered_qty, 0);
  return { subtotal, tax_amount: taxAmount, grand_total: grandTotal, total_ordered_qty: totalOrderedQty };
};

export const peekNextSalesOrderNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='sales_order'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'SO-001';
  const { prefix, next_number, padding, include_date } = (rows as any[])[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listSalesOrders = async (companyId: string, filters: any, userId?: string, role?: string) => {
  const conditions = ['so.company_id=?', 'so.deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let fromClause = 'sales_orders so';

  // Customer role: filter to only their linked customer's orders
  if (role === 'customer' && userId) {
    fromClause = 'sales_orders so JOIN user_customer_map ucm ON ucm.customer_id = so.customer_id';
    conditions.push(`ucm.user_id=?`);
    params.push(userId);
  }

  if (filters.status) { conditions.push(`so.status=?`); params.push(filters.status); }
  if (filters.fulfillment_status) { conditions.push(`so.fulfillment_status=?`); params.push(filters.fulfillment_status); }
  if (filters.customer_id) { conditions.push(`so.customer_id=?`); params.push(filters.customer_id); }
  if (filters.search) { conditions.push(`(so.sales_order_no LIKE ? OR so.customer_name LIKE ? OR so.po_number LIKE ?)`); const s = `%${filters.search}%`; params.push(s, s, s); }
  if (filters.date_from) { conditions.push(`so.order_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`so.order_date<=?`); params.push(filters.date_to); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM ${fromClause} WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT so.id,so.sales_order_no,so.customer_id,so.customer_name,so.order_date,so.due_date,so.status,so.fulfillment_status,so.grand_total,so.total_ordered_qty,so.total_delivered_qty,so.created_at FROM ${fromClause} WHERE ${where} ORDER BY so.order_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { sales_orders: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getSalesOrderById = async (companyId: string, orderId: string) => {
  const [rows] = await pool.query('SELECT * FROM sales_orders WHERE id=? AND company_id=? AND deleted_at IS NULL', [orderId, companyId]);
  if (!(rows as any[]).length) throw new NotFoundError('Sales Order');
  const [items] = await pool.query('SELECT * FROM sales_order_line_items WHERE sales_order_id=? ORDER BY line_number ASC', [orderId]);
  return { ...(rows as any[])[0], line_items: items as any[] };
};

export const createSalesOrder = async (companyId: string, userId: string, userName: string, data: any, role?: string) => {
  const result = await withTransaction(async (client) => {
    // If customer role, auto-assign customer_id from user_customer_map
    if (role === 'customer') {
      const [mapRes] = await client.query('SELECT customer_id FROM user_customer_map WHERE user_id=? AND company_id=?', [userId, companyId]);
      if (!(mapRes as any[]).length) throw new ForbiddenError('No linked customer found for this user');
      data.customer_id = (mapRes as any[])[0].customer_id;
    }

    const [custRes] = await client.query('SELECT name,billing_address,shipping_address FROM customers WHERE id=? AND company_id=? AND deleted_at IS NULL', [data.customer_id, companyId]);
    if (!(custRes as any[]).length) throw new ValidationError('Customer not found');
    const cust = (custRes as any[])[0];

    const soNo = data.sales_order_no || await generateDocumentNumber(companyId, 'sales_order', client);
    const { subtotal, tax_amount, grand_total, total_ordered_qty } = calcTotals(data.line_items, data.discount_amount);

    await client.query(
      `INSERT INTO sales_orders (company_id,sales_order_no,customer_id,customer_name,bill_to,ship_to,reference_no,po_number,source_type,estimate_id,order_date,due_date,expected_delivery_date,status,fulfillment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,grand_total,total_ordered_qty,total_delivered_qty,total_pending_qty,notes,terms_and_conditions,internal_notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'draft','unfulfilled',?,?,?,?,?,?,?,0,?,?,?,?,?,?)`,
      [companyId, soNo, data.customer_id, cust.name, data.bill_to || cust.billing_address, data.ship_to || cust.shipping_address, data.reference_no || null, data.po_number || null, data.source_type || 'manual', data.estimate_id || null, data.order_date, data.due_date || null, data.expected_delivery_date || null, subtotal, data.tax_id || null, data.tax_rate || 0, tax_amount, data.discount_amount || 0, grand_total, total_ordered_qty, total_ordered_qty, data.notes || null, data.terms_and_conditions || null, data.internal_notes || null, userId, userId]
    );
    const [soRows] = await client.query('SELECT * FROM sales_orders WHERE company_id=? AND sales_order_no=? ORDER BY created_at DESC LIMIT 1', [companyId, soNo]);
    const so = (soRows as any[])[0];

    const lineItems = [];
    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      await client.query(
        `INSERT INTO sales_order_line_items (sales_order_id,line_number,product_id,sku,description,ordered_qty,delivered_qty,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES (?,?,?,?,?,?,0,?,?,?,?,?)`,
        [so.id, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.unit_of_measure || 'pcs', li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0]
      );
    }
    const [itemRows] = await client.query('SELECT * FROM sales_order_line_items WHERE sales_order_id=? ORDER BY line_number ASC', [so.id]);
    lineItems.push(...(itemRows as any[]));

    await createAuditLog({ company_id: companyId, entity_type: 'sales_order', entity_id: so.id, action: 'create', user_id: userId, user_name: userName, description: `Sales Order ${soNo} created` }, client);
    return { ...so, line_items: lineItems };
  });

  // Fire-and-forget: notify admins AFTER transaction commits (web push + in-app bell + email)
  const soData = { type: 'sales_order', action: 'created', id: result.id, sales_order_no: result.sales_order_no };
  notifyAdmins(companyId, 'New Sales Order', `${userName} placed order ${result.sales_order_no}`, soData).catch(() => {});
  createForAdmins(companyId, 'sales_order', 'New Sales Order', `${userName} placed order ${result.sales_order_no}`, soData).catch(() => {});
  emailAdmins(companyId, `New Sales Order: ${result.sales_order_no}`, `A new sales order <strong>${result.sales_order_no}</strong> has been placed by <strong>${userName}</strong>.`).catch(() => {});

  return result;
};

export const updateSalesOrder = async (companyId: string, orderId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [soRes] = await client.query('SELECT * FROM sales_orders WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [orderId, companyId]);
    if (!(soRes as any[]).length) throw new NotFoundError('Sales Order');
    const so = (soRes as any[])[0];
    if (so.status !== 'draft') throw new ConflictError('Only draft sales orders can be edited');

    if (data.line_items) {
      await client.query('DELETE FROM sales_order_line_items WHERE sales_order_id=?', [orderId]);
      const { subtotal, tax_amount, grand_total, total_ordered_qty } = calcTotals(data.line_items, data.discount_amount ?? so.discount_amount);
      await client.query('UPDATE sales_orders SET subtotal=?,tax_amount=?,grand_total=?,total_ordered_qty=?,updated_at=NOW(),updated_by=? WHERE id=?',
        [subtotal, tax_amount, grand_total, total_ordered_qty, userId, orderId]);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO sales_order_line_items (sales_order_id,line_number,product_id,sku,description,ordered_qty,delivered_qty,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES (?,?,?,?,?,?,0,?,?,?,?,?)`,
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
  await pool.query('UPDATE sales_orders SET deleted_at=NOW() WHERE id=? AND company_id=?', [orderId, companyId]);
};

export const updateStatus = async (companyId: string, orderId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  const result = await withTransaction(async (client) => {
    const [soRes] = await client.query('SELECT * FROM sales_orders WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [orderId, companyId]);
    if (!(soRes as any[]).length) throw new NotFoundError('Sales Order');
    const so = (soRes as any[])[0];
    const allowed = VALID_TRANSITIONS[so.status] || [];
    if (!allowed.includes(newStatus)) throw new ConflictError(`Cannot transition from ${so.status} to ${newStatus}`);
    await client.query('UPDATE sales_orders SET status=?,updated_at=NOW(),updated_by=? WHERE id=?', [newStatus, userId, orderId]);
    await createStatusHistory({ company_id: companyId, document_type: 'sales_order', document_id: orderId, document_no: so.sales_order_no, from_status: so.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...so, status: newStatus };
  });

  // Fire-and-forget: notify the customer linked to this order AFTER transaction commits (web push + in-app bell + email)
  const statusLabel = newStatus.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const statusData = { type: 'sales_order', action: 'status_change', id: result.id, sales_order_no: result.sales_order_no, status: newStatus };
  notifyCustomer(companyId, result.customer_id, 'Order Update', `Your order ${result.sales_order_no} is now ${statusLabel}`, statusData).catch(() => {});
  createForCustomer(companyId, result.customer_id, 'sales_order', 'Order Update', `Your order ${result.sales_order_no} is now ${statusLabel}`, statusData).catch(() => {});
  emailCustomer(companyId, result.customer_id, `Order Update: ${result.sales_order_no}`, `Your order <strong>${result.sales_order_no}</strong> status has been updated to <strong>${statusLabel}</strong>.`).catch(() => {});

  return result;
};

export const convertToDeliveryNote = async (companyId: string, orderId: string, userId: string, userName: string, data: any) => {
  // Generate document number outside the transaction so the sequence increment
  // commits independently — prevents stuck sequence on transaction rollback.
  const dnNo = await generateDocumentNumber(companyId, 'delivery_note');

  const result = await withTransaction(async (client) => {
    const [soRes] = await client.query('SELECT * FROM sales_orders WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [orderId, companyId]);
    if (!(soRes as any[]).length) throw new NotFoundError('Sales Order');
    const so = (soRes as any[])[0];
    if (!['confirmed', 'in_progress'].includes(so.status)) throw new ConflictError('Sales Order must be confirmed or in_progress');

    let shipViaName = null;
    if (data.ship_via_id) {
      const [svRes] = await client.query('SELECT name FROM ship_via WHERE id=? AND company_id=?', [data.ship_via_id, companyId]);
      if ((svRes as any[]).length) shipViaName = (svRes as any[])[0].name;
    }
    let totalOrderedQty = 0, totalShippedQty = 0;

    const dnLineItems = [];
    for (const reqItem of data.line_items) {
      const [soliRes] = await client.query('SELECT * FROM sales_order_line_items WHERE id=? AND sales_order_id=? FOR UPDATE', [reqItem.sales_order_line_item_id, orderId]);
      if (!(soliRes as any[]).length) throw new ValidationError(`Line item ${reqItem.sales_order_line_item_id} not found`);
      const soli = (soliRes as any[])[0];
      const pendingQty = parseFloat(soli.ordered_qty) - parseFloat(soli.delivered_qty);
      if (reqItem.shipped_qty > pendingQty) throw new ConflictError(`Shipped qty (${reqItem.shipped_qty}) exceeds pending qty (${pendingQty}) for item ${soli.sku || soli.description}`);

      await client.query('UPDATE sales_order_line_items SET delivered_qty=delivered_qty+?,updated_at=NOW() WHERE id=?', [reqItem.shipped_qty, soli.id]);

      dnLineItems.push({ product_id: soli.product_id, sku: soli.sku, description: soli.description, ordered_qty: soli.ordered_qty, shipped_qty: reqItem.shipped_qty, unit_of_measure: soli.unit_of_measure });
      totalOrderedQty += parseFloat(soli.ordered_qty);
      totalShippedQty += reqItem.shipped_qty;
    }

    await client.query(
      `INSERT INTO delivery_notes (company_id,delivery_note_no,customer_id,customer_name,ship_to,sales_order_id,po_number,delivery_date,shipment_date,ship_via_id,ship_via_name,tracking_number,status,total_ordered_qty,total_shipped_qty,total_backordered_qty,notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?)`,
      [companyId, dnNo, so.customer_id, so.customer_name, so.ship_to, orderId, so.po_number, data.delivery_date, data.shipment_date || null, data.ship_via_id || null, shipViaName, data.tracking_number || null, totalOrderedQty, totalShippedQty, Math.max(0, totalOrderedQty - totalShippedQty), data.notes || null, userId, userId]
    );
    const [dnRows] = await client.query('SELECT * FROM delivery_notes WHERE company_id=? AND delivery_note_no=? ORDER BY created_at DESC LIMIT 1', [companyId, dnNo]);
    const dn = (dnRows as any[])[0];

    for (let i = 0; i < dnLineItems.length; i++) {
      const li = dnLineItems[i];
      await client.query(
        `INSERT INTO delivery_note_line_items (delivery_note_id,line_number,product_id,sku,description,ordered_qty,shipped_qty,unit_of_measure) VALUES (?,?,?,?,?,?,?,?)`,
        [dn.id, i + 1, li.product_id, li.sku, li.description, li.ordered_qty, li.shipped_qty, li.unit_of_measure]
      );
    }

    // Update SO fulfillment status
    const [allItemsRes] = await client.query('SELECT ordered_qty,delivered_qty FROM sales_order_line_items WHERE sales_order_id=?', [orderId]);
    const allFulfilled = (allItemsRes as any[]).every((r: any) => parseFloat(r.delivered_qty) >= parseFloat(r.ordered_qty));
    const anyFulfilled = (allItemsRes as any[]).some((r: any) => parseFloat(r.delivered_qty) > 0);
    const fulfillmentStatus = allFulfilled ? 'fulfilled' : anyFulfilled ? 'partially_fulfilled' : 'unfulfilled';
    const newStatus = so.status === 'confirmed' ? 'in_progress' : so.status;
    await client.query('UPDATE sales_orders SET fulfillment_status=?,status=?,total_delivered_qty=total_delivered_qty+?,updated_at=NOW() WHERE id=?', [fulfillmentStatus, newStatus, totalShippedQty, orderId]);

    const [dnItems] = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=? ORDER BY line_number', [dn.id]);
    return { delivery_note: { ...dn, line_items: dnItems as any[] }, sales_order_fulfillment_status: fulfillmentStatus, _so: so };
  });

  // Fire-and-forget: notify customer about shipment AFTER transaction commits (web push + email)
  const so = result._so;
  notifyCustomer(companyId, so.customer_id, 'Shipment Created', `A delivery note ${dnNo} has been created for your order ${so.sales_order_no}`, {
    type: 'sales_order', action: 'shipment', id: orderId, sales_order_no: so.sales_order_no, delivery_note_no: dnNo,
  }).catch(() => {});
  emailCustomer(companyId, so.customer_id, `Shipment Created for Order ${so.sales_order_no}`, `A delivery note <strong>${dnNo}</strong> has been created for your order <strong>${so.sales_order_no}</strong>. Your items are on their way!`).catch(() => {});

  // Remove internal _so before returning
  const { _so, ...cleanResult } = result;
  return cleanResult;
};

export const convertToInvoice = async (companyId: string, orderId: string, userId: string, userName: string, data: any) => {
  // Generate document number outside the transaction so the sequence increment
  // commits independently — prevents stuck sequence on transaction rollback.
  const invNo = await generateDocumentNumber(companyId, 'invoice');

  const result = await withTransaction(async (client) => {
    const [soRes] = await client.query('SELECT * FROM sales_orders WHERE id=? AND company_id=? AND deleted_at IS NULL', [orderId, companyId]);
    if (!(soRes as any[]).length) throw new NotFoundError('Sales Order');
    const so = (soRes as any[])[0];

    const [items] = await client.query('SELECT * FROM sales_order_line_items WHERE sales_order_id=? ORDER BY line_number', [orderId]);

    const subtotal = (items as any[]).reduce((s: number, li: any) => s + parseFloat(li.ordered_qty) * parseFloat(li.rate), 0);
    const taxAmount = (items as any[]).reduce((s: number, li: any) => s + parseFloat(li.ordered_qty) * parseFloat(li.rate) * parseFloat(li.tax_rate || 0) / 100, 0);
    const grandTotal = subtotal + taxAmount - parseFloat(so.discount_amount || 0);

    await client.query(
      `INSERT INTO invoices (company_id,invoice_no,customer_id,customer_name,bill_to,ship_to,sales_order_id,po_number,reference_no,invoice_date,due_date,status,payment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,grand_total,amount_paid,notes,terms_and_conditions,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,'draft','unpaid',?,?,?,?,?,?,0,?,?,?,?)`,
      [companyId, invNo, so.customer_id, so.customer_name, so.bill_to, so.ship_to, orderId, so.po_number, so.reference_no, data.invoice_date, data.due_date, subtotal, so.tax_id, so.tax_rate, taxAmount, so.discount_amount || 0, grandTotal, data.notes || so.notes, so.terms_and_conditions, userId, userId]
    );
    const [invRows] = await client.query('SELECT * FROM invoices WHERE company_id=? AND invoice_no=? ORDER BY created_at DESC LIMIT 1', [companyId, invNo]);
    const inv = (invRows as any[])[0];

    for (let i = 0; i < (items as any[]).length; i++) {
      const li = (items as any[])[i];
      await client.query(
        `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,tax_id,tax_rate,tax_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [inv.id, i + 1, li.product_id, li.sku, li.description, li.ordered_qty, li.unit_of_measure, li.rate, li.tax_id, li.tax_rate, li.tax_amount]
      );
    }

    const [invItems] = await client.query('SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY line_number', [inv.id]);
    return { invoice: { ...inv, line_items: invItems as any[] }, _so: so };
  });

  // Fire-and-forget: notify customer about invoice AFTER transaction commits (web push + email)
  const so = result._so;
  notifyCustomer(companyId, so.customer_id, 'Invoice Created', `Invoice ${invNo} has been created for your order ${so.sales_order_no}`, {
    type: 'sales_order', action: 'invoiced', id: orderId, sales_order_no: so.sales_order_no, invoice_no: invNo,
  }).catch(() => {});
  emailCustomer(companyId, so.customer_id, `Invoice ${invNo} for Order ${so.sales_order_no}`, `Invoice <strong>${invNo}</strong> has been created for your order <strong>${so.sales_order_no}</strong>. Please review and make payment at your earliest convenience.`).catch(() => {});

  const { _so, ...cleanResult } = result;
  return cleanResult;
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
  const [countRows] = await pool.query('SELECT COUNT(*) as count FROM delivery_notes WHERE company_id=? AND sales_order_id=? AND deleted_at IS NULL', [companyId, orderId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id,delivery_note_no,delivery_date,status,total_shipped_qty FROM delivery_notes WHERE company_id=? AND sales_order_id=? AND deleted_at IS NULL ORDER BY delivery_date DESC LIMIT ? OFFSET ?`,
    [companyId, orderId, pagination.limit, pagination.offset]
  );
  return { delivery_notes: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};
