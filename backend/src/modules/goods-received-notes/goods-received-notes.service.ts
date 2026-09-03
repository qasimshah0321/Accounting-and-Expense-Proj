import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createStatusHistory } from '../../services/auditService';
import { createAutoJournalEntry, getSystemAccount } from '../accounting/accounting.service';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['approved', 'cancelled'],
  approved: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: ['partially_billed', 'billed'],
  partially_billed: ['billed'],
  billed: [],
  cancelled: [],
};

/** Recalculate received_qty on PO line items and update PO receipt_status/total_received_qty. */
const recalcPOReceivedQty = async (poId: string, client: any) => {
  await client.query('UPDATE purchase_order_line_items SET received_qty = 0 WHERE purchase_order_id = ?', [poId]);

  const [grouped] = await client.query(
    `SELECT grli.purchase_order_line_item_id, SUM(grli.received_qty) AS total_received
     FROM goods_received_note_line_items grli
     JOIN goods_received_notes grn ON grn.id = grli.grn_id
     WHERE grn.purchase_order_id = ? AND grn.deleted_at IS NULL AND grn.status != 'cancelled'
       AND grli.purchase_order_line_item_id IS NOT NULL
     GROUP BY grli.purchase_order_line_item_id`,
    [poId]
  );

  for (const row of (grouped as any[])) {
    await client.query(
      'UPDATE purchase_order_line_items SET received_qty = ? WHERE id = ?',
      [row.total_received, row.purchase_order_line_item_id]
    );
  }

  // Update PO totals
  const [totals] = await client.query(
    `SELECT COALESCE(SUM(ordered_qty), 0) AS total_ordered, COALESCE(SUM(received_qty), 0) AS total_received
     FROM purchase_order_line_items WHERE purchase_order_id = ?`,
    [poId]
  );
  const totalOrdered = parseFloat((totals as any[])[0].total_ordered) || 0;
  const totalReceived = parseFloat((totals as any[])[0].total_received) || 0;

  let receiptStatus = 'unreceived';
  if (totalReceived >= totalOrdered && totalOrdered > 0) receiptStatus = 'received';
  else if (totalReceived > 0) receiptStatus = 'partially_received';

  await client.query(
    'UPDATE purchase_orders SET total_received_qty=?, receipt_status=?, updated_at=NOW() WHERE id=?',
    [totalReceived, receiptStatus, poId]
  );
};

/** Mark all received line items as billed and set GRN status to billed. */
const recalcGRNBilledQty = async (grnId: string, client: any) => {
  // Mark all received qty as billed on line items
  await client.query(
    'UPDATE goods_received_note_line_items SET billed_qty = received_qty WHERE grn_id = ?',
    [grnId]
  );
  // Mark GRN as fully billed
  await client.query(
    "UPDATE goods_received_notes SET status='billed', billed=1, updated_at=NOW() WHERE id=?",
    [grnId]
  );
};

export const peekNextGRNNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='goods_received_note'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'GRN-001';
  const { prefix, next_number, padding } = (rows as any[])[0];
  return `${prefix}-${String(next_number).padStart(padding, '0')}`;
};

