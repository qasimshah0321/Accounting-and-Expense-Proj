import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog, createStatusHistory } from '../../services/auditService';
import { createAutoJournalEntry, getSystemAccount } from '../accounting/accounting.service';
import { recalcDNInvoicedQty } from '../delivery-notes/delivery-notes.service';

/** Returns the company-level delivery-note requirement setting */
export const getDnRequirement = async (companyId: string, client?: any): Promise<'mandatory' | 'optional'> => {
  const conn = client || pool;
  const [rows] = await conn.query('SELECT dn_requirement FROM companies WHERE id=?', [companyId]);
  if (!(rows as any[]).length) return 'optional';
  return (rows as any[])[0].dn_requirement || 'optional';
};

export const peekNextInvoiceNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='invoice'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'INV-001';
  const { prefix, next_number, padding, include_date } = (rows as any[])[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listInvoices = async (companyId: string, filters: any) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.status) { conditions.push(`status=?`); params.push(filters.status); }
  if (filters.payment_status) { conditions.push(`payment_status=?`); params.push(filters.payment_status); }
  if (filters.customer_id) { conditions.push(`customer_id=?`); params.push(filters.customer_id); }
  if (filters.overdue === 'true') { conditions.push(`due_date < CURDATE() AND payment_status != 'paid'`); }
  if (filters.date_from) { conditions.push(`invoice_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`invoice_date<=?`); params.push(filters.date_to); }
  if (filters.search) { conditions.push(`(invoice_no LIKE ? OR customer_name LIKE ?)`); const s = `%${filters.search}%`; params.push(s, s); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM invoices WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id,invoice_no,customer_id,customer_name,invoice_date,due_date,status,payment_status,grand_total,amount_paid,amount_due,created_at FROM invoices WHERE ${where} ORDER BY invoice_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { invoices: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getInvoiceById = async (companyId: string, invoiceId: string) => {
  const [rows] = await pool.query('SELECT * FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL', [invoiceId, companyId]);
  if (!(rows as any[]).length) throw new NotFoundError('Invoice');
  const [items] = await pool.query('SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY line_number', [invoiceId]);
  return { ...(rows as any[])[0], line_items: items as any[] };
};

export const createInvoice = async (companyId: string, userId: string, _userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [custRows] = await client.query('SELECT name,billing_address,shipping_address FROM customers WHERE id=? AND company_id=? AND deleted_at IS NULL', [data.customer_id, companyId]);
    if (!(custRows as any[]).length) throw new ValidationError('Customer not found');
    const cust = (custRows as any[])[0];

    // Enforce mandatory DN flow: invoice must reference a shipped/delivered Delivery Note
    const dnReq = await getDnRequirement(companyId, client);
    if (dnReq === 'mandatory') {
      if (!data.delivery_note_id) {
        throw new ConflictError('Delivery Note is required. Your company settings require invoices to be created from approved Delivery Notes.');
      }
      const [dnCheck] = await client.query(
        'SELECT status FROM delivery_notes WHERE id=? AND company_id=? AND deleted_at IS NULL',
        [data.delivery_note_id, companyId]
      );
      if (!(dnCheck as any[]).length) {
        throw new ValidationError('Referenced Delivery Note not found');
      }
      const dnStatus = (dnCheck as any[])[0].status;
      if (!['shipped', 'in_transit', 'delivered', 'partially_invoiced'].includes(dnStatus)) {
        throw new ConflictError(`Delivery Note must be shipped or delivered before invoicing (current status: ${dnStatus})`);
      }
    }

    const invNo = data.invoice_no || await generateDocumentNumber(companyId, 'invoice', client);
    const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate - (li.discount_per_item || 0), 0);
    const taxAmount = data.line_items.reduce((s: number, li: any) => s + (li.quantity * li.rate - (li.discount_per_item || 0)) * (li.tax_rate || 0) / 100, 0);
    const grandTotal = subtotal + taxAmount + (data.shipping_charges || 0) - (data.discount_amount || 0);

    await client.query(
      `INSERT INTO invoices (company_id,invoice_no,customer_id,customer_name,bill_to,ship_to,sales_order_id,delivery_note_id,po_number,reference_no,invoice_date,due_date,status,payment_status,subtotal,tax_id,tax_rate,tax_amount,discount_amount,shipping_charges,grand_total,amount_paid,amount_due,terms_and_conditions,notes,internal_notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'draft','unpaid',?,?,?,?,?,?,?,0,?,?,?,?,?,?)`,
      [companyId, invNo, data.customer_id, cust.name, data.bill_to || cust.billing_address, data.ship_to || cust.shipping_address, data.sales_order_id || null, data.delivery_note_id || null, data.po_number || null, data.reference_no || null, data.invoice_date, data.due_date, subtotal, data.tax_id || null, data.tax_rate || 0, taxAmount, data.discount_amount || 0, data.shipping_charges || 0, grandTotal, grandTotal, data.terms_and_conditions || null, data.notes || null, data.internal_notes || null, userId, userId]
    );

    const [invRows] = await client.query('SELECT * FROM invoices WHERE company_id=? AND invoice_no=? ORDER BY created_at DESC LIMIT 1', [companyId, invNo]);
    const inv = (invRows as any[])[0];

    const resolvedSoLineItemIds: string[] = [];

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];

      // When invoicing from a DN, resolve the SO line item link from the DN line item
      let soLineItemId: string | null = li.sales_order_line_item_id || null;
      if (!soLineItemId && li.dn_line_item_id) {
        const [dnliRows] = await client.query(
          'SELECT sales_order_line_item_id FROM delivery_note_line_items WHERE id = ?',
          [li.dn_line_item_id]
        );
        if ((dnliRows as any[]).length) {
          soLineItemId = (dnliRows as any[])[0].sales_order_line_item_id || null;
        }
      }

      await client.query(
        `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,discount_per_item,tax_id,tax_rate,tax_amount,sales_order_line_item_id,dn_line_item_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [inv.id, i + 1, li.product_id || null, li.sku || null, li.description, li.quantity, li.unit_of_measure || 'pcs', li.rate, li.discount_per_item || 0, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0, soLineItemId, li.dn_line_item_id || null]
      );

      // Track invoiced qty back on the sales order line item
      if (soLineItemId) {
        await client.query(
          `UPDATE sales_order_line_items SET invoiced_qty = invoiced_qty + ? WHERE id = ?`,
          [li.quantity, soLineItemId]
        );
        resolvedSoLineItemIds.push(soLineItemId);
      }
    }

    // Recalc DN invoiced qty and status if this invoice is linked to a DN
    if (data.delivery_note_id) {
      await recalcDNInvoicedQty(data.delivery_note_id, client);
    }

    // Mark any fully-invoiced sales orders as 'completed'
    // Also check via delivery_note_id → sales_order_id path (DN-based invoicing)
    const affectedSoLineItemIds = [...new Set(resolvedSoLineItemIds)];
    const affectedSoIds = new Set<string>();

    if (affectedSoLineItemIds.length > 0) {
      const [soLineRows] = await client.query(
        `SELECT DISTINCT sales_order_id FROM sales_order_line_items WHERE id IN (${affectedSoLineItemIds.map(() => '?').join(',')})`,
        affectedSoLineItemIds
      );
      for (const row of soLineRows as any[]) affectedSoIds.add(row.sales_order_id);
    }

    // Also check the SO linked via the DN (catches cases with partial DN invoicing)
    if (data.delivery_note_id) {
      const [dnSoRows] = await client.query(
        'SELECT sales_order_id FROM delivery_notes WHERE id = ? AND sales_order_id IS NOT NULL',
        [data.delivery_note_id]
      );
      if ((dnSoRows as any[]).length) affectedSoIds.add((dnSoRows as any[])[0].sales_order_id);
    }

    for (const soId of affectedSoIds) {
      // Use total invoiced across ALL invoices for this SO (sum from invoice_line_items via DN links)
      const [lineRows] = await client.query(
        `SELECT soli.id, soli.ordered_qty,
                COALESCE((
                  SELECT SUM(ili.quantity)
                  FROM invoice_line_items ili
                  JOIN invoices inv ON inv.id = ili.invoice_id
                  WHERE ili.sales_order_line_item_id = soli.id
                    AND inv.status != 'cancelled'
                    AND inv.deleted_at IS NULL
                ), 0) AS total_invoiced
         FROM sales_order_line_items soli
         WHERE soli.sales_order_id = ?`,
        [soId]
      );
      const fullyInvoiced = (lineRows as any[]).length > 0 && (lineRows as any[]).every(
        r => (parseFloat(r.total_invoiced) || 0) >= (parseFloat(r.ordered_qty) || 0)
      );
      if (fullyInvoiced) {
        await client.query(
          `UPDATE sales_orders SET status = 'completed', updated_at = NOW() WHERE id = ? AND status != 'completed'`,
          [soId]
        );
      }
    }

    const [invItems] = await client.query('SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY line_number', [inv.id]);
    return { ...inv, line_items: invItems as any[] };
  });
};

