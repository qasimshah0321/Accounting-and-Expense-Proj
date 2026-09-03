import { Connection } from 'mysql2/promise';
import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog } from '../../services/auditService';

// ─── Chart of Accounts ─────────────────────────────────────────────────────

export const listAccounts = async (companyId: string, filters: any) => {
  const conditions = ['company_id=?'];
  const params: unknown[] = [companyId];

  if (filters.account_type) {
    conditions.push(`account_type=?`);
    params.push(filters.account_type);
  }
  if (filters.is_active !== undefined && filters.is_active !== '') {
    conditions.push(`is_active=?`);
    params.push(filters.is_active === 'true' || filters.is_active === true);
  }
  if (filters.search) {
    conditions.push(`(name LIKE ? OR account_number LIKE ?)`);
    const s = `%${filters.search}%`;
    params.push(s, s);
  }

  const where = conditions.join(' AND ');
  const [rows] = await pool.query(
    `SELECT id, account_number, name, account_type, sub_type, parent_id, description, is_active, is_system, normal_balance, balance, created_at, updated_at
     FROM chart_of_accounts WHERE ${where} ORDER BY account_number ASC`,
    params
  );
  return { accounts: rows as any[] };
};

export const getAccountById = async (companyId: string, accountId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM chart_of_accounts WHERE id=? AND company_id=?',
    [accountId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Account');
  return (rows as any[])[0];
};

const inferNormalBalance = (accountType: string): string => {
  if (accountType === 'asset' || accountType === 'expense') return 'debit';
  return 'credit';
};

export const createAccount = async (companyId: string, userId: string, data: any) => {
  const normalBalance = data.normal_balance || inferNormalBalance(data.account_type);

  const [existing] = await pool.query(
    'SELECT id FROM chart_of_accounts WHERE company_id=? AND account_number=?',
    [companyId, data.account_number]
  );
  if ((existing as any[]).length) throw new ConflictError(`Account number ${data.account_number} already exists`);

  if (data.parent_id) {
    const [parentRows] = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE id=? AND company_id=?',
      [data.parent_id, companyId]
    );
    if (!(parentRows as any[]).length) throw new ValidationError('Parent account not found');
  }

  await pool.query(
    `INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, description, is_active, normal_balance)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [companyId, data.account_number, data.name, data.account_type, data.sub_type || null, data.parent_id || null, data.description || null, data.is_active !== false, normalBalance]
  );
  const [newRows] = await pool.query(
    'SELECT * FROM chart_of_accounts WHERE company_id=? AND account_number=? ORDER BY created_at DESC LIMIT 1',
    [companyId, data.account_number]
  );
  return (newRows as any[])[0];
};

export const updateAccount = async (companyId: string, accountId: string, data: any) => {
  const account = await getAccountById(companyId, accountId);

  if (account.is_system) {
    if (data.account_type && data.account_type !== account.account_type) {
      throw new ConflictError('Cannot change account type of a system account');
    }
    if (data.account_number && data.account_number !== account.account_number) {
      throw new ConflictError('Cannot change account number of a system account');
    }
  }

  if (data.account_number && data.account_number !== account.account_number) {
    const [existing] = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE company_id=? AND account_number=? AND id!=?',
      [companyId, data.account_number, accountId]
    );
    if ((existing as any[]).length) throw new ConflictError(`Account number ${data.account_number} already exists`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const allowedFields = ['account_number', 'name', 'account_type', 'sub_type', 'parent_id', 'description', 'normal_balance', 'is_active'];
  for (const f of allowedFields) {
    if (data[f] !== undefined) {
      fields.push(`${f}=?`);
      values.push(data[f]);
    }
  }
  if (!fields.length) return account;

  fields.push(`updated_at=NOW()`);

  await pool.query(
    `UPDATE chart_of_accounts SET ${fields.join(', ')} WHERE id=? AND company_id=?`,
    [...values, accountId, companyId]
  );
  return getAccountById(companyId, accountId);
};

export const deleteAccount = async (companyId: string, accountId: string) => {
  const account = await getAccountById(companyId, accountId);
  if (account.is_system) throw new ConflictError('Cannot delete a system account');

  const [jeLines] = await pool.query(
    'SELECT id FROM journal_entry_lines WHERE account_id=? LIMIT 1',
    [accountId]
  );
  if ((jeLines as any[]).length) throw new ConflictError('Cannot delete an account with journal entries');

  await pool.query('DELETE FROM chart_of_accounts WHERE id=? AND company_id=?', [accountId, companyId]);
};

// ─── Journal Entries ─────────────────────────────────────────────────────────

export const peekNextJournalEntryNumber = async (companyId: string): Promise<string> => {
  const [rows] = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=? AND document_type='journal_entry'`,
    [companyId]
  );
  if (!(rows as any[]).length) return 'JE-00001';
  const { prefix, next_number, padding, include_date } = (rows as any[])[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listJournalEntries = async (companyId: string, filters: any) => {
  const conditions = ['je.company_id=?'];
  const params: unknown[] = [companyId];

  if (filters.status) { conditions.push(`je.status=?`); params.push(filters.status); }
  if (filters.date_from) { conditions.push(`je.entry_date>=?`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`je.entry_date<=?`); params.push(filters.date_to); }
  if (filters.reference_type) { conditions.push(`je.reference_type=?`); params.push(filters.reference_type); }
  if (filters.search) {
    conditions.push(`(je.entry_no LIKE ? OR je.description LIKE ?)`);
    const s = `%${filters.search}%`;
    params.push(s, s);
  }

  const where = conditions.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM journal_entries je WHERE ${where}`, params);
  const total = parseInt((countRows as any[])[0].count, 10);

  const [rows] = await pool.query(
    `SELECT je.id, je.entry_no, je.entry_date, je.description, je.reference_type, je.reference_no, je.status, je.created_at,
       COALESCE(SUM(jel.debit), 0) AS total_debit,
       COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM journal_entries je
     LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
     WHERE ${where}
     GROUP BY je.id, je.entry_no, je.entry_date, je.description, je.reference_type, je.reference_no, je.status, je.created_at
     ORDER BY je.entry_date DESC, je.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, filters.limit, filters.offset]
  );
  return { journal_entries: rows as any[], pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getJournalEntryById = async (companyId: string, jeId: string) => {
  const [rows] = await pool.query(
    'SELECT * FROM journal_entries WHERE id=? AND company_id=?',
    [jeId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Journal entry');

  const [lines] = await pool.query(
    `SELECT jel.*, coa.account_number, coa.name AS account_name
     FROM journal_entry_lines jel
     JOIN chart_of_accounts coa ON coa.id = jel.account_id
     WHERE jel.journal_entry_id=?
     ORDER BY jel.line_number`,
    [jeId]
  );
  return { ...(rows as any[])[0], lines: lines as any[] };
};

export const createJournalEntry = async (companyId: string, userId: string, userName: string, data: any) => {
  const totalDebit = data.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
  const totalCredit = data.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new ValidationError(`Journal entry is not balanced: debits (${totalDebit}) != credits (${totalCredit})`);
  }

  for (const line of data.lines) {
    if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
      throw new ValidationError('A line cannot have both debit and credit amounts');
    }
  }

  return withTransaction(async (client) => {
    const entryNo = data.entry_no || await generateDocumentNumber(companyId, 'journal_entry' as any, client);

    await client.query(
      `INSERT INTO journal_entries (company_id, entry_no, entry_date, description, reference_type, reference_id, reference_no, status, created_by, posted_by, posted_at)
       VALUES (?,?,?,?,?,?,?,'posted',?,?,NOW())`,
      [companyId, entryNo, data.entry_date, data.description || null, data.reference_type || null, data.reference_id || null, data.reference_no || null, userId, userId]
    );

    const [jeRows] = await client.query(
      'SELECT * FROM journal_entries WHERE company_id=? AND entry_no=? ORDER BY created_at DESC LIMIT 1',
      [companyId, entryNo]
    );
    const je = (jeRows as any[])[0];

    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      const debit = line.debit || 0;
      const credit = line.credit || 0;

      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number)
         VALUES (?,?,?,?,?,?)`,
        [je.id, line.account_id, line.description || null, debit, credit, i + 1]
      );

      const [acctRows] = await client.query(
        'SELECT normal_balance FROM chart_of_accounts WHERE id=?',
        [line.account_id]
      );
      if ((acctRows as any[]).length) {
        const normalBalance = (acctRows as any[])[0].normal_balance;
        const delta = normalBalance === 'debit' ? (debit - credit) : (credit - debit);
        await client.query(
          'UPDATE chart_of_accounts SET balance = balance + ?, updated_at = NOW() WHERE id = ?',
          [delta, line.account_id]
        );
      }
    }

    await createAuditLog({
      company_id: companyId,
      entity_type: 'journal_entry',
      entity_id: je.id,
      action: 'create',
      user_id: userId,
      user_name: userName,
      description: `Journal entry ${entryNo} posted`,
    }, client);

    const [lines] = await client.query(
      `SELECT jel.*, coa.account_number, coa.name AS account_name
       FROM journal_entry_lines jel
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE jel.journal_entry_id=?
       ORDER BY jel.line_number`,
      [je.id]
    );

    return { ...je, lines: lines as any[] };
  });
};

export const updateJournalEntry = async (companyId: string, jeId: string, userId: string, userName: string, data: any) => {
  const totalDebit = data.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
  const totalCredit = data.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new ValidationError(`Journal entry is not balanced: debits (${totalDebit.toFixed(2)}) != credits (${totalCredit.toFixed(2)})`);
  }
  for (const line of data.lines) {
    if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
      throw new ValidationError('A line cannot have both debit and credit amounts');
    }
  }

  const existing = await getJournalEntryById(companyId, jeId);
  if (existing.status === 'reversed') throw new ConflictError('Cannot edit a reversed journal entry');

  return withTransaction(async (client) => {
    // Reverse old balance effects
    for (const line of existing.lines) {
      const debit = parseFloat(line.debit) || 0;
      const credit = parseFloat(line.credit) || 0;
      const [acctRows] = await client.query('SELECT normal_balance FROM chart_of_accounts WHERE id=?', [line.account_id]);
      if ((acctRows as any[]).length) {
        const normalBalance = (acctRows as any[])[0].normal_balance;
        const delta = normalBalance === 'debit' ? (debit - credit) : (credit - debit);
        await client.query('UPDATE chart_of_accounts SET balance = balance - ?, updated_at = NOW() WHERE id = ?', [delta, line.account_id]);
      }
    }

    // Delete old lines
    await client.query('DELETE FROM journal_entry_lines WHERE journal_entry_id=?', [jeId]);

    // Update header
    await client.query(
      `UPDATE journal_entries SET entry_date=?, description=?, reference_no=?, updated_at=NOW() WHERE id=? AND company_id=?`,
      [data.entry_date, data.description || null, data.reference_no || null, jeId, companyId]
    );

    // Insert new lines and apply new balance effects
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      const debit = line.debit || 0;
      const credit = line.credit || 0;
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number) VALUES (?,?,?,?,?,?)`,
        [jeId, line.account_id, line.description || null, debit, credit, i + 1]
      );
      const [acctRows] = await client.query('SELECT normal_balance FROM chart_of_accounts WHERE id=?', [line.account_id]);
      if ((acctRows as any[]).length) {
        const normalBalance = (acctRows as any[])[0].normal_balance;
        const delta = normalBalance === 'debit' ? (debit - credit) : (credit - debit);
        await client.query('UPDATE chart_of_accounts SET balance = balance + ?, updated_at = NOW() WHERE id = ?', [delta, line.account_id]);
      }
    }

    await createAuditLog({
      company_id: companyId,
      entity_type: 'journal_entry',
      entity_id: jeId,
      action: 'update',
      user_id: userId,
      user_name: userName,
      description: `Journal entry ${existing.entry_no} updated`,
    }, client);

    return await getJournalEntryById(companyId, jeId);
  });
};

