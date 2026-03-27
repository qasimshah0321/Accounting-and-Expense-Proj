import { Connection } from 'mysql2/promise';
import { pool, withTransaction } from '../../config/database';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { buildPaginationMeta } from '../../utils/pagination';
import { generateDocumentNumber } from '../../services/documentNumberService';
import { createAuditLog } from '../../services/auditService';
import { createAutoJournalEntry, getSystemAccount } from '../accounting/accounting.service';

// ─── Bank Accounts ──────────────────────────────────────────────────────────

export const listBankAccounts = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT ba.*, coa.account_number AS gl_account_number, coa.name AS gl_account_name
     FROM bank_accounts ba
     LEFT JOIN chart_of_accounts coa ON coa.id = ba.gl_account_id
     WHERE ba.company_id = ? AND ba.deleted_at IS NULL
     ORDER BY ba.account_name ASC`,
    [companyId]
  );
  return { bank_accounts: rows as any[] };
};

export const getBankAccount = async (companyId: string, id: string) => {
  const [rows] = await pool.query(
    `SELECT ba.*, coa.account_number AS gl_account_number, coa.name AS gl_account_name
     FROM bank_accounts ba
     LEFT JOIN chart_of_accounts coa ON coa.id = ba.gl_account_id
     WHERE ba.id = ? AND ba.company_id = ? AND ba.deleted_at IS NULL`,
    [id, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Bank account');
  return (rows as any[])[0];
};

export const createBankAccount = async (companyId: string, userId: string, userName: string, data: any) => {
  // If gl_account_id provided, verify it belongs to this company
  if (data.gl_account_id) {
    const [glRows] = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE id = ? AND company_id = ?',
      [data.gl_account_id, companyId]
    );
    if (!(glRows as any[]).length) throw new ValidationError('GL account not found');
  }

  await pool.query(
    `INSERT INTO bank_accounts (company_id, account_name, account_number, bank_name, account_type, currency, opening_balance, current_balance, gl_account_id, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      companyId,
      data.account_name,
      data.account_number || null,
      data.bank_name,
      data.account_type,
      data.currency || 'USD',
      data.opening_balance || 0,
      data.opening_balance || 0,
      data.gl_account_id || null,
      data.is_active !== false,
    ]
  );
  const [newRows] = await pool.query(
    'SELECT * FROM bank_accounts WHERE company_id=? AND account_name=? ORDER BY created_at DESC LIMIT 1',
    [companyId, data.account_name]
  );
  const created = (newRows as any[])[0];

  await createAuditLog({
    company_id: companyId,
    entity_type: 'bank_account',
    entity_id: created.id,
    action: 'create',
    user_id: userId,
    user_name: userName,
    description: `Bank account "${data.account_name}" created`,
  });

  return created;
};