export const updateInvoice = async (companyId: string, invoiceId: string, userId: string, _userName: string, data: any) => {
  const inv = await getInvoiceById(companyId, invoiceId);
  if (inv.status !== 'draft') throw new ConflictError('Only draft invoices can be edited');

  return withTransaction(async (client) => {
    if (data.line_items) {
      await client.query('DELETE FROM invoice_line_items WHERE invoice_id=?', [invoiceId]);
      const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate - (li.discount_per_item || 0), 0);
      const taxAmount = data.line_items.reduce((s: number, li: any) => s + (li.quantity * li.rate - (li.discount_per_item || 0)) * (li.tax_rate || 0) / 100, 0);
      const grandTotal = subtotal + taxAmount + (data.shipping_charges || inv.shipping_charges || 0) - (data.discount_amount || inv.discount_amount || 0);
      await client.query('UPDATE invoices SET subtotal=?,tax_amount=?,grand_total=?,amount_due=GREATEST(0,?-amount_paid),updated_by=?,updated_at=NOW() WHERE id=?', [subtotal, taxAmount, grandTotal, grandTotal, userId, invoiceId]);
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        await client.query(
          `INSERT INTO invoice_line_items (invoice_id,line_number,product_id,sku,description,quantity,unit_of_measure,rate,discount_per_item,tax_id,tax_rate,tax_amount,sales_order_line_item_id,dn_line_item_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [invoiceId, i + 1, li.product_id || null, li.sku || null, li.description, li.quantity, li.unit_of_measure || 'pcs', li.rate, li.discount_per_item || 0, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0, li.sales_order_line_item_id || null, li.dn_line_item_id || null]
        );
      }
      // Recalc DN invoiced qty if invoice is linked to a DN
      const dnId = data.delivery_note_id || inv.delivery_note_id;
      if (dnId) {
        await recalcDNInvoicedQty(dnId, client);
      }
    }
    return getInvoiceById(companyId, invoiceId);
  });
};

export const deleteInvoice = async (companyId: string, invoiceId: string) => {
  const inv = await getInvoiceById(companyId, invoiceId);
  if (inv.status !== 'draft') throw new ConflictError('Only draft invoices can be deleted');
  await pool.query('UPDATE invoices SET deleted_at=NOW() WHERE id=? AND company_id=?', [invoiceId, companyId]);
  // Recalc DN invoiced qty if this invoice was linked to a DN
  if (inv.delivery_note_id) {
    const conn = await (pool as any).getConnection();
    try {
      await recalcDNInvoicedQty(inv.delivery_note_id, conn);
    } finally {
      conn.release();
    }
  }
};

export const updateStatus = async (companyId: string, invoiceId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const [invRows] = await client.query('SELECT * FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [invoiceId, companyId]);
    if (!(invRows as any[]).length) throw new NotFoundError('Invoice');
    const inv = (invRows as any[])[0];
    await client.query('UPDATE invoices SET status=?,updated_by=?,updated_at=NOW() WHERE id=?', [newStatus, userId, invoiceId]);
    await createStatusHistory({ company_id: companyId, document_type: 'invoice', document_id: invoiceId, document_no: inv.invoice_no, from_status: inv.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);

    if (inv.status === 'draft' && (newStatus === 'sent' || newStatus === 'approved')) {
      try {
        const arAccountId = await getSystemAccount(companyId, '1100', client);
        const revenueAccountId = await getSystemAccount(companyId, '4000', client);
        const taxPayableAccountId = await getSystemAccount(companyId, '2200', client);
        if (arAccountId && revenueAccountId) {
          const grandTotal = parseFloat(inv.grand_total) || 0;
          const subtotal = parseFloat(inv.subtotal) || 0;
          const taxAmt = parseFloat(inv.tax_amount) || 0;
          const lines: Array<{ account_id: string; debit: number; credit: number; description?: string }> = [
            { account_id: arAccountId, debit: grandTotal, credit: 0, description: 'Accounts Receivable' },
            { account_id: revenueAccountId, debit: 0, credit: subtotal, description: 'Sales Revenue' },
          ];
          if (taxAmt > 0 && taxPayableAccountId) {
            lines.push({ account_id: taxPayableAccountId, debit: 0, credit: taxAmt, description: 'Sales Tax Payable' });
          }
          const remainder = grandTotal - subtotal - taxAmt;
          if (Math.abs(remainder) > 0.001) {
            lines[1].credit = subtotal + remainder;
          }
          await createAutoJournalEntry(companyId, userId, userName, 'invoice', invoiceId, inv.invoice_no, inv.invoice_date, lines, `Invoice ${inv.invoice_no} posted`, client);
        }
      } catch (glErr) {
        console.error('GL auto-post failed for invoice status change:', glErr);
      }

      // ── COGS GL Entry: DR Cost of Goods Sold (5000) / CR Inventory (1200) ──
      // Only post for inventory-type products using cost_price (not selling rate).
      try {
        const cogsAccountId = await getSystemAccount(companyId, '5000', client);
        const inventoryAccountId = await getSystemAccount(companyId, '1200', client);
        if (cogsAccountId && inventoryAccountId) {
          const [lineRows] = await client.query(
            `SELECT ili.quantity, p.cost_price, p.product_type
             FROM invoice_line_items ili
             LEFT JOIN products p ON p.id = ili.product_id
             WHERE ili.invoice_id = ?`,
            [invoiceId]
          );
          let cogsTotal = 0;
          for (const item of lineRows as any[]) {
            if ((item.product_type || '') !== 'inventory') continue;
            const costPrice = parseFloat(item.cost_price) || 0;
            const qty = parseFloat(item.quantity) || 0;
            cogsTotal += qty * costPrice;
          }
          if (cogsTotal > 0) {
            await createAutoJournalEntry(
              companyId, userId, userName, 'invoice', invoiceId, inv.invoice_no, inv.invoice_date,
              [
                { account_id: cogsAccountId,     debit: cogsTotal, credit: 0,         description: 'Cost of Goods Sold' },
                { account_id: inventoryAccountId, debit: 0,         credit: cogsTotal, description: 'Inventory' },
              ],
              `COGS — Invoice ${inv.invoice_no}`,
              client
            );
          }
        }
      } catch (cogsErr) {
        console.error('COGS GL auto-post failed:', cogsErr);
      }
    }

    if (newStatus === 'approved') {
      let soId: string | null = inv.sales_order_id || null;
      if (!soId && inv.delivery_note_id) {
        const [dnRows] = await client.query('SELECT order_id FROM delivery_notes WHERE id=?', [inv.delivery_note_id]);
        if ((dnRows as any[]).length) soId = (dnRows as any[])[0].order_id;
      }
      if (soId) {
        await client.query(
          `UPDATE sales_orders SET status='completed', updated_at=NOW() WHERE id=? AND company_id=? AND deleted_at IS NULL`,
          [soId, companyId]
        );
      }

      // Determine whether to reduce inventory on invoice approval
      // Mandatory DN mode: NEVER reduce inventory here (DN already deducted)
      // Optional mode: reduce only if no shipped DN is linked
      const dnReq = await getDnRequirement(companyId, client);
      let skipInventory = false;
      if (dnReq === 'mandatory') {
        // In mandatory mode, inventory was always deducted at DN ship time
        skipInventory = true;
      } else if (inv.delivery_note_id) {
        const [dnStatusRows] = await client.query('SELECT status FROM delivery_notes WHERE id=? AND deleted_at IS NULL', [inv.delivery_note_id]);
        if ((dnStatusRows as any[]).length) {
          const dnStatus = (dnStatusRows as any[])[0].status;
          if (['shipped', 'in_transit', 'delivered'].includes(dnStatus)) {
            skipInventory = true;
          }
        }
      }

      if (!skipInventory) {
        const [lineRows] = await client.query('SELECT * FROM invoice_line_items WHERE invoice_id=?', [invoiceId]);
        for (const item of lineRows as any[]) {
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
          if (!product.track_inventory && product.product_type !== 'inventory') continue;

          const qty = parseFloat(item.quantity);
          const balanceBefore = parseFloat(product.current_stock);
          const balanceAfter = balanceBefore - qty;
          const txNo = await generateDocumentNumber(companyId, 'inventory_transaction', client);

          await client.query(
            `INSERT INTO inventory_transactions (company_id,transaction_no,product_id,sku,transaction_type,transaction_date,quantity,unit_of_measure,balance_before,balance_after,reference_type,reference_id,reference_no,created_by)
             VALUES (?,?,?,?,'invoice',NOW(),?,?,?,?,'invoice',?,?,?)`,
            [companyId, txNo, product.id, product.sku, -qty, product.unit_of_measure, balanceBefore, balanceAfter, invoiceId, inv.invoice_no, userId]
          );
          await client.query('UPDATE products SET current_stock=?,updated_at=NOW() WHERE id=?', [balanceAfter, product.id]);
        }
      }
    }

    return { ...inv, status: newStatus };
  });
};

export const recordPayment = async (companyId: string, invoiceId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [invRows] = await client.query('SELECT * FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [invoiceId, companyId]);
    if (!(invRows as any[]).length) throw new NotFoundError('Invoice');
    const inv = (invRows as any[])[0];
    const amountDue = parseFloat(inv.grand_total) - parseFloat(inv.amount_paid);

    if (data.amount > amountDue + 0.01) throw new ValidationError(`Payment amount (${data.amount}) exceeds amount due (${amountDue})`);

    const paymentNo = await generateDocumentNumber(companyId, 'payment', client);
    await client.query(
      `INSERT INTO customer_payments (company_id,payment_no,customer_id,customer_name,payment_date,payment_method,bank_name,bank_account,transaction_reference,check_number,amount,invoice_id,allocated_amount,status,deposit_to_account,notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'received',?,?,?,?)`,
      [companyId, paymentNo, inv.customer_id, inv.customer_name, data.payment_date, data.payment_method, data.bank_name || null, data.bank_account || null, data.transaction_reference || null, data.check_number || null, data.amount, invoiceId, data.amount, data.deposit_to_account || null, data.notes || null, userId, userId]
    );
    const [pmtRows] = await client.query('SELECT * FROM customer_payments WHERE company_id=? AND payment_no=? ORDER BY created_at DESC LIMIT 1', [companyId, paymentNo]);
    const payment = (pmtRows as any[])[0];

    const newAmountPaid = parseFloat(inv.amount_paid) + data.amount;
    const newAmountDue = parseFloat(inv.grand_total) - newAmountPaid;
    const paymentStatus = newAmountDue <= 0.01 ? 'paid' : 'partially_paid';
    const newStatus = newAmountDue <= 0.01 ? 'paid' : 'partially_paid';

    await client.query('UPDATE invoices SET amount_paid=?,payment_status=?,status=?,updated_by=?,updated_at=NOW() WHERE id=?', [newAmountPaid, paymentStatus, newStatus, userId, invoiceId]);
    await createAuditLog({ company_id: companyId, entity_type: 'invoice', entity_id: invoiceId, action: 'payment', user_id: userId, user_name: userName, description: `Payment of ${data.amount} recorded` }, client);

    try {
      const cashAccountId = await getSystemAccount(companyId, '1000', client);
      const arAccountId = await getSystemAccount(companyId, '1100', client);
      if (cashAccountId && arAccountId) {
        await createAutoJournalEntry(companyId, userId, userName, 'payment', payment.id, payment.payment_no, data.payment_date, [
          { account_id: cashAccountId, debit: data.amount, credit: 0, description: 'Cash received' },
          { account_id: arAccountId, debit: 0, credit: data.amount, description: 'Accounts Receivable' },
        ], `Payment ${payment.payment_no} for Invoice ${inv.invoice_no}`, client);
      }
    } catch (glErr) {
      console.error('GL auto-post failed for invoice payment:', glErr);
    }

    return { payment, invoice_updated: { id: invoiceId, status: newStatus, payment_status: paymentStatus, amount_paid: newAmountPaid, amount_due: Math.max(0, newAmountDue) } };
  });
};

export const getInvoicePayments = async (companyId: string, invoiceId: string, pagination: any) => {
  await getInvoiceById(companyId, invoiceId);
  const [countRows] = await pool.query('SELECT COUNT(*) as count FROM customer_payments WHERE company_id=? AND invoice_id=? AND deleted_at IS NULL', [companyId, invoiceId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT * FROM customer_payments WHERE company_id=? AND invoice_id=? AND deleted_at IS NULL ORDER BY payment_date DESC LIMIT ? OFFSET ?`,
    [companyId, invoiceId, pagination.limit, pagination.offset]
  );
  return { payments: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getOverdueInvoices = async (companyId: string, filters: any) => {
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM invoices WHERE company_id=? AND due_date < CURDATE() AND payment_status != 'paid' AND deleted_at IS NULL`, [companyId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id,invoice_no,customer_name,invoice_date,due_date,grand_total,amount_paid,amount_due,status FROM invoices WHERE company_id=? AND due_date < CURDATE() AND payment_status != 'paid' AND deleted_at IS NULL ORDER BY due_date ASC LIMIT ? OFFSET ?`,
    [companyId, filters.limit, filters.offset]
  );
  return { invoices: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};
