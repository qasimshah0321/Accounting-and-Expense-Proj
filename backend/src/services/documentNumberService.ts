import { Connection } from 'mysql2/promise';
import { pool, withTransaction } from '../config/database';
import { formatDate } from '../utils/dateUtils';

export type DocumentType =
  | 'invoice'
  | 'sales_order'
  | 'purchase_order'
  | 'estimate'
  | 'delivery_note'
  | 'bill'
  | 'expense'
  | 'payment'
  | 'customer_payment'
  | 'vendor_payment'
  | 'inventory_transaction'
  | 'journal_entry'
  | 'bank_transaction';

const DEFAULT_PREFIXES: Record<DocumentType, string> = {
  invoice: 'INV',
  sales_order: 'SO',
  purchase_order: 'PO',
  estimate: 'EST',
  delivery_note: 'DN',
  bill: 'BILL',
  expense: 'EXP',
  payment: 'PMT',
  customer_payment: 'CPMT',
  vendor_payment: 'VPMT',
  inventory_transaction: 'INVT',
  journal_entry: 'JE',
  bank_transaction: 'BT',
};

export const generateDocumentNumber = async (
  companyId: string,
  documentType: DocumentType,
  client?: Connection
): Promise<string> => {
  const queryFn = client || pool;

  // Atomically increment and get the current number
  await queryFn.query(
    `UPDATE document_sequences
     SET next_number = next_number + 1, updated_at = NOW()
     WHERE company_id = ? AND document_type = ?`,
    [companyId, documentType]
  );

  const [rows] = await queryFn.query(
    `SELECT prefix, next_number - 1 AS current_number, padding, include_date
     FROM document_sequences WHERE company_id = ? AND document_type = ?`,
    [companyId, documentType]
  );

  let prefix: string;
  let seqNumber: number;
  let padding: number;
  let includeDate: boolean;

  if (!(rows as any[]).length) {
    const defaultPrefix = DEFAULT_PREFIXES[documentType] || documentType.toUpperCase();
    await queryFn.query(
      `INSERT INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
       VALUES (?, ?, ?, 2, 3, false)
       ON DUPLICATE KEY UPDATE next_number = next_number + 1`,
      [companyId, documentType, defaultPrefix]
    );
    prefix = defaultPrefix;
    seqNumber = 1;
    padding = 4;
    includeDate = true;
  } else {
    const row = (rows as any[])[0];
    prefix = row.prefix;
    seqNumber = row.current_number;
    padding = row.padding;
    includeDate = !!row.include_date;
  }

  const parts: string[] = [prefix];
  if (includeDate) parts.push(formatDate(new Date(), 'yyyyMMdd'));
  parts.push(String(seqNumber).padStart(padding, '0'));
  return parts.join('-');
};

export const ensureDocumentSequences = async (companyId: string, existingClient?: Connection): Promise<void> => {
  const execute = async (client: Connection) => {
    for (const [type, prefix] of Object.entries(DEFAULT_PREFIXES)) {
      await client.query(
        `INSERT IGNORE INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
         VALUES (?, ?, ?, 1, 3, false)`,
        [companyId, type, prefix]
      );
    }
  };
  if (existingClient) {
    await execute(existingClient);
  } else {
    await withTransaction(execute);
  }
};