export const reverseJournalEntry = async (companyId: string, jeId: string, userId: string, userName: string) => {
  const je = await getJournalEntryById(companyId, jeId);
  if (je.status === 'reversed') throw new ConflictError('Journal entry is already reversed');

  const reversalLines = je.lines.map((line: any) => ({
    account_id: line.account_id,
    debit: parseFloat(line.credit) || 0,
    credit: parseFloat(line.debit) || 0,
    description: `Reversal: ${line.description || ''}`,
  }));

  const reversal = await createJournalEntry(companyId, userId, userName, {
    entry_date: new Date().toISOString().split('T')[0],
    description: `Reversal of ${je.entry_no}: ${je.description || ''}`,
    reference_type: 'reversal',
    reference_id: jeId,
    reference_no: je.entry_no,
    lines: reversalLines,
  });

  await pool.query(
    'UPDATE journal_entries SET status=?, reversed_by=?, updated_at=NOW() WHERE id=?',
    ['reversed', reversal.id, jeId]
  );

  return reversal;
};

// ─── GL Reports ──────────────────────────────────────────────────────────────

export const getGeneralLedger = async (companyId: string, accountId: string, startDate: string, endDate: string) => {
  const account = await getAccountById(companyId, accountId);

  // Opening balance: all transactions before startDate, PLUS any opening_balance entries
  // (opening_balance entries always count as opening balance regardless of their date)
  const [openingRows] = await pool.query(
    `SELECT COALESCE(SUM(jel.debit), 0) AS total_debit, COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     WHERE jel.account_id = ? AND je.company_id = ? AND je.status = 'posted'
       AND (je.entry_date < ? OR je.reference_type = 'opening_balance')`,
    [accountId, companyId, startDate]
  );
  const openingDebit = parseFloat((openingRows as any[])[0].total_debit);
  const openingCredit = parseFloat((openingRows as any[])[0].total_credit);
  const openingBalance = account.normal_balance === 'debit'
    ? openingDebit - openingCredit
    : openingCredit - openingDebit;

  // Period transactions: date range, excluding opening_balance entries (they show as opening balance row)
  const [transactions] = await pool.query(
    `SELECT jel.id, jel.debit, jel.credit, jel.description AS line_description,
       je.id AS journal_entry_id, je.entry_no, je.entry_date, je.description, je.reference_type, je.reference_no
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     WHERE jel.account_id = ? AND je.company_id = ? AND je.entry_date >= ? AND je.entry_date <= ?
       AND je.status = 'posted' AND je.reference_type != 'opening_balance'
     ORDER BY je.entry_date ASC, je.created_at ASC`,
    [accountId, companyId, startDate, endDate]
  );

  let runningBalance = openingBalance;
  const transactionsWithBalance = (transactions as any[]).map((t: any) => {
    const debit = parseFloat(t.debit);
    const credit = parseFloat(t.credit);
    const delta = account.normal_balance === 'debit' ? (debit - credit) : (credit - debit);
    runningBalance += delta;
    return { ...t, running_balance: runningBalance };
  });

  return {
    account: {
      id: account.id,
      account_number: account.account_number,
      name: account.name,
      account_type: account.account_type,
      normal_balance: account.normal_balance,
    },
    opening_balance: openingBalance,
    transactions: transactionsWithBalance,
    closing_balance: runningBalance,
  };
};