export const updateBankAccount = async (companyId: string, id: string, data: any) => {
  const account = await getBankAccount(companyId, id);

  if (data.gl_account_id) {
    const [glRows] = await pool.query(
      'SELECT id FROM chart_of_accounts WHERE id = ? AND company_id = ?',
      [data.gl_account_id, companyId]
    );
    if (!(glRows as any[]).length) throw new ValidationError('GL account not found');
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const allowedFields = ['account_name', 'account_number', 'bank_name', 'account_type', 'currency', 'gl_account_id', 'is_active'];
  for (const f of allowedFields) {
    if (data[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(data[f]);
    }
  }
  if (!fields.length) return account;

  fields.push('updated_at = NOW()');

  await pool.query(
    `UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = ? AND company_id = ? AND deleted_at IS NULL`,
    [...values, id, companyId]
  );
  const [updatedRows] = await pool.query('SELECT * FROM bank_accounts WHERE id=?', [id]);
  return (updatedRows as any[])[0];
};

export const deleteBankAccount = async (companyId: string, id: string) => {
  await getBankAccount(companyId, id);

  // Check for unreconciled transactions
  const [txRows] = await pool.query(
    'SELECT id FROM bank_transactions WHERE bank_account_id = ? AND deleted_at IS NULL AND is_reconciled = false LIMIT 1',
    [id]
  );
  if ((txRows as any[]).length) {
    throw new ConflictError('Cannot delete a bank account with unreconciled transactions');
  }

  await pool.query(
    'UPDATE bank_accounts SET deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND company_id = ?',
    [id, companyId]
  );
};

// ─── Bank Transactions ──────────────────────────────────────────────────────

export const listTransactions = async (
  companyId: string,
  bankAccountId: string,
  params: { page: number; limit: number; offset: number; date_from?: string; date_to?: string; search?: string; transaction_type?: string }
) => {
  // Verify bank account
  await getBankAccount(companyId, bankAccountId);

  const conditions = ['bt.bank_account_id = ?', 'bt.company_id = ?', 'bt.deleted_at IS NULL'];
  const queryParams: unknown[] = [bankAccountId, companyId];

  if (params.date_from) {
    conditions.push(`bt.transaction_date >= ?`);
    queryParams.push(params.date_from);
  }
  if (params.date_to) {
    conditions.push(`bt.transaction_date <= ?`);
    queryParams.push(params.date_to);
  }
  if (params.search) {
    conditions.push(`(bt.description LIKE ? OR bt.payee LIKE ? OR bt.reference_no LIKE ?)`);
    const s = `%${params.search}%`;
    queryParams.push(s, s, s);
  }
  if (params.transaction_type) {
    conditions.push(`bt.transaction_type = ?`);
    queryParams.push(params.transaction_type);
  }

  const where = conditions.join(' AND ');

  const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM bank_transactions bt WHERE ${where}`, queryParams);
  const total = parseInt((countRows as any[])[0].count, 10);

  const [rows] = await pool.query(
    `SELECT bt.*
     FROM bank_transactions bt
     WHERE ${where}
     ORDER BY bt.transaction_date DESC, bt.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, params.limit, params.offset]
  );

  return {
    transactions: rows as any[],
    pagination: buildPaginationMeta(params.page, params.limit, total),
  };
};

