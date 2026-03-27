import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { sendSuccess } from '../../utils/response';
import { pool } from '../../config/database';
import { getCompanyId } from '../../middleware/multiTenant';
import { ensureDocumentSequences } from '../../services/documentNumberService';

export const getDocumentSequences = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    const [rows] = await pool.query(
      'SELECT document_type, prefix, current_sequence, last_reset_date FROM document_sequences WHERE company_id=? ORDER BY document_type',
      [companyId]
    );
    sendSuccess(res, rows, 'Document sequences retrieved');
  } catch (err) { next(err); }
};

export const resetDocumentSequence = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    const { document_type } = req.params;
    const { start_from } = req.body;
    const newSeq = Math.max(0, parseInt(start_from, 10) - 1) || 0;
    await pool.query(
      `UPDATE document_sequences SET current_sequence=?, last_reset_date=CURDATE(), updated_at=NOW()
       WHERE company_id=? AND document_type=?`,
      [newSeq, companyId, document_type]
    );
    const [rows] = await pool.query(
      `SELECT * FROM document_sequences WHERE company_id=? AND document_type=?`,
      [companyId, document_type]
    );
    if (!(rows as any[]).length) {
      await ensureDocumentSequences(companyId);
      throw new Error(`Sequence for '${document_type}' not found. Please try again.`);
    }
    sendSuccess(res, (rows as any[])[0], 'Sequence reset');
  } catch (err) { next(err); }
};

export const getCompanyInfo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, address, city, state, country, postal_code, tax_number, currency, timezone, created_at FROM companies WHERE id=?',
      [getCompanyId(req)]
    );
    sendSuccess(res, (rows as any[])[0] || null, 'Company info retrieved');
  } catch (err) { next(err); }
};

export const updateCompanyInfo = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = getCompanyId(req);
    const allowed = ['name', 'email', 'phone', 'address', 'city', 'state', 'country', 'postal_code', 'tax_number', 'currency', 'timezone'];
    const fields = Object.keys(req.body).filter(k => allowed.includes(k));
    if (!fields.length) { sendSuccess(res, null, 'No changes'); return; }
    const setClause = fields.map(f => `${f}=?`).join(', ');
    await pool.query(
      `UPDATE companies SET ${setClause}, updated_at=NOW() WHERE id=?`,
      [...fields.map(f => req.body[f]), companyId]
    );
    const [rows] = await pool.query(
      'SELECT id,name,email,phone,address,city,state,country,postal_code,tax_number,currency,timezone FROM companies WHERE id=?',
      [companyId]
    );
    sendSuccess(res, (rows as any[])[0], 'Company info updated');
  } catch (err) { next(err); }
};

export const healthCheck = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() }, 'Service is healthy');
  } catch (err) { next(err); }
};