export const getGeneralLedgerAll = async (companyId: string, startDate: string, endDate: string) => {
  const [accountRows] = await pool.query(
    `SELECT DISTINCT coa.id, coa.account_number, coa.name, coa.account_type, coa.normal_balance
     FROM chart_of_accounts coa
     JOIN journal_entry_lines jel ON jel.account_id = coa.id
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     WHERE coa.company_id = ? AND je.status = 'posted' AND je.entry_date <= ?
     ORDER BY coa.account_number`,
    [companyId, endDate]
  );
  const results = [];
  for (const account of (accountRows as any[])) {
    const ledger = await getGeneralLedger(companyId, account.id.toString(), startDate, endDate);
    results.push(ledger);
  }
  return results;
};

export const getTrialBalance = async (companyId: string, asOfDate?: string) => {
  let query: string;
  let params: unknown[];

  if (asOfDate) {
    query = `
      SELECT coa.id, coa.account_number, coa.name, coa.account_type, coa.sub_type, coa.normal_balance,
        COALESCE(SUM(jel.debit), 0) AS total_debit,
        COALESCE(SUM(jel.credit), 0) AS total_credit
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' AND je.entry_date <= ?
      WHERE coa.company_id = ?
      GROUP BY coa.id, coa.account_number, coa.name, coa.account_type, coa.sub_type, coa.normal_balance
      HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
      ORDER BY coa.account_number`;
    params = [asOfDate, companyId];
  } else {
    query = `
      SELECT id, account_number, name, account_type, sub_type, normal_balance, balance
      FROM chart_of_accounts
      WHERE company_id = ? AND balance != 0
      ORDER BY account_number`;
    params = [companyId];
  }

  const [rows] = await pool.query(query, params);

  let totalDebits = 0;
  let totalCredits = 0;

  const accounts = (rows as any[]).map((row: any) => {
    let balance: number;
    if (asOfDate) {
      const totalDebit = parseFloat(row.total_debit);
      const totalCredit = parseFloat(row.total_credit);
      balance = row.normal_balance === 'debit'
        ? totalDebit - totalCredit
        : totalCredit - totalDebit;
    } else {
      balance = parseFloat(row.balance);
    }

    let debitBalance = 0;
    let creditBalance = 0;

    if (row.normal_balance === 'debit') {
      if (balance >= 0) { debitBalance = balance; } else { creditBalance = Math.abs(balance); }
    } else {
      if (balance >= 0) { creditBalance = balance; } else { debitBalance = Math.abs(balance); }
    }

    totalDebits += debitBalance;
    totalCredits += creditBalance;

    return {
      id: row.id,
      account_number: row.account_number,
      name: row.name,
      account_type: row.account_type,
      sub_type: row.sub_type,
      normal_balance: row.normal_balance,
      debit_balance: debitBalance,
      credit_balance: creditBalance,
    };
  });

  const grouped: Record<string, any[]> = { asset: [], liability: [], equity: [], revenue: [], expense: [] };
  for (const acct of accounts) {
    if (grouped[acct.account_type]) {
      grouped[acct.account_type].push(acct);
    }
  }

  return {
    accounts: grouped,
    totals: {
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    },
  };
};

