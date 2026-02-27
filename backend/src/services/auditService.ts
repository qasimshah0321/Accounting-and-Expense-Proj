import { pool } from '../config/database';
import { PoolClient } from 'pg';

interface AuditLogEntry {
  company_id: string;
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'convert' | 'payment';
  user_id: string;
  user_name: string;
  user_ip?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  description?: string;
}

export const createAuditLog = async (
  entry: AuditLogEntry,
  client?: PoolClient
): Promise<void> => {
  const sql = `
    INSERT INTO audit_logs (
      company_id, entity_type, entity_id, action,
      user_id, user_name, user_ip,
      field_name, old_value, new_value, changes, description
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  `;
  const values = [
    entry.company_id, entry.entity_type, entry.entity_id, entry.action,
    entry.user_id, entry.user_name, entry.user_ip || null,
    entry.field_name || null, entry.old_value || null, entry.new_value || null,
    entry.changes ? JSON.stringify(entry.changes) : null,
    entry.description || null,
  ];
  if (client) {
    await client.query(sql, values);
  } else {
    await pool.query(sql, values);
  }
};

export const createStatusHistory = async (
  entry: {
    company_id: string;
    document_type: string;
    document_id: string;
    document_no: string;
    from_status: string | null;
    to_status: string;
    changed_by: string;
    changed_by_name: string;
    reason?: string;
    notes?: string;
  },
  client?: PoolClient
): Promise<void> => {
  const sql = `
    INSERT INTO document_status_history (
      company_id, document_type, document_id, document_no,
      from_status, to_status, changed_by, changed_by_name, reason, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `;
  const values = [
    entry.company_id, entry.document_type, entry.document_id, entry.document_no,
    entry.from_status, entry.to_status, entry.changed_by, entry.changed_by_name,
    entry.reason || null, entry.notes || null,
  ];
  if (client) {
    await client.query(sql, values);
  } else {
    await pool.query(sql, values);
  }
};

export const getAuditLogs = async (
  companyId: string,
  filters: { entity_type?: string; entity_id?: string; page?: number; limit?: number }
) => {
  const conditions = ['company_id = $1'];
  const params: unknown[] = [companyId];
  let idx = 2;
  if (filters.entity_type) { conditions.push(`entity_type = $${idx++}`); params.push(filters.entity_type); }
  if (filters.entity_id) { conditions.push(`entity_id = $${idx++}`); params.push(filters.entity_id); }

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const { rows } = await pool.query(
    `SELECT * FROM audit_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM audit_logs WHERE ${conditions.join(' AND ')}`, params
  );
  return { logs: rows, total: parseInt(countResult.rows[0].count, 10) };
};
