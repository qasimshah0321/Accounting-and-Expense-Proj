import { PoolClient } from 'pg';
import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog } from '../../services/auditService';

// ─── Chart of Accounts ─────────────────────────────────────────────────────

export const listAccounts = async (companyId: string, filters: any) => {
  const conditions = ['company_id=$1'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.account_type) {
    conditions.push(`account_type=$${idx++}`);
    params.push(filters.account_type);
  }
  if (filters.is_active !== undefined && filters.is_active !== '') {
    conditions.push(`is_active=$${idx++}`);
    params.push(filters.is_active === 'true' || filters.is_active === true);
  }
  if (filters.search) {
    conditions.push(`(name ILIKE $${idx} OR account_number ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const { rows } = await pool.query(
    `SELECT id, account_number, name, account_type, sub_type, parent_id, description, is_active, is_system, normal_balance, balance, created_at, updated_at
     FROM chart_of_accounts WHERE ${where} ORDER BY account_number ASC`,
    params
  );
  return { accounts: rows };
};

export const getAccountById = async (companyId: string, accountId: string) => {
  const { rows } = await pool.query(
    'SELECT * FROM chart_of_accounts WHERE id=$1 AND company_id=$2',
    [accountId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Account');
  return rows[0];
};

const inferNormalBalance = (accountType: string): string => {
  if (accountType === 'asset' || accountType === 'expense') return 'debit';
  return 'credit';
};

export const createAccount = async (companyId: string, userId: string, data: any) => {
  const normalBalance = data.normal_balance || inferNormalBalance(data.account_type);

  // Check duplicate account_number
  const { rows: existing } = await pool.query(
    'SELECT id FROM chart_of_accounts WHERE company_id=$1 AND account_number=$2',
    [companyId, data.account_number]
  );
  if (existing.length) throw new ConflictError(`Account number ${data.account_number} already exists`);

  if (data.parent_id) {
    const { rows: parentRows } = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE id=$1 AND company_id=$2',
      [data.parent_id, companyId]
    );
    if (!parentRows.length) throw new ValidationError('Parent account not found');
  }

  const { rows } = await pool.query(
    `INSERT INTO chart_of_accounts (company_id, account_number, name, account_type, sub_type, parent_id, description, is_active, normal_balance)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [companyId, data.account_number, data.name, data.account_type, data.sub_type || null, data.parent_id || null, data.description || null, data.is_active !== false, normalBalance]
  );
  return rows[0];
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
    const { rows: existing } = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE company_id=$1 AND account_number=$2 AND id!=$3',
      [companyId, data.account_number, accountId]
    );
    if (existing.length) throw new ConflictError(`Account number ${data.account_number} already exists`);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 3;

  const allowedFields = ['account_number', 'name', 'account_type', 'sub_type', 'parent_id', 'description', 'normal_balance', 'is_active'];
  for (const f of allowedFields) {
    if (data[f] !== undefined) {
      fields.push(`${f}=$${idx++}`);
      values.push(data[f]);
    }
  }
  if (!fields.length) return account;

  fields.push(`updated_at=NOW()`);

  const { rows } = await pool.query(
    `UPDATE chart_of_accounts SET ${fields.join(', ')} WHERE id=$1 AND company_id=$2 RETURNING *`,
    [accountId, companyId, ...values]
  );
  return rows[0];
};

export const deleteAccount = async (companyId: string, accountId: string) => {
  const account = await getAccountById(companyId, accountId);
  if (account.is_system) throw new ConflictError('Cannot delete a system account');

  // Check if account has journal entries
  const { rows: jeLines } = await pool.query(
    'SELECT id FROM journal_entry_lines WHERE account_id=$1 LIMIT 1',
    [accountId]
  );
  if (jeLines.length) throw new ConflictError('Cannot delete an account with journal entries');

  await pool.query('DELETE FROM chart_of_accounts WHERE id=$1 AND company_id=$2', [accountId, companyId]);
};

// ─── Journal Entries ─────────────────────────────────────────────────────────

export const peekNextJournalEntryNumber = async (companyId: string): Promise<string> => {
  const { rows } = await pool.query(
    `SELECT prefix, next_number, padding, include_date FROM document_sequences WHERE company_id=$1 AND document_type='journal_entry'`,
    [companyId]
  );
  if (!rows.length) return 'JE-00001';
  const { prefix, next_number, padding, include_date } = rows[0];
  const parts: string[] = [prefix];
  if (include_date) {
    const d = new Date();
    parts.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
  }
  parts.push(String(next_number).padStart(padding, '0'));
  return parts.join('-');
};