// ─── Helper Functions for Auto-Posting ──────────────────────────────────────

export const getSystemAccount = async (companyId: string, accountNumber: string, client?: Connection) => {
  const queryFn = client ? client : pool;
  const [rows] = await queryFn.query(
    'SELECT id FROM chart_of_accounts WHERE company_id=? AND account_number=?',
    [companyId, accountNumber]
  );
  if (!(rows as any[]).length) return null;
  return (rows as any[])[0].id;
};

export const seedChartOfAccounts = async (companyId: string, client?: Connection) => {
  const queryFn = client ? client : pool;
  const accounts = [
    { number: '1000', name: 'Cash and Cash Equivalents',       type: 'asset',   sub: 'current_asset',       nb: 'debit' },
    { number: '1010', name: 'Petty Cash',                      type: 'asset',   sub: 'current_asset',       nb: 'debit' },
    { number: '1100', name: 'Accounts Receivable',             type: 'asset',   sub: 'current_asset',       nb: 'debit' },
    { number: '1150', name: 'Allowance for Doubtful Accounts', type: 'asset',   sub: 'current_asset',       nb: 'credit' },
    { number: '1200', name: 'Inventory',                       type: 'asset',   sub: 'current_asset',       nb: 'debit' },
    { number: '1250', name: 'Input Tax Recoverable',           type: 'asset',   sub: 'current_asset',       nb: 'debit' },
    { number: '1300', name: 'Prepaid Expenses',                type: 'asset',   sub: 'current_asset',       nb: 'debit' },
    { number: '1500', name: 'Property, Plant & Equipment',     type: 'asset',   sub: 'fixed_asset',         nb: 'debit' },
    { number: '1510', name: 'Accumulated Depreciation',        type: 'asset',   sub: 'fixed_asset',         nb: 'credit' },
    { number: '1900', name: 'Other Assets',                    type: 'asset',   sub: 'other_asset',         nb: 'debit' },
    { number: '2000', name: 'Accounts Payable',                type: 'liability', sub: 'current_liability', nb: 'credit' },
    { number: '2100', name: 'Accrued Expenses',                type: 'liability', sub: 'current_liability', nb: 'credit' },
    { number: '2200', name: 'Sales Tax Payable',               type: 'liability', sub: 'current_liability', nb: 'credit' },
    { number: '2300', name: 'Short-term Loans',                type: 'liability', sub: 'current_liability', nb: 'credit' },
    { number: '2500', name: 'Long-term Debt',                  type: 'liability', sub: 'long_term_liability', nb: 'credit' },
    { number: '3000', name: "Owner's Equity",                  type: 'equity',  sub: 'equity',              nb: 'credit' },
    { number: '3050', name: 'Opening Balance Equity',          type: 'equity',  sub: 'equity',              nb: 'credit' },
    { number: '3100', name: 'Retained Earnings',               type: 'equity',  sub: 'equity',              nb: 'credit' },
    { number: '3200', name: "Owner's Drawing",                 type: 'equity',  sub: 'equity',              nb: 'debit' },
    { number: '4000', name: 'Sales Revenue',                   type: 'revenue', sub: 'operating_revenue',   nb: 'credit' },
    { number: '4100', name: 'Service Revenue',                 type: 'revenue', sub: 'operating_revenue',   nb: 'credit' },
    { number: '4900', name: 'Other Income',                    type: 'revenue', sub: 'other_revenue',       nb: 'credit' },
    { number: '5000', name: 'Cost of Goods Sold',              type: 'expense', sub: 'cost_of_sales',       nb: 'debit' },
    { number: '5050', name: 'Inventory Write-Off / Shrinkage', type: 'expense', sub: 'cost_of_sales',       nb: 'debit' },
    { number: '5100', name: 'Salaries & Wages',                type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5200', name: 'Rent Expense',                    type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5300', name: 'Utilities Expense',               type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5400', name: 'Office Supplies',                 type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5500', name: 'Marketing & Advertising',         type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5600', name: 'Professional Fees',               type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5700', name: 'Depreciation Expense',            type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5800', name: 'Bank Charges',                    type: 'expense', sub: 'operating_expense',   nb: 'debit' },
    { number: '5900', name: 'Other Expenses',                  type: 'expense', sub: 'other_expense',       nb: 'debit' },
  ];

  for (const a of accounts) {
    await queryFn.query(
      `INSERT IGNORE INTO chart_of_accounts (id, company_id, account_number, name, account_type, sub_type, normal_balance, is_system)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, 1)`,
      [companyId, a.number, a.name, a.type, a.sub, a.nb]
    );
  }

  // Ensure journal_entry sequence exists for this company
  await queryFn.query(
    `INSERT IGNORE INTO document_sequences (id, company_id, document_type, prefix, next_number, padding, include_date)
     VALUES (UUID(), ?, 'journal_entry', 'JE', 1, 5, 0)`,
    [companyId]
  );
};

export const createAutoJournalEntry = async (
  companyId: string,
  userId: string,
  userName: string,
  referenceType: string,
  referenceId: string,
  referenceNo: string,
  entryDate: string,
  lines: Array<{ account_id: string; debit: number; credit: number; description?: string }>,
  description: string,
  client?: Connection
) => {
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new ValidationError(`Auto journal entry not balanced: debits (${totalDebit}) != credits (${totalCredit})`);
  }

  const execute = async (c: Connection) => {
    const entryNo = await generateDocumentNumber(companyId, 'journal_entry' as any, c);

    await c.query(
      `INSERT INTO journal_entries (company_id, entry_no, entry_date, description, reference_type, reference_id, reference_no, status, created_by, posted_by, posted_at)
       VALUES (?,?,?,?,?,?,?,'posted',?,?,NOW())`,
      [companyId, entryNo, entryDate, description, referenceType, referenceId, referenceNo, userId, userId]
    );

    const [jeRows] = await c.query(
      'SELECT * FROM journal_entries WHERE company_id=? AND entry_no=? ORDER BY created_at DESC LIMIT 1',
      [companyId, entryNo]
    );
    const je = (jeRows as any[])[0];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const debit = line.debit || 0;
      const credit = line.credit || 0;

      await c.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number)
         VALUES (?,?,?,?,?,?)`,
        [je.id, line.account_id, line.description || null, debit, credit, i + 1]
      );

      const [acctRows] = await c.query(
        'SELECT normal_balance FROM chart_of_accounts WHERE id=?',
        [line.account_id]
      );
      if ((acctRows as any[]).length) {
        const normalBalance = (acctRows as any[])[0].normal_balance;
        const delta = normalBalance === 'debit' ? (debit - credit) : (credit - debit);
        await c.query(
          'UPDATE chart_of_accounts SET balance = balance + ?, updated_at = NOW() WHERE id = ?',
          [delta, line.account_id]
        );
      }
    }

    return je;
  };

  if (client) {
    return execute(client);
  }
  return withTransaction(execute);
};

// ─── Opening Balance ──────────────────────────────────────────────────────────

export const getOpeningBalance = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT je.id, je.entry_no, je.entry_date, je.description
     FROM journal_entries je
     WHERE je.company_id = ? AND je.reference_type = 'opening_balance' AND je.status = 'posted'
     ORDER BY je.created_at ASC LIMIT 1`,
    [companyId]
  );
  if (!(rows as any[]).length) return { posted: false };

  const je = (rows as any[])[0];
  const [lines] = await pool.query(
    `SELECT jel.account_id, jel.debit, jel.credit,
            coa.account_number, coa.name AS account_name, coa.account_type, coa.normal_balance
     FROM journal_entry_lines jel
     JOIN chart_of_accounts coa ON coa.id = jel.account_id
     WHERE jel.journal_entry_id = ?
     ORDER BY coa.account_number`,
    [je.id]
  );

  const balances = (lines as any[]).map((l: any) => ({
    account_id: l.account_id,
    account_number: l.account_number,
    account_name: l.account_name,
    account_type: l.account_type,
    normal_balance: l.normal_balance,
    balance: l.normal_balance === 'debit' ? parseFloat(l.debit) : parseFloat(l.credit),
  }));

  return { posted: true, entry_no: je.entry_no, opening_date: je.entry_date, balances };
};

