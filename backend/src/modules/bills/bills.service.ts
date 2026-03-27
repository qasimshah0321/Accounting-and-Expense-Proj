import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createStatusHistory } from '../../services/auditService';
import { createAutoJournalEntry, getSystemAccount } from '../accounting/accounting.service';

export const peekNextBillNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='bill'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'BILL-001';
  const { prefix, next_number, padding, include_date } = (rows as any[])[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listBills = async (companyId: string, filters: any) => {
  const conditions = ['company_id=?', 'deleted_at IS NULL'];
  const params: unknown[] = [companyId];

  if (filters.status) { conditions.push(`status=?`); params.push(filters.status); }
  if (filters.payment_status) { conditions.push(`payment_status=?`); params.push(filters.payment_status); }
  if (filters.vendor_id) { conditions.push(`vendor_id=?`); params.push(filters.vendor_id); }
  if (filters.overdue === 'true') { conditions.push(`due_date < CURDATE() AND payment_status != 'paid'`); }
  if (filters.search) { conditions.push(`(bill_no LIKE ? OR vendor_name LIKE ?)`); const s = `%${filters.search}%`; params.push(s, s); }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM bills WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id,bill_no,vendor_id,vendor_name,bill_date,due_date,status,payment_status,total_amount,amount_paid,amount_due FROM bills WHERE ${where} ORDER BY bill_date DESC LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { bills: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getBillById = async (companyId: string, billId: string) => {
  const [rows] = await pool.query('SELECT * FROM bills WHERE id=? AND company_id=? AND deleted_at IS NULL', [billId, companyId]);
  if (!(rows as any[]).length) throw new NotFoundError('Bill');
  const [items] = await pool.query('SELECT * FROM bill_line_items WHERE bill_id=? ORDER BY sort_order', [billId]);
  return { ...(rows as any[])[0], line_items: items as any[] };
};

export const createBill = async (companyId: string, userId: string, data: any) => {
  return withTransaction(async (client) => {
    const [vendRows] = await client.query('SELECT name FROM vendors WHERE id=? AND company_id=? AND deleted_at IS NULL', [data.vendor_id, companyId]);
    if (!(vendRows as any[]).length) throw new ValidationError('Vendor not found');
    const vendor = (vendRows as any[])[0];

    const billNo = await generateDocumentNumber(companyId, 'bill', client);
    const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate, 0);
    const taxAmount = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate * (li.tax_rate || 0) / 100, 0);
    const discountAmount = data.discount_amount || 0;
    const totalAmount = subtotal + taxAmount - discountAmount;

    await client.query(
      `INSERT INTO bills (company_id,bill_no,vendor_id,vendor_name,vendor_invoice_no,bill_date,due_date,status,payment_status,subtotal,tax_amount,discount_amount,total_amount,amount_paid,amount_due,notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,'draft','unpaid',?,?,?,?,0,?,?,?,?)`,
      [companyId, billNo, data.vendor_id, vendor.name, data.vendor_invoice_no || null, data.bill_date, data.due_date, subtotal, taxAmount, discountAmount, totalAmount, totalAmount, data.notes || null, userId, userId]
    );

    const [billRows] = await client.query('SELECT * FROM bills WHERE company_id=? AND bill_no=? ORDER BY created_at DESC LIMIT 1', [companyId, billNo]);
    const bill = (billRows as any[])[0];

    for (let i = 0; i < data.line_items.length; i++) {
      const li = data.line_items[i];
      const lineTotal = li.quantity * li.rate + (li.tax_amount || 0);
      await client.query(
        `INSERT INTO bill_line_items (bill_id,company_id,product_id,description,quantity,rate,tax_id,tax_rate,tax_amount,line_total,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [bill.id, companyId, li.product_id || null, li.description, li.quantity, li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0, lineTotal, i + 1]
      );
    }

    const [billItems] = await client.query('SELECT * FROM bill_line_items WHERE bill_id=? ORDER BY sort_order', [bill.id]);
    return { ...bill, line_items: billItems as any[] };
  });
};

export const updateBill = async (companyId: string, billId: string, userId: string, data: any) => {
  const bill = await getBillById(companyId, billId);
  if (bill.status !== 'draft') throw new ConflictError('Only draft bills can be edited');
  return withTransaction(async (client) => {
    let vendorName = bill.vendor_name;
    if (data.vendor_id && data.vendor_id !== bill.vendor_id) {
      const [vendRows] = await client.query('SELECT name FROM vendors WHERE id=? AND company_id=? AND deleted_at IS NULL', [data.vendor_id, companyId]);
      if (!(vendRows as any[]).length) throw new ValidationError('Vendor not found');
      vendorName = (vendRows as any[])[0].name;
    }

    await client.query(
      `UPDATE bills SET vendor_id=?,vendor_name=?,vendor_invoice_no=?,bill_date=?,due_date=?,notes=?,updated_by=?,updated_at=NOW() WHERE id=? AND company_id=?`,
      [data.vendor_id || bill.vendor_id, vendorName, data.vendor_invoice_no ?? bill.vendor_invoice_no, data.bill_date || bill.bill_date, data.due_date || bill.due_date, data.notes ?? bill.notes, userId, billId, companyId]
    );

    if (data.line_items) {
      await client.query('DELETE FROM bill_line_items WHERE bill_id=?', [billId]);
      const subtotal = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate, 0);
      const taxAmount = data.line_items.reduce((s: number, li: any) => s + li.quantity * li.rate * (li.tax_rate || 0) / 100, 0);
      const discountAmount = data.discount_amount ?? bill.discount_amount ?? 0;
      const totalAmount = subtotal + taxAmount - discountAmount;
      const amountDue = Math.max(0, totalAmount - parseFloat(bill.amount_paid));

      await client.query(
        'UPDATE bills SET subtotal=?,tax_amount=?,discount_amount=?,total_amount=?,amount_due=?,updated_by=?,updated_at=NOW() WHERE id=?',
        [subtotal, taxAmount, discountAmount, totalAmount, amountDue, userId, billId]
      );
      for (let i = 0; i < data.line_items.length; i++) {
        const li = data.line_items[i];
        const lineTotal = li.quantity * li.rate + (li.tax_amount || 0);
        await client.query(
          `INSERT INTO bill_line_items (bill_id,company_id,product_id,description,quantity,rate,tax_id,tax_rate,tax_amount,line_total,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [billId, companyId, li.product_id || null, li.description, li.quantity, li.rate, li.tax_id || null, li.tax_rate || 0, li.tax_amount || 0, lineTotal, i + 1]
        );
      }
    }
    return getBillById(companyId, billId);
  });
};

export const deleteBill = async (companyId: string, billId: string) => {
  const bill = await getBillById(companyId, billId);
  if (bill.status !== 'draft') throw new ConflictError('Only draft bills can be deleted');
  await pool.query('UPDATE bills SET deleted_at=NOW() WHERE id=? AND company_id=?', [billId, companyId]);
};

export const updateStatus = async (companyId: string, billId: string, userId: string, userName: string, newStatus: string, reason?: string) => {
  return withTransaction(async (client) => {
    const [billRows] = await client.query('SELECT * FROM bills WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [billId, companyId]);
    if (!(billRows as any[]).length) throw new NotFoundError('Bill');
    const bill = (billRows as any[])[0];
    await client.query('UPDATE bills SET status=?,updated_by=?,updated_at=NOW() WHERE id=?', [newStatus, userId, billId]);
    await createStatusHistory({ company_id: companyId, document_type: 'bill', document_id: billId, document_no: bill.bill_no, from_status: bill.status, to_status: newStatus, changed_by: userId, changed_by_name: userName, reason }, client);

    if (bill.status === 'draft' && newStatus === 'approved') {
      try {
        const expenseAccountId = await getSystemAccount(companyId, '5900', client);
        const apAccountId = await getSystemAccount(companyId, '2000', client);
        if (expenseAccountId && apAccountId) {
          const totalAmount = parseFloat(bill.total_amount) || 0;
          await createAutoJournalEntry(companyId, userId, userName, 'bill', billId, bill.bill_no, bill.bill_date, [
            { account_id: expenseAccountId, debit: totalAmount, credit: 0, description: 'Bill expense' },
            { account_id: apAccountId, debit: 0, credit: totalAmount, description: 'Accounts Payable' },
          ], `Bill ${bill.bill_no} approved`, client);
        }
      } catch (glErr) {
        console.error('GL auto-post failed for bill status change:', glErr);
      }
    }

    return { ...bill, status: newStatus };
  });
};

export const recordPayment = async (companyId: string, billId: string, userId: string, userName: string, data: any) => {
  return withTransaction(async (client) => {
    const [billRows] = await client.query('SELECT * FROM bills WHERE id=? AND company_id=? AND deleted_at IS NULL FOR UPDATE', [billId, companyId]);
    if (!(billRows as any[]).length) throw new NotFoundError('Bill');
    const bill = (billRows as any[])[0];
    const amountDue = parseFloat(bill.total_amount) - parseFloat(bill.amount_paid);
    if (data.amount > amountDue + 0.01) throw new ValidationError(`Payment exceeds amount due (${amountDue.toFixed(2)})`);

    const payNo = await generateDocumentNumber(companyId, 'vendor_payment', client);
    await client.query(
      `INSERT INTO vendor_payments (company_id,payment_no,vendor_id,vendor_name,payment_date,payment_method,bank_name,bank_account,transaction_reference,check_number,amount,bill_id,allocated_amount,status,payment_from_account,notes,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'paid',?,?,?,?)`,
      [companyId, payNo, bill.vendor_id, bill.vendor_name, data.payment_date, data.payment_method, data.bank_name || null, data.bank_account || null, data.transaction_reference || null, data.check_number || null, data.amount, billId, data.amount, data.payment_from_account || null, data.notes || null, userId, userId]
    );
    const [pmtRows] = await client.query('SELECT * FROM vendor_payments WHERE company_id=? AND payment_no=? ORDER BY created_at DESC LIMIT 1', [companyId, payNo]);
    const payment = (pmtRows as any[])[0];

    const newAmountPaid = parseFloat(bill.amount_paid) + data.amount;
    const newAmountDue = Math.max(0, parseFloat(bill.total_amount) - newAmountPaid);
    const paymentStatus = newAmountDue <= 0.01 ? 'paid' : 'partially_paid';
    await client.query(
      'UPDATE bills SET amount_paid=?,amount_due=?,payment_status=?,updated_by=?,updated_at=NOW() WHERE id=?',
      [newAmountPaid, newAmountDue, paymentStatus, userId, billId]
    );

    try {
      const apAccountId = await getSystemAccount(companyId, '2000', client);
      const cashAccountId = await getSystemAccount(companyId, '1000', client);
      if (apAccountId && cashAccountId) {
        await createAutoJournalEntry(companyId, userId, userName, 'vendor_payment', payment.id, payment.payment_no, data.payment_date, [
          { account_id: apAccountId, debit: data.amount, credit: 0, description: 'Accounts Payable' },
          { account_id: cashAccountId, debit: 0, credit: data.amount, description: 'Cash payment' },
        ], `Bill payment ${payment.payment_no} for Bill ${bill.bill_no}`, client);
      }
    } catch (glErr) {
      console.error('GL auto-post failed for bill payment:', glErr);
    }

    return { payment, bill_updated: { id: billId, payment_status: paymentStatus, amount_paid: newAmountPaid, amount_due: newAmountDue } };
  });
};

export const getBillPayments = async (companyId: string, billId: string, pagination: any) => {
  await getBillById(companyId, billId);
  const [countRows] = await pool.query('SELECT COUNT(*) as count FROM vendor_payments WHERE company_id=? AND bill_id=? AND deleted_at IS NULL', [companyId, billId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT * FROM vendor_payments WHERE company_id=? AND bill_id=? AND deleted_at IS NULL ORDER BY payment_date DESC LIMIT ? OFFSET ?`,
    [companyId, billId, pagination.limit, pagination.offset]
  );
  return { payments: rows as any[], pagination: buildPaginationMeta(pagination.page, pagination.limit, total) };
};

export const getOverdueBills = async (companyId: string, filters: any) => {
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM bills WHERE company_id=? AND due_date < CURDATE() AND payment_status != 'paid' AND deleted_at IS NULL`, [companyId]);
  const total = parseInt((countRows as any[])[0].count, 10);
  const [rows] = await pool.query(
    `SELECT id,bill_no,vendor_name,bill_date,due_date,total_amount,amount_paid,amount_due,status FROM bills WHERE company_id=? AND due_date < CURDATE() AND payment_status != 'paid' AND deleted_at IS NULL ORDER BY due_date ASC LIMIT ? OFFSET ?`,
    [companyId, filters.limit, filters.offset]
  );
  return { bills: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};