export const listJournalEntries = async (companyId: string, filters: any) => {
  const conditions = ['je.company_id=$1'];
  const params: unknown[] = [companyId];
  let idx = 2;

  if (filters.status) { conditions.push(`je.status=$${idx++}`); params.push(filters.status); }
  if (filters.date_from) { conditions.push(`je.entry_date>=$${idx++}`); params.push(filters.date_from); }
  if (filters.date_to) { conditions.push(`je.entry_date<=$${idx++}`); params.push(filters.date_to); }
  if (filters.reference_type) { conditions.push(`je.reference_type=$${idx++}`); params.push(filters.reference_type); }
  if (filters.search) {
    conditions.push(`(je.entry_no ILIKE $${idx} OR je.description ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*) FROM journal_entries je WHERE ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT je.id, je.entry_no, je.entry_date, je.description, je.reference_type, je.reference_no, je.status, je.created_at,
       COALESCE(SUM(jel.debit), 0) AS total_debit,
       COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM journal_entries je
     LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
     WHERE ${where}
     GROUP BY je.id, je.entry_no, je.entry_date, je.description, je.reference_type, je.reference_no, je.status, je.created_at
     ORDER BY je.entry_date DESC, je.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, filters.limit, filters.offset]
  );
  return { journal_entries: rows, pagination: buildPaginationMeta(filters.page, filters.limit, total) };
};

export const getJournalEntryById = async (companyId: string, jeId: string) => {
  const { rows } = await pool.query(
    'SELECT * FROM journal_entries WHERE id=$1 AND company_id=$2',
    [jeId, companyId]
  );
  if (!rows.length) throw new NotFoundError('Journal entry');

  const { rows: lines } = await pool.query(
    `SELECT jel.*, coa.account_number, coa.name AS account_name
     FROM journal_entry_lines jel
     JOIN chart_of_accounts coa ON coa.id = jel.account_id
     WHERE jel.journal_entry_id=$1
     ORDER BY jel.line_number`,
    [jeId]
  );
  return { ...rows[0], lines };
};

export const createJournalEntry = async (companyId: string, userId: string, userName: string, data: any) => {
  // Validate debits === credits
  const totalDebit = data.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
  const totalCredit = data.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new ValidationError(`Journal entry is not balanced: debits (${totalDebit}) != credits (${totalCredit})`);
  }

  // Each line must have either debit or credit (not both > 0)
  for (const line of data.lines) {
    if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
      throw new ValidationError('A line cannot have both debit and credit amounts');
    }
  }

  return withTransaction(async (client) => {
    const entryNo = data.entry_no || await generateDocumentNumber(companyId, 'journal_entry' as any, client);

    const { rows: [je] } = await client.query(
      `INSERT INTO journal_entries (company_id, entry_no, entry_date, description, reference_type, reference_id, reference_no, status, created_by, posted_by, posted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'posted',$8,$8,NOW()) RETURNING *`,
      [companyId, entryNo, data.entry_date, data.description || null, data.reference_type || null, data.reference_id || null, data.reference_no || null, userId]
    );

    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      const debit = line.debit || 0;
      const credit = line.credit || 0;

      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [je.id, line.account_id, line.description || null, debit, credit, i + 1]
      );

      // Update account balance
      // For debit-normal accounts: balance += debit - credit
      // For credit-normal accounts: balance += credit - debit
      const { rows: acctRows } = await client.query(
        'SELECT normal_balance FROM chart_of_accounts WHERE id=$1',
        [line.account_id]
      );
      if (acctRows.length) {
        const normalBalance = acctRows[0].normal_balance;
        const delta = normalBalance === 'debit' ? (debit - credit) : (credit - debit);
        await client.query(
          'UPDATE chart_of_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
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

    // Reload with lines
    const { rows: lines } = await client.query(
      `SELECT jel.*, coa.account_number, coa.name AS account_name
       FROM journal_entry_lines jel
       JOIN chart_of_accounts coa ON coa.id = jel.account_id
       WHERE jel.journal_entry_id=$1
       ORDER BY jel.line_number`,
      [je.id]
    );

    return { ...je, lines };
  });
};

export const reverseJournalEntry = async (companyId: string, jeId: string, userId: string, userName: string) => {
  const je = await getJournalEntryById(companyId, jeId);
  if (je.status === 'reversed') throw new ConflictError('Journal entry is already reversed');

  // Create reversal with swapped debits/credits
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

  // Mark original as reversed
  await pool.query(
    'UPDATE journal_entries SET status=$1, reversed_by=$2, updated_at=NOW() WHERE id=$3',
    ['reversed', reversal.id, jeId]
  );

  return reversal;
};

// ─── GL Reports ──────────────────────────────────────────────────────────────

export const getGeneralLedger = async (companyId: string, accountId: string, startDate: string, endDate: string) => {
  const account = await getAccountById(companyId, accountId);

  // Calculate opening balance: sum of all entries before startDate
  const { rows: openingRows } = await pool.query(
    `SELECT COALESCE(SUM(jel.debit), 0) AS total_debit, COALESCE(SUM(jel.credit), 0) AS total_credit
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     WHERE jel.account_id = $1 AND je.company_id = $2 AND je.entry_date < $3 AND je.status = 'posted'`,
    [accountId, companyId, startDate]
  );
  const openingDebit = parseFloat(openingRows[0].total_debit);
  const openingCredit = parseFloat(openingRows[0].total_credit);
  const openingBalance = account.normal_balance === 'debit'
    ? openingDebit - openingCredit
    : openingCredit - openingDebit;

  // Get transactions in date range
  const { rows: transactions } = await pool.query(
    `SELECT jel.id, jel.debit, jel.credit, jel.description AS line_description,
       je.id AS journal_entry_id, je.entry_no, je.entry_date, je.description, je.reference_type, je.reference_no
     FROM journal_entry_lines jel
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     WHERE jel.account_id = $1 AND je.company_id = $2 AND je.entry_date >= $3 AND je.entry_date <= $4 AND je.status = 'posted'
     ORDER BY je.entry_date ASC, je.created_at ASC`,
    [accountId, companyId, startDate, endDate]
  );

  // Calculate running balance
  let runningBalance = openingBalance;
  const transactionsWithBalance = transactions.map((t: any) => {
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

export const getTrialBalance = async (companyId: string, asOfDate?: string) => {
  let query: string;
  let params: unknown[];

  if (asOfDate) {
    // Calculate balances from journal entries up to the date
    query = `
      SELECT coa.id, coa.account_number, coa.name, coa.account_type, coa.sub_type, coa.normal_balance,
        COALESCE(SUM(jel.debit), 0) AS total_debit,
        COALESCE(SUM(jel.credit), 0) AS total_credit
      FROM chart_of_accounts coa
      LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
      LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted' AND je.entry_date <= $2
      WHERE coa.company_id = $1
      GROUP BY coa.id, coa.account_number, coa.name, coa.account_type, coa.sub_type, coa.normal_balance
      HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
      ORDER BY coa.account_number`;
    params = [companyId, asOfDate];
  } else {
    // Use running balance from chart_of_accounts
    query = `
      SELECT id, account_number, name, account_type, sub_type, normal_balance, balance
      FROM chart_of_accounts
      WHERE company_id = $1 AND balance != 0
      ORDER BY account_number`;
    params = [companyId];
  }

  const { rows } = await pool.query(query, params);

  // Build trial balance with debit/credit columns
  let totalDebits = 0;
  let totalCredits = 0;

  const accounts = rows.map((row: any) => {
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

  // Group by account_type
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

export const getSystemAccount = async (companyId: string, accountNumber: string, client?: PoolClient) => {
  const queryFn = client ? client : pool;
  const { rows } = await queryFn.query(
    'SELECT id FROM chart_of_accounts WHERE company_id=$1 AND account_number=$2',
    [companyId, accountNumber]
  );
  if (!rows.length) return null;
  return rows[0].id;
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
  client?: PoolClient
) => {
  // Validate balance
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new ValidationError(`Auto journal entry not balanced: debits (${totalDebit}) != credits (${totalCredit})`);
  }

  const execute = async (c: PoolClient) => {
    const entryNo = await generateDocumentNumber(companyId, 'journal_entry' as any, c);

    const { rows: [je] } = await c.query(
      `INSERT INTO journal_entries (company_id, entry_no, entry_date, description, reference_type, reference_id, reference_no, status, created_by, posted_by, posted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'posted',$8,$8,NOW()) RETURNING *`,
      [companyId, entryNo, entryDate, description, referenceType, referenceId, referenceNo, userId]
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const debit = line.debit || 0;
      const credit = line.credit || 0;

      await c.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [je.id, line.account_id, line.description || null, debit, credit, i + 1]
      );

      // Update account balance
      const { rows: acctRows } = await c.query(
        'SELECT normal_balance FROM chart_of_accounts WHERE id=$1',
        [line.account_id]
      );
      if (acctRows.length) {
        const normalBalance = acctRows[0].normal_balance;
        const delta = normalBalance === 'debit' ? (debit - credit) : (credit - debit);
        await c.query(
          'UPDATE chart_of_accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
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