export const postOpeningBalance = async (
  companyId: string,
  userId: string,
  userName: string,
  data: { opening_date: string; balances: Array<{ account_id: string; balance: number }> }
) => {
  return withTransaction(async (client) => {
    // If an opening balance already exists, delete it and its lines (allow reposting)
    const [existing] = await client.query(
      `SELECT je.id FROM journal_entries je
       WHERE je.company_id = ? AND je.reference_type = 'opening_balance' AND je.status = 'posted' LIMIT 1`,
      [companyId]
    );
    if ((existing as any[]).length) {
      const oldJeId = (existing as any[])[0].id;
      // Reverse account balance effects of old lines
      const [oldLines] = await client.query(
        'SELECT account_id, debit, credit FROM journal_entry_lines WHERE journal_entry_id = ?',
        [oldJeId]
      );
      for (const ol of (oldLines as any[])) {
        const [acctRows] = await client.query('SELECT normal_balance FROM chart_of_accounts WHERE id=?', [ol.account_id]);
        if ((acctRows as any[]).length) {
          const nb = (acctRows as any[])[0].normal_balance;
          const oldDelta = nb === 'debit' ? (parseFloat(ol.debit) - parseFloat(ol.credit)) : (parseFloat(ol.credit) - parseFloat(ol.debit));
          await client.query('UPDATE chart_of_accounts SET balance = balance - ?, updated_at=NOW() WHERE id=?', [oldDelta, ol.account_id]);
        }
      }
      await client.query('DELETE FROM journal_entry_lines WHERE journal_entry_id=?', [oldJeId]);
      await client.query('DELETE FROM journal_entries WHERE id=?', [oldJeId]);
    }

    // Build journal entry lines
    const glLines: Array<{ account_id: string; debit: number; credit: number; description: string }> = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of data.balances) {
      const amount = Math.abs(entry.balance);
      if (amount < 0.001) continue;

      const [acctRows] = await client.query(
        'SELECT id, name, normal_balance, account_number FROM chart_of_accounts WHERE id=? AND company_id=?',
        [entry.account_id, companyId]
      );
      if (!(acctRows as any[]).length) continue;
      const acct = (acctRows as any[])[0];

      // Skip Opening Balance Equity itself — it's auto-calculated
      if (acct.account_number === '3050') continue;

      const isNormalDir = entry.balance > 0;
      if (acct.normal_balance === 'debit') {
        const debit  = isNormalDir ? amount : 0;
        const credit = isNormalDir ? 0 : amount;
        glLines.push({ account_id: entry.account_id, debit, credit, description: `Opening balance: ${acct.name}` });
        totalDebits  += debit;
        totalCredits += credit;
      } else {
        const credit = isNormalDir ? amount : 0;
        const debit  = isNormalDir ? 0 : amount;
        glLines.push({ account_id: entry.account_id, debit, credit, description: `Opening balance: ${acct.name}` });
        totalDebits  += debit;
        totalCredits += credit;
      }
    }

    if (!glLines.length) throw new ValidationError('At least one account balance is required.');

    // Auto-balance via Opening Balance Equity (3050)
    const diff = totalDebits - totalCredits;
    if (Math.abs(diff) > 0.001) {
      const obEquityId = await getSystemAccount(companyId, '3050', client);
      if (!obEquityId) throw new ValidationError('Opening Balance Equity account (3050) not found. Run migrations.');
      if (diff > 0) {
        glLines.push({ account_id: obEquityId, debit: 0, credit: diff, description: 'Opening Balance Equity (auto-balance)' });
      } else {
        glLines.push({ account_id: obEquityId, debit: Math.abs(diff), credit: 0, description: 'Opening Balance Equity (auto-balance)' });
      }
    }

    // Post the balanced journal entry tagged as opening_balance
    const entry_no = `OB-${data.opening_date.replace(/-/g, '')}`;
    await client.query(
      `INSERT INTO journal_entries
        (company_id, entry_no, entry_date, description, reference_type, status, created_by, posted_by, posted_at)
       VALUES (?,?,?,?,'opening_balance','posted',?,?,NOW())`,
      [companyId, entry_no, data.opening_date, 'Opening Balance Entry', userId, userId]
    );
    const [jeRows] = await client.query(
      'SELECT * FROM journal_entries WHERE company_id=? AND entry_no=? ORDER BY created_at DESC LIMIT 1',
      [companyId, entry_no]
    );
    const je = (jeRows as any[])[0];

    for (let i = 0; i < glLines.length; i++) {
      const line = glLines[i];
      await client.query(
        'INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number) VALUES (?,?,?,?,?,?)',
        [je.id, line.account_id, line.description, line.debit, line.credit, i + 1]
      );
      const [acctRows] = await client.query('SELECT normal_balance FROM chart_of_accounts WHERE id=?', [line.account_id]);
      if ((acctRows as any[]).length) {
        const nb = (acctRows as any[])[0].normal_balance;
        const delta = nb === 'debit' ? (line.debit - line.credit) : (line.credit - line.debit);
        await client.query('UPDATE chart_of_accounts SET balance = balance + ?, updated_at=NOW() WHERE id=?', [delta, line.account_id]);
      }
    }

    return await getOpeningBalance(companyId);
  });
};

