import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'draft', 'cancelled'],
  shipped: ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const listDeliveryNotes = async (companyId: string, filters: any) => {
  const conditions = ['company_id=$1', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.status) { conditions.push(`status=$${idx++}`); params.push(filters.status); }
  if (filters.customer_id) { conditions.push(`customer_id=$${idx++}`); params.push(filters.customer_id); }
  if (filters.sales_order_id) { conditions.push(`sales_order_id=$${idx++}`); params.push(filters.sales_order_id); }
  if (filters.search) { conditions.push(`(delivery_note_no ILIKE $${idx} OR customer_name ILIKE $${idx})`); params.push(`%${filters.search}%`); idx++; }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM delivery_notes WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const { rows } = await pool.query(
    `SELECT id,delivery_note_no,customer_id,customer_name,delivery_date,status,total_shipped_qty,invoiced,created_at FROM delivery_notes WHERE ${where} ORDER BY delivery_date DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { delivery_notes: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getDeliveryNoteById = async (companyId: string, dnId: string) => {
  const { rows } = await pool.query('SELECT * FROM delivery_notes WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [dnId, companyId]);
  if (!rows.length) throw new NotFoundError('Delivery Note');
  const { rows: items } = await pool.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=$1 ORDER BY line_number', [dnId]);
  return { ...rows[0], line_items: items };
};

export const createDeliveryNote = async (companyId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const custRes = await client.query('SELECT name FROM customers WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [data.customer_id, companyId]);
    if (!custRes.rows.length) throw new ValidationError('Customer not found');

    let shipViaName = null;
    if (data.ship_via_id) {
      const svRes = await client.query('SELECT name FROM ship_via WHERE id=$1 AND company_id=$2', [data.ship_via_id, companyId]);
      if (svRes.rows.length) shipViaName = svRes.rows[0].name;
    }

    const dnNo = await generateDocumentNumber(companyId, 'delivery_note', client);
    const totalOrderedQty = data.line_items.reduce((s: number, li: any) => s + li.ordered_qty, 0);
    const totalShippedQty = data.line_items.reduce((s: number, li: any) => s + li.shipped_qty, 0);

    const { rows: [dn] } = await client.query(
      `INSERT INTO delivery_notes (company_id,delivery_note_no,customer_id,customer_name,ship_to,sales_order_id,po_number,reference_no,delivery_date,due_date,shipment_date,ship_via_id,ship_via_name,tracking_number,shipping_cost,status,total_ordered_qty,total_shipped_qty,total_backordered_qty,notes,internal_notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft',$16,$17,$18,$19,$20,$21,$21) RETURNING *`,
      [companyId, dnNo, data.customer_id, custRes.rows[0].name, data.ship_to || null, data.sales_order_id || null, data.po_number || null, data.reference_no || null, data.delivery_date, data.due_date || null, data.shipment_date || null, data.ship_via_id || null, shipViaName, data.tracking_number || null, data.shipping_cost || 0, totalOrderedQty, totalShippedQty, Math.max(0, totalOrderedQty - totalShippedQty), data.notes || null, data.internal_notes || null, userId]
    );

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      await client.query(
        `INSERT INTO delivery_note_line_items (delivery_note_id,line_number,product_id,sku,description,ordered_qty,shipped_qty,unit_of_measure,stock_location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [dn.id, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.shipped_qty, li.unit_of_measure || 'pcs', li.stock_location || null]
      );
    }

    const { rows: dnItems } = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=$1 ORDER BY line_number', [dn.id]);
    return { ...dn, line_items: dnItems };
  });
};

export const updateDeliveryNote = async (companyId: string, dnId: string, userId: string, _userName: string, data: any) => {
  const dn = await getDeliveryNoteById(companyId, dnId);
  if (dn.status !== 'draft') throw new ConflictError('Only draft delivery notes can be edited');

  return withTransaction(async (client) => {
    if (data.line_items) {
      await client.query('DELETE FROM delivery_note_line_items WHERE delivery_note_id=$1', [dnId]);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO delivery_note_line_items (delivery_note_id,line_number,product_id,sku,description,ordered_qty,shipped_qty,unit_of_measure,stock_location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [dnId, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.shipped_qty, li.unit_of_measure || 'pcs', li.stock_location || null]
        );
      }
    }
    await client.query('UPDATE delivery_notes SET updated_by=$1,updated_at=NOW() WHERE id=$2', [userId, dnId]);
    return getDeliveryNoteById(companyId, dnId);
  });
};

export const deleteDeliveryNote = async (companyId: string, dnId: string) => {
  const dn = await getDeliveryNoteById(companyId, dnId);
  if (!['draft', 'ready_to_ship'].includes(dn.status)) throw new ConflictError('Cannot delete a delivery note that has been shipped');
  await pool.query('UPDATE delivery_notes SET deleted_at=NOW() WHERE id=$1 AND company_id=$2', [dnId, companyId]);
};

export const updateStatus = async (companyId: string, dnId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const dnRes = await client.query('SELECT * FROM delivery_notes WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [dnId, companyId]);
    if (!dnRes.rows.length) throw new NotFoundError('Delivery Note');
    const dn = dnRes.rows[0];
    const allowed = VALID_TRANSITIONS[dn.status] || [];
    if (!allowed.includes(newStatus)) throw new ConflictError(`Cannot transition from ${dn.status} to ${newStatus}`);
    await client.query('UPDATE delivery_notes SET status=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3', [newStatus, userId, dnId]);
    await createStatusHistory({ company_id: companyId, document_type: 'delivery_note', document_id: dnId, document_no: dn.delivery_note_no, from_status: dn.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...dn, status: newStatus };
  });
};

export const shipDeliveryNote = async (companyId: string, dnId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const dnRes = await client.query('SELECT * FROM delivery_notes WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [dnId, companyId]);
    if (!dnRes.rows.length) throw new NotFoundError('Delivery Note');
    const dn = dnRes.rows[0];
    if (!['draft', 'ready_to_ship'].includes(dn.status)) throw new ConflictError('Delivery note must be draft or ready_to_ship to ship');

    const { rows: items } = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=$1', [dnId]);
    const inventoryTransactions = [];
    const stockUpdates = [];

    if (data.deduct_inventory !== false) {
      for (const item of items) {
        if (!item.product_id) continue;
        const prodRes = await client.query('SELECT * FROM products WHERE id=$1 AND company_id=$2 FOR UPDATE', [item.product_id, companyId]);
        if (!prodRes.rows.length) continue;
        const product = prodRes.rows[0];
        if (!product.track_inventory) continue;

        const balanceBefore = parseFloat(product.current_stock);
        const shippedQty = parseFloat(item.shipped_qty);

        if (balanceBefore < shippedQty) {
          throw new ConflictError(`Insufficient stock for SKU: ${product.sku}. Available: ${balanceBefore}, Required: ${shippedQty}`);
        }

        const balanceAfter = balanceBefore - shippedQty;
        const txNo = await generateDocumentNumber(companyId, 'inventory_transaction', client);

        await client.query(
          `INSERT INTO inventory_transactions (company_id,transaction_no,product_id,sku,transaction_type,transaction_date,quantity,unit_of_measure,balance_before,balance_after,stock_location,reference_type,reference_id,reference_no,created_by)
           VALUES ($1,$2,$3,$4,'delivery_note',NOW(),$5,$6,$7,$8,$9,'delivery_note',$10,$11,$12)`,
          [companyId, txNo, item.product_id, product.sku, -shippedQty, product.unit_of_measure, balanceBefore, balanceAfter, data.stock_location || item.stock_location, dnId, dn.delivery_note_no, userId]
        );

        await client.query('UPDATE products SET current_stock=$1,updated_at=NOW() WHERE id=$2', [balanceAfter, item.product_id]);
        await client.query('UPDATE delivery_note_line_items SET inventory_deducted=true WHERE id=$1', [item.id]);

        inventoryTransactions.push({ transaction_no: txNo, product_id: item.product_id, sku: product.sku, quantity: -shippedQty, balance_before: balanceBefore, balance_after: balanceAfter });
        stockUpdates.push({ product_id: item.product_id, sku: product.sku, previous_stock: balanceBefore, new_stock: balanceAfter });
      }
    }

    const shipmentDate = data.shipment_date || new Date().toISOString().split('T')[0];
    await client.query('UPDATE delivery_notes SET status=\'shipped\',shipment_date=$1,updated_at=NOW(),updated_by=$2 WHERE id=$3', [shipmentDate, userId, dnId]);
    await createStatusHistory({ company_id: companyId, document_type: 'delivery_note', document_id: dnId, document_no: dn.delivery_note_no, from_status: dn.status, to_status: 'shipped', changed_by: userId, changed_by_name: userName }, client);

    return { delivery_note: { ...dn, status: 'shipped', shipment_date: shipmentDate }, inventory_transactions: inventoryTransactions, product_stock_updated: stockUpdates };
  });
};

export const markDelivered = async (companyId: string, dnId: string, userId: string, userName: string) => {
  return withTransaction(async (client) => {
    const dnRes = await client.query('SELECT * FROM delivery_notes WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL FOR UPDATE', [dnId, companyId]);
    if (!dnRes.rows.length) throw new NotFoundError('Delivery Note');
    const dn = dnRes.rows[0];
    if (!['shipped', 'in_transit'].includes(dn.status)) throw new ConflictError('Delivery note must be shipped or in_transit to mark as delivered');
    await client.query('UPDATE delivery_notes SET status=\'delivered\',updated_at=NOW(),updated_by=$1 WHERE id=$2', [userId, dnId]);
    await createStatusHistory({ company_id: companyId, document_type: 'delivery_note', document_id: dnId, document_no: dn.delivery_note_no, from_status: dn.status, to_status: 'delivered', changed_by: userId, changed_by_name: userName }, client);
    return { ...dn, status: 'delivered' };
  });
};

export const convertToInvoice = async (companyId: string, dnId: string, userId: string, _userName: string, data: any) => {
  return withTransaction(async (client) => {
    const dnRes = await client.query('SELECT * FROM delivery_notes WHERE id=$1 AND company_id=$2 AND deleted_at IS NULL', [dnId, companyId]);
    if (!dnRes.rows.length) throw new NotFoundError('Delivery Note');
    const dn = dnRes.rows[0];
    if (!['shipped', 'delivered'].includes(dn.status)) throw new ConflictError('Delivery Note must be shipped or delivered to convert to invoice');
    if (dn.invoiced) throw new ConflictError('Delivery Note already invoiced');

    const { rows: items } = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=$1 ORDER BY line_number', [dnId]);

    // Get pricing from linked SO if available
    let soData: any = null;
    if (dn.sales_order_id) {
      const soRes = await client.query('SELECT * FROM sales_orders WHERE id=$1', [dn.sales_order_id]);
      if (soRes.rows.length) soData = soRes.rows[0];
    }

    let subtotal = 0, taxAmount = 0;
    const invItems = [];

    for (const item of items) {
      let rate = 0, taxRate = 0, itemTaxAmount = 0;
      if (soData && item.product_id) {
        const soliRes = await client.query('SELECT rate,tax_rate,tax_amount,ordered_qty FROM sales_order_line_items WHERE sales_order_id=$1 AND product_id=$2 LIMIT 1', [dn.sales_order_id, item.product_id]);
        if (soliRes.rows.length) { rate = parseFloat(soliRes.rows[0].rate); taxRate = parseFloat(soliRes.rows[0].tax_rate || 0); }
      }
      const lineTotal = parseFloat(item.shipped_qty) * rate;
      itemTaxAmount = lineTotal * (taxRate / 100);
      subtotal += lineTotal;
      taxAmount += itemTaxAmount;
      invItems.push({ ...item, rate, tax_rate: taxRate, tax_amount: itemTaxAmount });
    }

    const grandTotal = subtotal + taxAmount;
    const invNo = await generateDocumentNumber(companyId, 'invoice', client);

    const { rows: [inv] } = await client.query(
      `INSERT INTO invoices (company_id,invoice_no,customer_id,customer_name,bill_to,ship_to,sales_order_id,delivery_note_id,invoice_date,due_date,status,payment_status,subtotal,tax_amount,grand_total,amount_paid,notes,created_by,updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','unpaid',$11,$12,$13,0,$14,$15,$15) RETURNING *`,
      [companyId, invNo, dn.customer_id, dn.customer_name, soData?.bill_to || null, dn.ship_to, dn.sales_order_id || null, dnId, data.invoice_date, data.due_date, subtotal, taxAmount, grandTotal, data.notes || null, userId]
    );

    for (let i = 0; i < invItems.length; i++) {
      const li = invItems[i];
      await client.query(
        `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,tax_rate,tax_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [inv.id, i + 1, li.product_id, li.sku, li.description, li.shipped_qty, li.unit_of_measure, li.rate, li.tax_rate, li.tax_amount]
      );
    }

    await client.query('UPDATE delivery_notes SET invoiced=true,invoice_id=$1,updated_at=NOW() WHERE id=$2', [inv.id, dnId]);
    const { rows: invLineItems } = await client.query('SELECT * FROM invoice_line_items WHERE invoice_id=$1 ORDER BY line_number', [inv.id]);
    return { invoice: { ...inv, line_items: invLineItems }, delivery_note_updated: { id: dnId, invoiced: true, invoice_id: inv.id } };
  });
};

export const getTracking = async (companyId: string, dnId: string) => {
  const dn = await getDeliveryNoteById(companyId, dnId);
  const { rows: history } = await pool.query(
    'SELECT * FROM document_status_history WHERE document_type=$1 AND document_id=$2 ORDER BY created_at ASC', ['delivery_note', dnId]
  );
  return { delivery_note_no: dn.delivery_note_no, tracking_number: dn.tracking_number, ship_via_name: dn.ship_via_name, status: dn.status, shipment_date: dn.shipment_date, status_history: history };
};
