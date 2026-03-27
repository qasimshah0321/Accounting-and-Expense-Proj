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

export const peekNextDeliveryNoteNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='delivery_note'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'DN-001';
  const { prefix, next_number, padding, include_date } = (rows as any[])[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listDeliveryNotes = async (companyId: string, filters: any) => {
  const conditions = ['dn.company_id=?', 'dn.deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.status) { conditions.push(`dn.status=?`); params.push(filters.status); }
  if (filters.customer_id) { conditions.push(`dn.customer_id=?`); params.push(filters.customer_id); }
  if (filters.sales_order_id) { conditions.push(`dn.sales_order_id=?`); params.push(filters.sales_order_id); }
  if (filters.search) { conditions.push(`(dn.delivery_note_no LIKE ? OR dn.customer_name LIKE ?)`); const s = `%${filters.search}%`; params.push(s, s); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM delivery_notes dn LEFT JOIN sales_orders so ON so.id = dn.sales_order_id WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT dn.id,dn.delivery_note_no,dn.customer_id,dn.customer_name,dn.delivery_date,dn.shipment_date,dn.ship_via_name,dn.status,dn.total_ordered_qty,dn.total_shipped_qty,dn.total_backordered_qty,dn.invoiced,dn.created_at,so.sales_order_no AS source_so_no FROM delivery_notes dn LEFT JOIN sales_orders so ON so.id = dn.sales_order_id WHERE ${where} ORDER BY dn.delivery_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { delivery_notes: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getDeliveryNoteById = async (companyId: string, dnId: string) => {
  const [rows] = await pool.query('SELECT * FROM delivery_notes WHERE id=? AND company_id=? AND deleted_at IS NULL', [dnId, companyId]);
  if (!(rows as any[]).length) throw new NotFoundError('Delivery Note');
  const [items] = await pool.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=? ORDER BY line_number', [dnId]);
  return { ...(rows as any[])[0], line_items: items as any[] };
};

export const createDeliveryNote = async (companyId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [custRes] = await client.query('SELECT name FROM customers WHERE id=? AND company_id=? AND deleted_at IS NULL', [data.customer_id, companyId]);
    if (!(custRes as any[]).length) throw new ValidationError('Customer not found');

    let shipViaName = null;
    if (data.ship_via_id) {
      const [svRes] = await client.query('SELECT name FROM ship_via WHERE id=? AND company_id=?', [data.ship_via_id, companyId]);
      if ((svRes as any[]).length) shipViaName = (svRes as any[])[0].name;
    }

    const dnNo = data.delivery_note_no || await generateDocumentNumber(companyId, 'delivery_note', client);
    const totalOrderedQty = data.line_items.reduce((s: number, li: any) => s + li.ordered_qty, 0);
    const totalShippedQty = data.line_items.reduce((s: number, li: any) => s + li.shipped_qty, 0);

    await client.query(
      `INSERT INTO delivery_notes (company_id,delivery_note_no,customer_id,customer_name,ship_to,sales_order_id,po_number,reference_no,delivery_date,due_date,shipment_date,ship_via_id,ship_via_name,tracking_number,shipping_cost,status,total_ordered_qty,total_shipped_qty,total_backordered_qty,notes,internal_notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?)`,
      [companyId, dnNo, data.customer_id, (custRes as any[])[0].name, data.ship_to || null, data.sales_order_id || null, data.po_number || null, data.reference_no || null, data.delivery_date, data.due_date || null, data.shipment_date || null, data.ship_via_id || null, shipViaName, data.tracking_number || null, data.shipping_cost || 0, totalOrderedQty, totalShippedQty, Math.max(0, totalOrderedQty - totalShippedQty), data.notes || null, data.internal_notes || null, userId, userId]
    );
    const [dnRows] = await client.query('SELECT * FROM delivery_notes WHERE company_id=? AND delivery_note_no=? ORDER BY created_at DESC LIMIT 1', [companyId, dnNo]);
    const dn = (dnRows as any[])[0];

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      await client.query(
        `INSERT INTO delivery_note_line_items (delivery_note_id,line_number,product_id,sku,description,ordered_qty,shipped_qty,unit_of_measure,stock_location) VALUES (?,?,?,?,?,?,?,?,?)`,
        [dn.id, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.shipped_qty, li.unit_of_measure || 'pcs', li.stock_location || null]
      );
    }

    const [dnItems] = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=? ORDER BY line_number', [dn.id]);
    return { ...dn, line_items: dnItems as any[] };
  });
};

export const updateDeliveryNote = async (companyId: string, dnId: string, userId: string, _userName: string, data: any) => {
  const dn = await getDeliveryNoteById(companyId, dnId);
  if (dn.status !== 'draft') throw new ConflictError('Only draft delivery notes can be edited');

  return withTransaction(async (client) => {
    let shipViaName = dn.ship_via_name;
    if (data.ship_via_id !== undefined) {
      if (data.ship_via_id) {
        const [svRes] = await client.query('SELECT name FROM ship_via WHERE id=? AND company_id=?', [data.ship_via_id, companyId]);
        shipViaName = (svRes as any[]).length ? (svRes as any[])[0].name : null;
      } else {
        shipViaName = null;
      }
    }

    if (data.line_items) {
      await client.query('DELETE FROM delivery_note_line_items WHERE delivery_note_id=?', [dnId]);
      const totalOrderedQty = data.line_items.reduce((s: number, li: any) => s + li.ordered_qty, 0);
      const totalShippedQty = data.line_items.reduce((s: number, li: any) => s + li.shipped_qty, 0);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO delivery_note_line_items (delivery_note_id,line_number,product_id,sku,description,ordered_qty,shipped_qty,unit_of_measure,stock_location) VALUES (?,?,?,?,?,?,?,?,?)`,
          [dnId, i + 1, li.product_id || null, li.sku || null, li.description, li.ordered_qty, li.shipped_qty, li.unit_of_measure || 'pcs', li.stock_location || null]
        );
      }
      await client.query(
        'UPDATE delivery_notes SET total_ordered_qty=?,total_shipped_qty=?,total_backordered_qty=? WHERE id=?',
        [totalOrderedQty, totalShippedQty, Math.max(0, totalOrderedQty - totalShippedQty), dnId]
      );
    }

    await client.query(
      `UPDATE delivery_notes SET
        po_number=COALESCE(?, po_number),
        reference_no=COALESCE(?, reference_no),
        delivery_date=COALESCE(?, delivery_date),
        due_date=?,
        shipment_date=?,
        ship_via_id=?,
        ship_via_name=?,
        ship_to=COALESCE(?, ship_to),
        notes=COALESCE(?, notes),
        updated_by=?,
        updated_at=NOW()
       WHERE id=?`,
      [
        data.po_number !== undefined ? data.po_number : null,
        data.reference_no !== undefined ? data.reference_no : null,
        data.delivery_date || null,
        data.due_date !== undefined ? data.due_date : dn.due_date,
        data.shipment_date !== undefined ? data.shipment_date : dn.shipment_date,
        data.ship_via_id !== undefined ? data.ship_via_id : dn.ship_via_id,
        shipViaName,
        data.ship_to !== undefined ? data.ship_to : null,
        data.notes !== undefined ? data.notes : null,
        userId,
        dnId,
      ]
    );
    return getDeliveryNoteById(companyId, dnId);
  });
};

export const deleteDeliveryNote = async (companyId: string, dnId: string) => {
  const dn = await getDeliveryNoteById(companyId, dnId);
  if (!['draft', 'ready_to_ship'].includes(dn.status)) throw new ConflictError('Cannot delete a delivery note that has been shipped');
  await pool.query('UPDATE delivery_notes SET deleted_at=NOW() WHERE id=? AND company_id=?', [dnId, companyId]);
};

export const updateStatus = async (companyId: string, dnId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const [dnRes] = await client.query('SELECT * FROM delivery_notes WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [dnId, companyId]);
    if (!(dnRes as any[]).length) throw new NotFoundError('Delivery Note');
    const dn = (dnRes as any[])[0];
    const allowed = VALID_TRANSITIONS[dn.status] || [];
    if (!allowed.includes(newStatus)) throw new ConflictError(`Cannot transition from ${dn.status} to ${newStatus}`);
    await client.query('UPDATE delivery_notes SET status=?,updated_at=NOW(),updated_by=? WHERE id=?', [newStatus, userId, dnId]);
    await createStatusHistory({ company_id: companyId, document_type: 'delivery_note', document_id: dnId, document_no: dn.delivery_note_no, from_status: dn.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);
    return { ...dn, status: newStatus };
  });
};

export const shipDeliveryNote = async (companyId: string, dnId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [dnRes] = await client.query('SELECT * FROM delivery_notes WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [dnId, companyId]);
    if (!(dnRes as any[]).length) throw new NotFoundError('Delivery Note');
    const dn = (dnRes as any[])[0];
    if (!['draft', 'ready_to_ship'].includes(dn.status)) throw new ConflictError('Delivery note must be draft or ready_to_ship to ship');

    const [itemsRes] = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=?', [dnId]);
    const items = itemsRes as any[];
    const inventoryTransactions: any[] = [];
    const stockUpdates: any[] = [];

    if (data.deduct_inventory !== false) {
      for (const item of items) {
        // Look up product by id first, fall back to SKU for manually-entered items
        let prodRows: any[] = [];
        if (item.product_id) {
          const [res] = await client.query('SELECT * FROM products WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [item.product_id, companyId]);
          prodRows = res as any[];
        }
        if (!prodRows.length && item.sku) {
          const [res] = await client.query('SELECT * FROM products WHERE sku=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [item.sku, companyId]);
          prodRows = res as any[];
        }
        if (!prodRows.length) continue;
        const product = prodRows[0];
        // Deduct stock for inventory-type products or products with track_inventory enabled
        if (!product.track_inventory && product.product_type !== 'inventory') continue;

        const balanceBefore = parseFloat(product.current_stock);
        const shippedQty = parseFloat(item.shipped_qty);

        if (balanceBefore < shippedQty) {
          throw new ConflictError(`Insufficient stock for SKU: ${product.sku}. Available: ${balanceBefore}, Required: ${shippedQty}`);
        }

        const balanceAfter = balanceBefore - shippedQty;
        const txNo = await generateDocumentNumber(companyId, 'inventory_transaction', client);

        await client.query(
          `INSERT INTO inventory_transactions (company_id,transaction_no,product_id,sku,transaction_type,transaction_date,quantity,unit_of_measure,balance_before,balance_after,stock_location,reference_type,reference_id,reference_no,created_by)
           VALUES (?,?,?,?,'delivery_note',NOW(),?,?,?,?,?,'delivery_note',?,?,?)`,
          [companyId, txNo, product.id, product.sku, -shippedQty, product.unit_of_measure, balanceBefore, balanceAfter, data.stock_location || item.stock_location, dnId, dn.delivery_note_no, userId]
        );

        await client.query('UPDATE products SET current_stock=?,updated_at=NOW() WHERE id=?', [balanceAfter, product.id]);
        await client.query('UPDATE delivery_note_line_items SET inventory_deducted=true WHERE id=?', [item.id]);

        inventoryTransactions.push({ transaction_no: txNo, product_id: product.id, sku: product.sku, quantity: -shippedQty, balance_before: balanceBefore, balance_after: balanceAfter });
        stockUpdates.push({ product_id: product.id, sku: product.sku, previous_stock: balanceBefore, new_stock: balanceAfter });
      }
    }

    const shipmentDate = data.shipment_date || new Date().toISOString().split('T')[0];
    await client.query('UPDATE delivery_notes SET status=\'shipped\',shipment_date=?,updated_at=NOW(),updated_by=? WHERE id=?', [shipmentDate, userId, dnId]);
    await createStatusHistory({ company_id: companyId, document_type: 'delivery_note', document_id: dnId, document_no: dn.delivery_note_no, from_status: dn.status, to_status: 'shipped', changed_by: userId, changed_by_name: userName }, client);

    return { delivery_note: { ...dn, status: 'shipped', shipment_date: shipmentDate }, inventory_transactions: inventoryTransactions, product_stock_updated: stockUpdates };
  });
};

export const markDelivered = async (companyId: string, dnId: string, userId: string, userName: string) => {
  return withTransaction(async (client) => {
    const [dnRes] = await client.query('SELECT * FROM delivery_notes WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [dnId, companyId]);
    if (!(dnRes as any[]).length) throw new NotFoundError('Delivery Note');
    const dn = (dnRes as any[])[0];
    if (!['shipped', 'in_transit'].includes(dn.status)) throw new ConflictError('Delivery note must be shipped or in_transit to mark as delivered');
    await client.query('UPDATE delivery_notes SET status=\'delivered\',updated_at=NOW(),updated_by=? WHERE id=?', [userId, dnId]);
    await createStatusHistory({ company_id: companyId, document_type: 'delivery_note', document_id: dnId, document_no: dn.delivery_note_no, from_status: dn.status, to_status: 'delivered', changed_by: userId, changed_by_name: userName }, client);
    return { ...dn, status: 'delivered' };
  });
};

export const convertToInvoice = async (companyId: string, dnId: string, userId: string, _userName: string, data: any) => {
  // Validate before allocating a sequence number
  const [dnCheck] = await pool.query('SELECT status, invoiced FROM delivery_notes WHERE id=? AND company_id=? AND deleted_at IS NULL', [dnId, companyId]);
  if (!(dnCheck as any[]).length) throw new NotFoundError('Delivery Note');
  if (!['shipped', 'delivered'].includes((dnCheck as any[])[0].status)) throw new ConflictError('Delivery Note must be shipped or delivered to convert to invoice');
  if ((dnCheck as any[])[0].invoiced) throw new ConflictError('Delivery Note already invoiced');

  // Generate the invoice number OUTSIDE the transaction
  const invNo = await generateDocumentNumber(companyId, 'invoice');

  return withTransaction(async (client) => {
    const [dnRes] = await client.query('SELECT * FROM delivery_notes WHERE id=? AND company_id=? AND deleted_at IS NULL', [dnId, companyId]);
    if (!(dnRes as any[]).length) throw new NotFoundError('Delivery Note');
    const dn = (dnRes as any[])[0];
    if (!['shipped', 'delivered'].includes(dn.status)) throw new ConflictError('Delivery Note must be shipped or delivered to convert to invoice');
    if (dn.invoiced) throw new ConflictError('Delivery Note already invoiced');

    const [itemsRes] = await client.query('SELECT * FROM delivery_note_line_items WHERE delivery_note_id=? ORDER BY line_number', [dnId]);
    const items = itemsRes as any[];

    // Get pricing from linked SO if available
    let soData: any = null;
    const soLineItemByProductId = new Map<string, any>();
    const soLineItemBySku = new Map<string, any>();
    const soLineItemsByPosition: any[] = [];

    if (dn.sales_order_id) {
      const [soRes] = await client.query('SELECT * FROM sales_orders WHERE id=?', [dn.sales_order_id]);
      if ((soRes as any[]).length) {
        soData = (soRes as any[])[0];
        const [soliRes] = await client.query(
          'SELECT * FROM sales_order_line_items WHERE sales_order_id=? ORDER BY line_number',
          [dn.sales_order_id]
        );
        for (const soli of (soliRes as any[])) {
          if (soli.product_id) soLineItemByProductId.set(soli.product_id, soli);
          if (soli.sku) soLineItemBySku.set((soli.sku as string).toLowerCase(), soli);
          soLineItemsByPosition.push(soli);
        }
      }
    }

    let subtotal = 0, taxAmount = 0;
    const invItems = [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      let rate = 0, taxRate = 0, itemTaxAmount = 0, itemTaxId: string | null = null;

      if (soData) {
        let soli: any = null;
        if (item.product_id && soLineItemByProductId.has(item.product_id)) {
          soli = soLineItemByProductId.get(item.product_id);
        } else if (item.sku && soLineItemBySku.has((item.sku as string).toLowerCase())) {
          soli = soLineItemBySku.get((item.sku as string).toLowerCase());
        } else if (soLineItemsByPosition[idx]) {
          soli = soLineItemsByPosition[idx];
        }

        if (soli) {
          rate     = parseFloat(soli.rate     || 0);
          taxRate  = parseFloat(soli.tax_rate || 0);
          itemTaxId = soli.tax_id || null;
        }
      }

      const lineTotal = parseFloat(item.shipped_qty) * rate;
      itemTaxAmount = lineTotal * (taxRate / 100);
      subtotal += lineTotal;
      taxAmount += itemTaxAmount;
      invItems.push({ ...item, rate, tax_rate: taxRate, tax_amount: itemTaxAmount, tax_id: itemTaxId });
    }

    const grandTotal = subtotal + taxAmount;
    const taxId = soData?.tax_id || null;
    const taxRate = soData ? parseFloat(soData.tax_rate || 0) : 0;

    await client.query(
      `INSERT INTO invoices (company_id,invoice_no,customer_id,customer_name,bill_to,ship_to,sales_order_id,delivery_note_id,po_number,reference_no,invoice_date,due_date,status,payment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,shipping_charges,grand_total,amount_paid,terms_and_conditions,notes,internal_notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft','unpaid',?,?,?,?,0,0,?,0,NULL,?,NULL,?,?)`,
      [companyId, invNo, dn.customer_id, dn.customer_name,
       soData?.bill_to || dn.bill_to || null, dn.ship_to || null,
       dn.sales_order_id || null, dnId,
       soData?.po_number || null, dn.delivery_note_no || null,
       data.invoice_date, data.due_date,
       subtotal, taxId, taxRate, taxAmount, grandTotal,
       data.notes || null, userId, userId]
    );
    const [invRows] = await client.query('SELECT * FROM invoices WHERE company_id=? AND invoice_no=? ORDER BY created_at DESC LIMIT 1', [companyId, invNo]);
    const inv = (invRows as any[])[0];

    for (let i = 0; i < invItems.length; i++) {
      const li = invItems[i];
      await client.query(
        `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,discount_per_item,tax_id,tax_rate,tax_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [inv.id, i + 1, li.product_id || null, li.sku || null, li.description || '', parseFloat(li.shipped_qty) || 1, li.unit_of_measure || 'pcs', li.rate, 0, li.tax_id || taxId, li.tax_rate, li.tax_amount]
      );
    }

    await client.query('UPDATE delivery_notes SET invoiced=true,invoice_id=?,status=\'accepted\',updated_at=NOW() WHERE id=?', [inv.id, dnId]);
    const [invLineItems] = await client.query('SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY line_number', [inv.id]);
    return { invoice: { ...inv, line_items: invLineItems as any[] }, delivery_note_updated: { id: dnId, invoiced: true, invoice_id: inv.id, status: 'accepted' } };
  });
};

export const getTracking = async (companyId: string, dnId: string) => {
  const dn = await getDeliveryNoteById(companyId, dnId);
  const [history] = await pool.query(
    'SELECT * FROM document_status_history WHERE document_type=? AND document_id=? ORDER BY created_at ASC', ['delivery_note', dnId]
  );
  return { delivery_note_no: dn.delivery_note_no, tracking_number: dn.tracking_number, ship_via_name: dn.ship_via_name, status: dn.status, shipment_date: dn.shipment_date, status_history: history as any[] };
};