export const listGRNs = async (companyId: string, filters: any) => {
  const conditions = ['grn.company_id=?', 'grn.deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.status) { conditions.push('grn.status=?'); params.push(filters.status); }
  if (filters.vendor_id) { conditions.push('grn.vendor_id=?'); params.push(filters.vendor_id); }
  if (filters.purchase_order_id) { conditions.push('grn.purchase_order_id=?'); params.push(filters.purchase_order_id); }
  if (filters.search) {
    conditions.push('(grn.grn_no LIKE ? OR grn.vendor_name LIKE ?)');
    const s = `%${filters.search}%`;
    params.push(s, s);
  }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(
    `SELECT COUNT(*) as count FROM goods_received_notes grn WHERE ${where}`,
    params
  );
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT grn.id, grn.grn_no, grn.vendor_id, grn.vendor_name, grn.receipt_date,
            grn.status, grn.billed, grn.total_ordered_qty, grn.total_received_qty,
            grn.total_pending_qty, grn.created_at,
            po.purchase_order_no AS source_po_no
     FROM goods_received_notes grn
     LEFT JOIN purchase_orders po ON po.id = grn.purchase_order_id
     WHERE ${where}
     ORDER BY grn.receipt_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { grns: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getGRNById = async (companyId: string, grnId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM goods_received_notes WHERE id=? AND company_id=? AND deleted_at IS NULL',
    [grnId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Goods Received Note');
  const [items] = await pool.query(
    'SELECT * FROM goods_received_note_line_items WHERE grn_id=? ORDER BY line_number',
    [grnId]
  );
  return { ...(rows as any[])[0], line_items: items as any[] };
};

export const createGRN = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const [vendRows] = await client.query(
      'SELECT name, address, city, state, postal_code, country FROM vendors WHERE id=? AND company_id=? AND deleted_at IS NULL',
      [data.vendor_id, companyId]
    );
    if (!(vendRows as any[]).length) throw new ValidationError('Vendor not found');
    const vendor = (vendRows as any[])[0];
    const vendorAddress = [vendor.address, vendor.city, vendor.state, vendor.postal_code, vendor.country].filter(Boolean).join(', ');

    const grnNo = data.grn_no || await generateDocumentNumber(companyId, 'goods_received_note', client);
    const totalOrderedQty = data.line_items.reduce((s: number, li: any) => s + (parseFloat(li.ordered_qty) || 0), 0);
    const totalReceivedQty = data.line_items.reduce((s: number, li: any) => s + (parseFloat(li.received_qty) || 0), 0);
    const totalPendingQty = Math.max(0, totalOrderedQty - totalReceivedQty);

    await client.query(
      `INSERT INTO goods_received_notes
        (company_id, grn_no, vendor_id, vendor_name, vendor_address, purchase_order_id, reference_no,
         receipt_date, expected_date, carrier, tracking_number, deliver_to, status,
         total_ordered_qty, total_received_qty, total_pending_qty, notes, internal_notes, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft',?,?,?,?,?,?,?)`,
      [
        companyId, grnNo, data.vendor_id, vendor.name, vendorAddress,
        data.purchase_order_id || null, data.reference_no || null,
        data.receipt_date, data.expected_date || null,
        data.carrier || null, data.tracking_number || null, data.deliver_to || null,
        totalOrderedQty, totalReceivedQty, totalPendingQty,
        data.notes || null, data.internal_notes || null, userId, userId,
      ]
    );
    const [grnRows] = await client.query(
      'SELECT * FROM goods_received_notes WHERE company_id=? AND grn_no=? ORDER BY created_at DESC LIMIT 1',
      [companyId, grnNo]
    );
    const grn = (grnRows as any[])[0];

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      const pending = Math.max(0, (parseFloat(li.ordered_qty) || 0) - (parseFloat(li.received_qty) || 0));
      await client.query(
        `INSERT INTO goods_received_note_line_items
          (grn_id, company_id, line_number, product_id, sku, description, ordered_qty, received_qty,
           pending_qty, unit_of_measure, unit_cost, purchase_order_line_item_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          grn.id, companyId, i + 1, li.product_id || null, li.sku || null, li.description,
          li.ordered_qty, li.received_qty, pending,
          li.unit_of_measure || 'pcs', li.unit_cost || 0,
          li.purchase_order_line_item_id || null,
        ]
      );
    }

    if (data.purchase_order_id) {
      await recalcPOReceivedQty(data.purchase_order_id, client);
    }

    const [grnItems] = await client.query(
      'SELECT * FROM goods_received_note_line_items WHERE grn_id=? ORDER BY line_number',
      [grn.id]
    );
    return { ...grn, line_items: grnItems as any[] };
  });
};

export const updateGRN = async (companyId: string, grnId: string, userId: string, data: any) => {
  const grn = await getGRNById(companyId, grnId);
  if (grn.status !== 'draft') throw new ConflictError('Only draft GRNs can be edited');

  return withTransaction(async (client) => {
    if (data.line_items) {
      await client.query('DELETE FROM goods_received_note_line_items WHERE grn_id=?', [grnId]);
      const totalOrderedQty = data.line_items.reduce((s: number, li: any) => s + (parseFloat(li.ordered_qty) || 0), 0);
      const totalReceivedQty = data.line_items.reduce((s: number, li: any) => s + (parseFloat(li.received_qty) || 0), 0);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        const pending = Math.max(0, (parseFloat(li.ordered_qty) || 0) - (parseFloat(li.received_qty) || 0));
        await client.query(
          `INSERT INTO goods_received_note_line_items
            (grn_id, company_id, line_number, product_id, sku, description, ordered_qty, received_qty,
             pending_qty, unit_of_measure, unit_cost, purchase_order_line_item_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            grnId, companyId, i + 1, li.product_id || null, li.sku || null, li.description,
            li.ordered_qty, li.received_qty, pending,
            li.unit_of_measure || 'pcs', li.unit_cost || 0,
            li.purchase_order_line_item_id || null,
          ]
        );
      }
      await client.query(
        'UPDATE goods_received_notes SET total_ordered_qty=?,total_received_qty=?,total_pending_qty=? WHERE id=?',
        [totalOrderedQty, totalReceivedQty, Math.max(0, totalOrderedQty - totalReceivedQty), grnId]
      );
    }

    await client.query(
      `UPDATE goods_received_notes SET
        reference_no   = COALESCE(?, reference_no),
        receipt_date   = COALESCE(?, receipt_date),
        expected_date  = ?,
        carrier        = ?,
        tracking_number= ?,
        deliver_to     = COALESCE(?, deliver_to),
        notes          = COALESCE(?, notes),
        updated_by     = ?,
        updated_at     = NOW()
       WHERE id=?`,
      [
        data.reference_no !== undefined ? data.reference_no : null,
        data.receipt_date || null,
        data.expected_date !== undefined ? data.expected_date : grn.expected_date,
        data.carrier !== undefined ? data.carrier : grn.carrier,
        data.tracking_number !== undefined ? data.tracking_number : grn.tracking_number,
        data.deliver_to !== undefined ? data.deliver_to : null,
        data.notes !== undefined ? data.notes : null,
        userId, grnId,
      ]
    );

    const poId = data.purchase_order_id !== undefined ? data.purchase_order_id : grn.purchase_order_id;
    if (poId) await recalcPOReceivedQty(poId, client);

    return getGRNById(companyId, grnId);
  });
};