// ─── Year-End Close ───────────────────────────────────────────────────────────

export const getYearEndCloses = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT je.id, je.entry_no, je.entry_date, je.description, je.created_at,
            COUNT(jel.id) AS line_count
     FROM journal_entries je
     LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
     WHERE je.company_id = ? AND je.reference_type = 'year_end_close' AND je.status = 'posted'
     GROUP BY je.id
     ORDER BY je.entry_date DESC`,
    [companyId]
  );
  return rows as any[];
};

export const yearEndClose = async (
  companyId: string,
  userId: string,
  userName: string,
  data: { fiscal_year_end_date: string }
) => {
  const fiscalYear = data.fiscal_year_end_date.substring(0, 4);

  return withTransaction(async (client) => {
    // Prevent duplicate close for same fiscal year
    const [existing] = await client.query(
      `SELECT id FROM journal_entries
       WHERE company_id = ? AND reference_type = 'year_end_close'
         AND entry_no = ? AND status = 'posted' LIMIT 1`,
      [companyId, `YEC-${fiscalYear}`]
    );
    if ((existing as any[]).length) {
      throw new ConflictError(`Year-end close for fiscal year ${fiscalYear} has already been posted (${`YEC-${fiscalYear}`}). Reverse it first if you need to redo it.`);
    }

    // Fetch all revenue + expense accounts with non-zero balance
    const [plAccounts] = await client.query(
      `SELECT id, account_number, name, account_type, normal_balance, balance
       FROM chart_of_accounts
       WHERE company_id = ? AND account_type IN ('revenue','expense') AND ABS(balance) > 0.001`,
      [companyId]
    );

    if (!(plAccounts as any[]).length) {
      throw new ValidationError('No revenue or expense accounts have a non-zero balance. Nothing to close.');
    }

    const retainedEarningsId = await getSystemAccount(companyId, '3100', client);
    if (!retainedEarningsId) throw new ValidationError('Retained Earnings account (3100) not found. Run migrations.');

    const glLines: Array<{ account_id: string; debit: number; credit: number; description: string }> = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const acct of (plAccounts as any[])) {
      const balance = parseFloat(acct.balance);
      if (Math.abs(balance) < 0.001) continue;

      if (acct.account_type === 'revenue') {
        totalRevenue += balance;
        // Revenue: normal_balance = credit, positive balance = credit position → close with DR
        glLines.push({
          account_id: acct.id,
          debit:  balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
          description: `Year-end close: ${acct.account_number} ${acct.name}`,
        });
      } else {
        totalExpenses += balance;
        // Expense: normal_balance = debit, positive balance = debit position → close with CR
        glLines.push({
          account_id: acct.id,
          debit:  balance < 0 ? Math.abs(balance) : 0,
          credit: balance > 0 ? balance : 0,
          description: `Year-end close: ${acct.account_number} ${acct.name}`,
        });
      }
    }

    // Transfer net income/loss to Retained Earnings
    const netIncome = totalRevenue - totalExpenses;
    if (Math.abs(netIncome) > 0.001) {
      glLines.push({
        account_id: retainedEarningsId,
        debit:  netIncome < 0 ? Math.abs(netIncome) : 0,
        credit: netIncome > 0 ? netIncome : 0,
        description: netIncome >= 0 ? `Net income FY${fiscalYear} → Retained Earnings` : `Net loss FY${fiscalYear} → Retained Earnings`,
      });
    }

    // Post closing journal entry
    const entryNo = `YEC-${fiscalYear}`;
    await client.query(
      `INSERT INTO journal_entries
        (company_id, entry_no, entry_date, description, reference_type, status, created_by, posted_by, posted_at)
       VALUES (?,?,?,?,'year_end_close','posted',?,?,NOW())`,
      [companyId, entryNo, data.fiscal_year_end_date, `Year-End Closing Entry FY${fiscalYear}`, userId, userId]
    );
    const [jeRows] = await client.query(
      'SELECT * FROM journal_entries WHERE company_id=? AND entry_no=? ORDER BY created_at DESC LIMIT 1',
      [companyId, entryNo]
    );
    const je = (jeRows as any[])[0];

    for (let i = 0; i < glLines.length; i++) {
      const line = glLines[i];
      await client.query(
        'INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number) VALUES (?,?,?,?,?,?)',
        [je.id, line.account_id, line.description, line.debit, line.credit, i + 1]
      );
      const [acctRows] = await client.query('SELECT normal_balance FROM chart_of_accounts WHERE id=?', [line.account_id]);
      if ((acctRows as any[]).length) {
        const nb = (acctRows as any[])[0].normal_balance;
        const delta = nb === 'debit' ? (line.debit - line.credit) : (line.credit - line.debit);
        await client.query('UPDATE chart_of_accounts SET balance = balance + ?, updated_at=NOW() WHERE id=?', [delta, line.account_id]);
      }
    }

    return {
      entry_no: entryNo,
      fiscal_year: fiscalYear,
      fiscal_year_end_date: data.fiscal_year_end_date,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: netIncome,
      accounts_closed: (plAccounts as any[]).length,
    };
  });
};