export const createTransaction = async (
  companyId: string,
  bankAccountId: string,
  userId: string,
  userName: string,
  data: any
) => {
  const bankAccount = await getBankAccount(companyId, bankAccountId);

  // Normalize amount: deposits positive, withdrawals/fees negative
  let amount = Math.abs(data.amount);
  if (['withdrawal', 'fee'].includes(data.transaction_type)) {
    amount = -amount;
  }
  // For interest, keep positive (it's income)
  // For adjustment, keep the sign the user provided
  if (data.transaction_type === 'adjustment') {
    amount = data.amount; // keep original sign
  }

  return withTransaction(async (client) => {
    const refNo = data.reference_no || await generateDocumentNumber(companyId, 'bank_transaction' as any, client);

    await client.query(
      `INSERT INTO bank_transactions (company_id, bank_account_id, transaction_date, description, amount, transaction_type, reference_no, payee, category, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        bankAccountId,
        data.transaction_date,
        data.description,
        amount,
        data.transaction_type,
        refNo,
        data.payee || null,
        data.category || null,
        data.notes || null,
      ]
    );
    const [txRows] = await client.query(
      'SELECT * FROM bank_transactions WHERE company_id=? AND bank_account_id=? AND reference_no=? ORDER BY created_at DESC LIMIT 1',
      [companyId, bankAccountId, refNo]
    );
    const tx = (txRows as any[])[0];

    // Update bank account balance
    await client.query(
      'UPDATE bank_accounts SET current_balance = current_balance + ?, updated_at = NOW() WHERE id = ?',
      [amount, bankAccountId]
    );

    // GL auto-posting (wrapped in try/catch so GL failures don't break the transaction)
    try {
      if (bankAccount.gl_account_id) {
        await postTransactionToGL(companyId, userId, userName, bankAccount, tx, data, client);
      }
    } catch (glErr) {
      console.error('GL auto-posting failed for bank transaction:', (glErr as Error).message);
    }

    await createAuditLog({
      company_id: companyId,
      entity_type: 'bank_transaction',
      entity_id: tx.id,
      action: 'create',
      user_id: userId,
      user_name: userName,
      description: `Bank transaction ${refNo} created: ${data.transaction_type} of ${amount}`,
    }, client);

    return tx;
  });
};

const postTransactionToGL = async (
  companyId: string,
  userId: string,
  userName: string,
  bankAccount: any,
  tx: any,
  data: any,
  client: Connection
) => {
  const bankGlId = bankAccount.gl_account_id;
  const absAmount = Math.abs(parseFloat(tx.amount));

  if (absAmount === 0) return;

  let lines: Array<{ account_id: string; debit: number; credit: number; description?: string }> = [];

  if (data.transaction_type === 'deposit' || data.transaction_type === 'interest') {
    // DR Bank Account / CR Revenue (4000)
    const revenueAccountId = await getSystemAccount(companyId, '4000', client);
    if (!revenueAccountId) return; // Can't post without revenue account
    lines = [
      { account_id: bankGlId, debit: absAmount, credit: 0, description: tx.description },
      { account_id: revenueAccountId, debit: 0, credit: absAmount, description: tx.description },
    ];
  } else if (data.transaction_type === 'withdrawal' || data.transaction_type === 'fee') {
    // DR Expense (5900) / CR Bank Account
    const expenseAccountId = await getSystemAccount(companyId, '5900', client);
    if (!expenseAccountId) return;
    lines = [
      { account_id: expenseAccountId, debit: absAmount, credit: 0, description: tx.description },
      { account_id: bankGlId, debit: 0, credit: absAmount, description: tx.description },
    ];
  } else if (data.transaction_type === 'transfer') {
    // DR target bank GL / CR source bank GL
    if (data.target_bank_account_id) {
      const [targetRows] = await client.query(
        'SELECT gl_account_id FROM bank_accounts WHERE id = ? AND company_id = ? AND deleted_at IS NULL',
        [data.target_bank_account_id, companyId]
      );
      if ((targetRows as any[]).length && (targetRows as any[])[0].gl_account_id) {
        lines = [
          { account_id: (targetRows as any[])[0].gl_account_id, debit: absAmount, credit: 0, description: `Transfer from ${bankAccount.account_name}` },
          { account_id: bankGlId, debit: 0, credit: absAmount, description: `Transfer to other account` },
        ];
      }
    }
    // If no target, skip GL posting for transfer
    if (!lines.length) return;
  } else if (data.transaction_type === 'adjustment') {
    // Adjustment: if positive, DR bank / CR equity; if negative, DR equity / CR bank
    const equityAccountId = await getSystemAccount(companyId, '3100', client);
    if (!equityAccountId) return;
    if (parseFloat(tx.amount) >= 0) {
      lines = [
        { account_id: bankGlId, debit: absAmount, credit: 0, description: tx.description },
        { account_id: equityAccountId, debit: 0, credit: absAmount, description: tx.description },
      ];
    } else {
      lines = [
        { account_id: equityAccountId, debit: absAmount, credit: 0, description: tx.description },
        { account_id: bankGlId, debit: 0, credit: absAmount, description: tx.description },
      ];
    }
  }

  if (!lines.length) return;

  const je = await createAutoJournalEntry(
    companyId,
    userId,
    userName,
    'bank_transaction',
    tx.id,
    tx.reference_no,
    tx.transaction_date,
    lines,
    `Bank ${data.transaction_type}: ${tx.description}`,
    client
  );

  // Link journal entry to transaction
  await client.query(
    'UPDATE bank_transactions SET matched_journal_entry_id = ? WHERE id = ?',
    [je.id, tx.id]
  );
};

export const updateTransaction = async (
  companyId: string,
  bankAccountId: string,
  txId: string,
  data: any
) => {
  return withTransaction(async (client) => {
    const [txRows] = await client.query(
      'SELECT * FROM bank_transactions WHERE id = ? AND bank_account_id = ? AND company_id = ? AND deleted_at IS NULL',
      [txId, bankAccountId, companyId]
    );
    if (!(txRows as any[]).length) throw new NotFoundError('Bank transaction');
    const oldTx = (txRows as any[])[0];

    if (oldTx.is_reconciled) {
      throw new ConflictError('Cannot edit a reconciled transaction');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    const allowedFields = ['transaction_date', 'description', 'transaction_type', 'reference_no', 'payee', 'category', 'notes'];
    for (const f of allowedFields) {
      if (data[f] !== undefined) {
        fields.push(`${f} = ?`);
        values.push(data[f]);
      }
    }

    // Handle amount change
    let newAmount: number | null = null;
    if (data.amount !== undefined) {
      const type = data.transaction_type || oldTx.transaction_type;
      let amt = Math.abs(data.amount);
      if (['withdrawal', 'fee'].includes(type)) amt = -amt;
      if (type === 'adjustment') amt = data.amount;
      newAmount = amt;
      fields.push(`amount = ?`);
      values.push(newAmount);
    }

    if (!fields.length) return oldTx;

    fields.push('updated_at = NOW()');

    await client.query(
      `UPDATE bank_transactions SET ${fields.join(', ')} WHERE id = ? AND bank_account_id = ? AND company_id = ? AND deleted_at IS NULL`,
      [...values, txId, bankAccountId, companyId]
    );
    const [updatedRows] = await client.query('SELECT * FROM bank_transactions WHERE id=?', [txId]);
    const updatedTx = (updatedRows as any[])[0];

    // Adjust balance if amount changed
    if (newAmount !== null) {
      const oldAmount = parseFloat(oldTx.amount);
      const delta = newAmount - oldAmount;
      if (Math.abs(delta) > 0.0001) {
        await client.query(
          'UPDATE bank_accounts SET current_balance = current_balance + ?, updated_at = NOW() WHERE id = ?',
          [delta, bankAccountId]
        );
      }
    }

    return updatedTx;
  });
};

export const deleteTransaction = async (
  companyId: string,
  bankAccountId: string,
  txId: string
) => {
  return withTransaction(async (client) => {
    const [txRows] = await client.query(
      'SELECT * FROM bank_transactions WHERE id = ? AND bank_account_id = ? AND company_id = ? AND deleted_at IS NULL',
      [txId, bankAccountId, companyId]
    );
    if (!(txRows as any[]).length) throw new NotFoundError('Bank transaction');
    const tx = (txRows as any[])[0];

    if (tx.is_reconciled) {
      throw new ConflictError('Cannot delete a reconciled transaction');
    }

    // Soft delete
    await client.query(
      'UPDATE bank_transactions SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?',
      [txId]
    );

    // Reverse balance
    const amount = parseFloat(tx.amount);
    await client.query(
      'UPDATE bank_accounts SET current_balance = current_balance - ?, updated_at = NOW() WHERE id = ?',
      [amount, bankAccountId]
    );
  });
};

// ─── Reconciliation ─────────────────────────────────────────────────────────

export const getReconciliationSummary = async (companyId: string, bankAccountId: string) => {
  const bankAccount = await getBankAccount(companyId, bankAccountId);

  // Outstanding (unreconciled) transactions
  const [outstanding] = await pool.query(
    `SELECT * FROM bank_transactions
     WHERE bank_account_id = ? AND company_id = ? AND deleted_at IS NULL AND is_reconciled = false
     ORDER BY transaction_date DESC, created_at DESC`,
    [bankAccountId, companyId]
  );

  // Last reconciliation
  const [lastRecRows] = await pool.query(
    `SELECT * FROM bank_reconciliations
     WHERE bank_account_id = ? AND company_id = ? AND status = 'reconciled'
     ORDER BY statement_date DESC LIMIT 1`,
    [bankAccountId, companyId]
  );

  // Open reconciliation
  const [openRecRows] = await pool.query(
    `SELECT * FROM bank_reconciliations
     WHERE bank_account_id = ? AND company_id = ? AND status = 'open'
     ORDER BY created_at DESC LIMIT 1`,
    [bankAccountId, companyId]
  );

  // Previous reconciliations
  const [previousRecs] = await pool.query(
    `SELECT * FROM bank_reconciliations
     WHERE bank_account_id = ? AND company_id = ?
     ORDER BY statement_date DESC LIMIT 20`,
    [bankAccountId, companyId]
  );

  const outstandingArr = outstanding as any[];
  return {
    bank_account: bankAccount,
    book_balance: parseFloat(bankAccount.current_balance),
    outstanding_transactions: outstandingArr,
    outstanding_count: outstandingArr.length,
    outstanding_total: outstandingArr.reduce((s: number, t: any) => s + parseFloat(t.amount), 0),
    last_reconciliation: (lastRecRows as any[])[0] || null,
    open_reconciliation: (openRecRows as any[])[0] || null,
    previous_reconciliations: previousRecs as any[],
  };
};

export const startReconciliation = async (
  companyId: string,
  bankAccountId: string,
  userId: string,
  data: { statement_date: string; statement_ending_balance: number }
) => {
  const bankAccount = await getBankAccount(companyId, bankAccountId);

  // Check for existing open reconciliation
  const [openRec] = await pool.query(
    `SELECT id FROM bank_reconciliations WHERE bank_account_id = ? AND company_id = ? AND status = 'open'`,
    [bankAccountId, companyId]
  );
  if ((openRec as any[]).length) {
    throw new ConflictError('There is already an open reconciliation for this account. Complete or delete it first.');
  }

  await pool.query(
    `INSERT INTO bank_reconciliations (company_id, bank_account_id, statement_date, statement_ending_balance, book_balance, reconciled_balance, status, reconciled_by)
     VALUES (?, ?, ?, ?, ?, 0, 'open', ?)`,
    [
      companyId,
      bankAccountId,
      data.statement_date,
      data.statement_ending_balance,
      parseFloat(bankAccount.current_balance),
      userId,
    ]
  );
  const [recRows] = await pool.query(
    `SELECT * FROM bank_reconciliations WHERE company_id=? AND bank_account_id=? AND status='open' ORDER BY created_at DESC LIMIT 1`,
    [companyId, bankAccountId]
  );
  return (recRows as any[])[0];
};

export const markTransactionReconciled = async (
  companyId: string,
  bankAccountId: string,
  reconciliationId: string,
  transactionId: string,
  reconcile: boolean = true
) => {
  // Verify reconciliation is open
  const [recRows] = await pool.query(
    `SELECT * FROM bank_reconciliations WHERE id = ? AND bank_account_id = ? AND company_id = ? AND status = 'open'`,
    [reconciliationId, bankAccountId, companyId]
  );
  if (!(recRows as any[]).length) throw new NotFoundError('Open reconciliation');

  // Verify transaction belongs to this account
  const [txRows] = await pool.query(
    `SELECT * FROM bank_transactions WHERE id = ? AND bank_account_id = ? AND company_id = ? AND deleted_at IS NULL`,
    [transactionId, bankAccountId, companyId]
  );
  if (!(txRows as any[]).length) throw new NotFoundError('Bank transaction');

  const txAmount = parseFloat((txRows as any[])[0].amount);

  if (reconcile) {
    await pool.query(
      `UPDATE bank_transactions SET is_reconciled = true, reconciled_at = NOW(), reconciliation_id = ?, updated_at = NOW() WHERE id = ?`,
      [reconciliationId, transactionId]
    );
    // Update reconciled_balance on the reconciliation
    await pool.query(
      `UPDATE bank_reconciliations SET reconciled_balance = reconciled_balance + ?, updated_at = NOW() WHERE id = ?`,
      [txAmount, reconciliationId]
    );
  } else {
    await pool.query(
      `UPDATE bank_transactions SET is_reconciled = false, reconciled_at = NULL, reconciliation_id = NULL, updated_at = NOW() WHERE id = ?`,
      [transactionId]
    );
    await pool.query(
      `UPDATE bank_reconciliations SET reconciled_balance = reconciled_balance - ?, updated_at = NOW() WHERE id = ?`,
      [txAmount, reconciliationId]
    );
  }

  // Return updated reconciliation
  const [updatedRec] = await pool.query('SELECT * FROM bank_reconciliations WHERE id = ?', [reconciliationId]);
  return (updatedRec as any[])[0];
};

export const completeReconciliation = async (
  companyId: string,
  bankAccountId: string,
  reconciliationId: string,
  userId: string
) => {
  const [recRows] = await pool.query(
    `SELECT * FROM bank_reconciliations WHERE id = ? AND bank_account_id = ? AND company_id = ? AND status = 'open'`,
    [reconciliationId, bankAccountId, companyId]
  );
  if (!(recRows as any[]).length) throw new NotFoundError('Open reconciliation');

  const rec = (recRows as any[])[0];
  const bankAccount = await getBankAccount(companyId, bankAccountId);

  // The reconciled balance should equal the sum of all reconciled transaction amounts
  const [reconciledTxs] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM bank_transactions
     WHERE bank_account_id = ? AND company_id = ? AND reconciliation_id = ? AND deleted_at IS NULL AND is_reconciled = true`,
    [bankAccountId, companyId, reconciliationId]
  );
  const reconciledTotal = parseFloat((reconciledTxs as any[])[0].total);

  const statementEnd = parseFloat(rec.statement_ending_balance);
  const openingBalance = parseFloat(bankAccount.opening_balance);

  // Total of all reconciled transactions ever (including previous reconciliations)
  const [allReconciledRows] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM bank_transactions
     WHERE bank_account_id = ? AND company_id = ? AND deleted_at IS NULL AND is_reconciled = true`,
    [bankAccountId, companyId]
  );
  const allReconciledTotal = parseFloat((allReconciledRows as any[])[0].total);
  const calculatedBalance = openingBalance + allReconciledTotal;
  const difference = Math.abs(statementEnd - calculatedBalance);

  if (difference > 0.01) {
    throw new ValidationError(
      `Reconciliation difference of ${difference.toFixed(2)} exists. Statement ending balance (${statementEnd.toFixed(2)}) does not match opening balance + reconciled transactions (${calculatedBalance.toFixed(2)}).`
    );
  }

  await pool.query(
    `UPDATE bank_reconciliations SET status = 'reconciled', reconciled_at = NOW(), reconciled_by = ?, reconciled_balance = ?, updated_at = NOW()
     WHERE id = ?`,
    [userId, reconciledTotal, reconciliationId]
  );
  const [completedRows] = await pool.query('SELECT * FROM bank_reconciliations WHERE id=?', [reconciliationId]);
  return (completedRows as any[])[0];
};

// ─── Bank Summary ───────────────────────────────────────────────────────────

export const getBankSummary = async (companyId: string) => {
  const [accounts] = await pool.query(
    `SELECT id, account_name, bank_name, account_type, currency, current_balance, is_active
     FROM bank_accounts
     WHERE company_id = ? AND deleted_at IS NULL
     ORDER BY account_name ASC`,
    [companyId]
  );

  const accountsArr = accounts as any[];
  const totalBalance = accountsArr.reduce((s: number, a: any) => s + parseFloat(a.current_balance), 0);
  const activeAccounts = accountsArr.filter((a: any) => a.is_active);

  return {
    accounts: accountsArr,
    total_balance: totalBalance,
    active_count: activeAccounts.length,
    total_count: accountsArr.length,
  };
};