export const deleteGRN = async (companyId: string, grnId: string) => {
  const grn = await getGRNById(companyId, grnId);
  if (!['draft', 'approved'].includes(grn.status)) {
    throw new ConflictError('Cannot delete a GRN that has been received or billed');
  }
  await pool.query('UPDATE goods_received_notes SET deleted_at=NOW() WHERE id=? AND company_id=?', [grnId, companyId]);
  if (grn.purchase_order_id) {
    const conn = await (pool as any).getConnection();
    try {
      await recalcPOReceivedQty(grn.purchase_order_id, conn);
    } finally {
      conn.release();
    }
  }
};

export const updateStatus = async (
  companyId: string, grnId: string, userId: string, userName: string,
  newStatus: string, reason?: string
) => {
  return withTransaction(async (client) => {
    const [grnRes] = await client.query(
      'SELECT * FROM goods_received_notes WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [grnId, companyId]
    );
    if (!(grnRes as any[]).length) throw new NotFoundError('Goods Received Note');
    const grn = (grnRes as any[])[0];
    const allowed = VALID_TRANSITIONS[grn.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ConflictError(`Cannot transition from ${grn.status} to ${newStatus}`);
    }
    await client.query(
      'UPDATE goods_received_notes SET status=?,updated_at=NOW(),updated_by=? WHERE id=?',
      [newStatus, userId, grnId]
    );
    await createStatusHistory({
      company_id: companyId, document_type: 'goods_received_note',
      document_id: grnId, document_no: grn.grn_no,
      from_status: grn.status, to_status: newStatus,
      changed_by: userId, changed_by_name: userName, reason,
    }, client);
    return { ...grn, status: newStatus };
  });
};

