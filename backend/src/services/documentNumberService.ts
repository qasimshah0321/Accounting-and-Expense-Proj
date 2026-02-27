import { PoolClient } from 'pg';
import { pool, withTransaction } from '../config/database';
import { formatDate } from '../utils/dateUtils';

export type DocumentType =
  | 'invoice'
  | 'sales_order'
  | 'estimate'
  | 'delivery_note'
  | 'bill'
  | 'expense'
  | 'payment'
  | 'customer_payment'
  | 'vendor_payment'
  | 'inventory_transaction';

const DEFAULT_PREFIXES: Record<DocumentType, string> = {
  invoice: 'INV',
  sales_order: 'SO',
  estimate: 'EST',
  delivery_note: 'DN',
  bill: 'BILL',
  expense: 'EXP',
  payment: 'PMT',
  customer_payment: 'CPMT',
  vendor_payment: 'VPMT',
  inventory_transaction: 'INVT',
};

export const generateDocumentNumber = async (
  companyId: string,
  documentType: DocumentType,
  client?: PoolClient
): Promise<string> => {
  const query = async (text: string, params: unknown[]) =>
    client ? client.query(text, params) : pool.query(text, params);

  const { rows } = await query(
    `UPDATE document_sequences
     SET next_number = next_number + 1, updated_at = NOW()
     WHERE company_id = $1 AND document_type = $2
     RETURNING prefix, next_number - 1 AS current_number, padding, include_date`,
    [companyId, documentType]
  );

  let prefix: string;
  let seqNumber: number;
  let padding: number;
  let includeDate: boolean;

  if (rows.length === 0) {
    const defaultPrefix = DEFAULT_PREFIXES[documentType] || documentType.toUpperCase();
    await query(
      `INSERT INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
       VALUES ($1, $2, $3, 2, 3, false)
       ON CONFLICT (company_id, document_type) DO UPDATE SET next_number = document_sequences.next_number + 1
       RETURNING prefix, next_number - 1 AS current_number, padding, include_date`,
      [companyId, documentType, defaultPrefix]
    );
    prefix = defaultPrefix;
    seqNumber = 1;
    padding = 4;
    includeDate = true;
  } else {
    prefix = rows[0].prefix;
    seqNumber = rows[0].current_number;
    padding = rows[0].padding;
    includeDate = rows[0].include_date;
  }

  const parts: string[] = [prefix];
  if (includeDate) parts.push(formatDate(new Date(), 'yyyyMMdd'));
  parts.push(String(seqNumber).padStart(padding, '0'));
  return parts.join('-');
};

export const ensureDocumentSequences = async (companyId: string, existingClient?: PoolClient): Promise<void> => {
  const execute = async (client: PoolClient) => {
    for (const [type, prefix] of Object.entries(DEFAULT_PREFIXES)) {
      await client.query(
        `INSERT INTO document_sequences (company_id, document_type, prefix, next_number, padding, include_date)
         VALUES ($1, $2, $3, 1, 3, false)
         ON CONFLICT (company_id, document_type) DO NOTHING`,
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