export const receiveGoods = async (
  companyId: string, grnId: string, userId: string, userName: string, data: any
) => {
  return withTransaction(async (client) => {
    const [grnRes] = await client.query(
      'SELECT * FROM goods_received_notes WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
      [grnId, companyId]
    );
    if (!(grnRes as any[]).length) throw new NotFoundError('Goods Received Note');
    const grn = (grnRes as any[])[0];
    if (!['draft', 'approved'].includes(grn.status)) {
      throw new ConflictError('GRN must be draft or approved to receive goods');
    }

    const [itemsRes] = await client.query(
      'SELECT * FROM goods_received_note_line_items WHERE grn_id=?',
      [grnId]
    );
    const items = itemsRes as any[];
    const inventoryTransactions: any[] = [];
    const stockUpdates: any[] = [];

    if (data.add_to_inventory !== false) {
      for (const item of items) {
        const receivedQty = parseFloat(item.received_qty) || 0;
        if (receivedQty <= 0) continue;

        let prodRows: any[] = [];
        if (item.product_id) {
          const [res] = await client.query(
            'SELECT * FROM products WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
            [item.product_id, companyId]
          );
          prodRows = res as any[];
        }
        if (!prodRows.length && item.sku) {
          const [res] = await client.query(
            'SELECT * FROM products WHERE sku=? AND company_id=? AND deleted_at IS NULL FOR UPDATE',
            [item.sku, companyId]
          );
          prodRows = res as any[];
        }
        if (!prodRows.length) continue;
        const product = prodRows[0];
        if (!product.track_inventory && product.product_type !== 'inventory') continue;

        const balanceBefore = parseFloat(product.current_stock) || 0;
        const balanceAfter = balanceBefore + receivedQty;
        const txNo = await generateDocumentNumber(companyId, 'inventory_transaction', client);

        await client.query(
          `INSERT INTO inventory_transactions
            (company_id, transaction_no, product_id, sku, transaction_type, transaction_date,
             quantity, unit_of_measure, balance_before, balance_after, reference_type,
             reference_id, reference_no, created_by)
           VALUES (?,?,?,?,'goods_receipt',NOW(),?,?,?,?,'grn',?,?,?)`,
          [
            companyId, txNo, product.id, product.sku,
            receivedQty, product.unit_of_measure || item.unit_of_measure,
            balanceBefore, balanceAfter,
            grnId, grn.grn_no, userId,
          ]
        );

        // Weighted Average Cost: new_avg = (old_qty * old_avg + received_qty * unit_cost) / new_qty
        const unitCost = parseFloat(item.unit_cost) || 0;
        const currentAvgCost = parseFloat(product.avg_cost) || parseFloat(product.cost_price) || 0;
        const newAvgCost = (unitCost > 0 && balanceAfter > 0)
          ? (balanceBefore > 0
              ? (balanceBefore * currentAvgCost + receivedQty * unitCost) / balanceAfter
              : unitCost)
          : currentAvgCost;
        await client.query(
          'UPDATE products SET current_stock=?,avg_cost=?,updated_at=NOW() WHERE id=?',
          [balanceAfter, parseFloat(newAvgCost.toFixed(4)), product.id]
        );
        await client.query('UPDATE goods_received_note_line_items SET inventory_added=1 WHERE id=?', [item.id]);

        inventoryTransactions.push({ transaction_no: txNo, product_id: product.id, sku: product.sku, quantity: receivedQty, balance_before: balanceBefore, balance_after: balanceAfter });
        stockUpdates.push({ product_id: product.id, sku: product.sku, previous_stock: balanceBefore, new_stock: balanceAfter });
      }
    }

    const receiptDate = data.receipt_date || new Date().toISOString().split('T')[0];
    await client.query(
      "UPDATE goods_received_notes SET status='received',receipt_date=?,updated_at=NOW(),updated_by=? WHERE id=?",
      [receiptDate, userId, grnId]
    );
    await createStatusHistory({
      company_id: companyId, document_type: 'goods_received_note',
      document_id: grnId, document_no: grn.grn_no,
      from_status: grn.status, to_status: 'received',
      changed_by: userId, changed_by_name: userName,
    }, client);

    if (grn.purchase_order_id) {
      await recalcPOReceivedQty(grn.purchase_order_id, client);
    }

    // ── GL posting: DR Inventory / CR Accounts Payable ──────────────────────
    if (data.add_to_inventory !== false && inventoryTransactions.length > 0) {
      try {
        const inventoryAccountId = await getSystemAccount(companyId, '1200', client);
        const apAccountId = await getSystemAccount(companyId, '2000', client);
        if (inventoryAccountId && apAccountId) {
          let totalInventoryValue = 0;
          for (const item of items) {
            const receivedQty = parseFloat(item.received_qty) || 0;
            const unitCost = parseFloat(item.unit_cost) || 0;
            if (receivedQty > 0 && unitCost > 0) totalInventoryValue += receivedQty * unitCost;
          }
          if (totalInventoryValue > 0) {
            await createAutoJournalEntry(
              companyId, userId, userName, 'grn', grnId, grn.grn_no, receiptDate,
              [
                { account_id: inventoryAccountId, debit: totalInventoryValue, credit: 0, description: `Inventory received — ${grn.grn_no}` },
                { account_id: apAccountId, debit: 0, credit: totalInventoryValue, description: 'Accounts Payable' },
              ],
              `Goods received ${grn.grn_no}`,
              client
            );
          }
        }
      } catch (glErr) {
        console.error('GL auto-post failed for GRN receipt:', glErr);
      }
    }

    return {
      grn: { ...grn, status: 'received', receipt_date: receiptDate },
      inventory_transactions: inventoryTransactions,
      product_stock_updated: stockUpdates,
    };
  });
};

export const convertToBill = async (
  companyId: string, grnId: string, userId: string, data: any
) => {
  const [grnCheck] = await pool.query(
    'SELECT status, billed FROM goods_received_notes WHERE id=? AND company_id=? AND deleted_at IS NULL',
    [grnId, companyId]
  );
  if (!(grnCheck as any[]).length) throw new NotFoundError('Goods Received Note');
  const grnStatus = (grnCheck as any[])[0].status;
  if (!['received', 'partially_billed'].includes(grnStatus)) {
    throw new ConflictError(`GRN must be received to convert to bill (current: ${grnStatus})`);
  }
  if ((grnCheck as any[])[0].billed) throw new ConflictError('GRN already fully billed');

  const billNo = await generateDocumentNumber(companyId, 'bill');

  return withTransaction(async (client) => {
    const [grnRes] = await client.query(
      'SELECT * FROM goods_received_notes WHERE id=? AND company_id=? AND deleted_at IS NULL',
      [grnId, companyId]
    );
    const grn = (grnRes as any[])[0];

    const [itemsRes] = await client.query(
      'SELECT * FROM goods_received_note_line_items WHERE grn_id=? ORDER BY line_number',
      [grnId]
    );
    const items = itemsRes as any[];

    // Get pricing from linked PO if available
    const poLineItemByProductId = new Map<string, any>();
    const poLineItemBySku = new Map<string, any>();
    const poLineItemsByPosition: any[] = [];

    if (grn.purchase_order_id) {
      const [poliRes] = await client.query(
        'SELECT * FROM purchase_order_line_items WHERE purchase_order_id=? ORDER BY line_number',
        [grn.purchase_order_id]
      );
      for (const poli of (poliRes as any[])) {
        if (poli.product_id) poLineItemByProductId.set(poli.product_id, poli);
        if (poli.sku) poLineItemBySku.set((poli.sku as string).toLowerCase(), poli);
        poLineItemsByPosition.push(poli);
      }
    }

    let subtotal = 0, taxAmount = 0;
    const billItems = [];

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      let rate = parseFloat(item.unit_cost) || 0;
      let taxRate = 0, itemTaxId: string | null = null;

      let poli: any = null;
      if (item.product_id && poLineItemByProductId.has(item.product_id)) {
        poli = poLineItemByProductId.get(item.product_id);
      } else if (item.sku && poLineItemBySku.has((item.sku as string).toLowerCase())) {
        poli = poLineItemBySku.get((item.sku as string).toLowerCase());
      } else if (poLineItemsByPosition[idx]) {
        poli = poLineItemsByPosition[idx];
      }

      if (poli) {
        rate = parseFloat(poli.rate || rate);
        taxRate = parseFloat(poli.tax_rate || 0);
        itemTaxId = poli.tax_id || null;
      }

      const lineTotal = parseFloat(item.received_qty) * rate;
      const itemTaxAmount = lineTotal * (taxRate / 100);
      subtotal += lineTotal;
      taxAmount += itemTaxAmount;
      billItems.push({ ...item, rate, tax_rate: taxRate, tax_amount: itemTaxAmount, tax_id: itemTaxId, line_total: lineTotal });
    }

    const totalAmount = subtotal + taxAmount;

    await client.query(
      `INSERT INTO bills
        (company_id, bill_no, vendor_id, vendor_name, vendor_invoice_no, bill_date, due_date,
         status, payment_status, subtotal, tax_amount, discount_amount, total_amount,
         amount_paid, amount_due, notes, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,'draft','unpaid',?,?,0,?,0,?,?,?,?)`,
      [
        companyId, billNo, grn.vendor_id, grn.vendor_name,
        data.vendor_invoice_no || null,
        data.bill_date, data.due_date,
        subtotal, taxAmount, totalAmount, totalAmount,
        data.notes || grn.notes || null,
        userId, userId,
      ]
    );

    const [billRows] = await client.query(
      'SELECT * FROM bills WHERE company_id=? AND bill_no=? ORDER BY created_at DESC LIMIT 1',
      [companyId, billNo]
    );
    const bill = (billRows as any[])[0];

    for (let i = 0; i < billItems.length; i++) {
      const li = billItems[i];
      await client.query(
        `INSERT INTO bill_line_items
          (bill_id, company_id, product_id, description, quantity, rate, tax_id, tax_rate,
           tax_amount, line_total, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          bill.id, companyId, li.product_id || null,
          li.description || '', parseFloat(li.received_qty) || 0,
          li.rate, li.tax_id || null, li.tax_rate,
          li.tax_amount, li.line_total, i + 1,
        ]
      );
    }

    // Link bill to GRN and mark as billed
    await client.query(
      'UPDATE goods_received_notes SET bill_id=?,updated_at=NOW() WHERE id=?',
      [bill.id, grnId]
    );

    await recalcGRNBilledQty(grnId, client);

    const [billLineItems] = await client.query(
      'SELECT * FROM bill_line_items WHERE bill_id=? ORDER BY sort_order',
      [bill.id]
    );
    return {
      bill: { ...bill, line_items: billLineItems as any[] },
      grn_updated: { id: grnId, billed: 1, bill_id: bill.id, status: 'billed' },
    };
  });
};

export const getTracking = async (companyId: string, grnId: string) => {
  const grn = await getGRNById(companyId, grnId);
  const [history] = await pool.query(
    'SELECT * FROM document_status_history WHERE document_type=? AND document_id=? ORDER BY created_at ASC',
    ['goods_received_note', grnId]
  );
  return {
    grn_no: grn.grn_no,
    carrier: grn.carrier,
    tracking_number: grn.tracking_number,
    status: grn.status,
    receipt_date: grn.receipt_date,
    status_history: history as any[],
  };
};
