import { pool, withTransaction } from '../../config/database';
import { Connection } from 'mysql2/promise';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { createAuditLog } from '../../services/auditService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocumentType = 'purchase_order' | 'bill' | 'invoice' | 'expense';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ApprovalRule {
  id: string;
  company_id: string;
  document_type: string;
  min_amount: string | number;
  max_amount: string | number | null;
  approver_role: string;
  step_order: number;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  company_id: string;
  rule_id: string;
  document_type: string;
  document_id: string;
  document_no: string | null;
  document_amount: string | number | null;
  status: ApprovalStatus;
  requested_by: string | null;
  actioned_by: string | null;
  actioned_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleInput {
  document_type: DocumentType | string;
  min_amount?: number;
  max_amount?: number | null;
  approver_role: string;
  step_order?: number;
  is_active?: boolean;
}

export interface UpdateRuleInput {
  document_type?: DocumentType | string;
  min_amount?: number;
  max_amount?: number | null;
  approver_role?: string;
  step_order?: number;
  is_active?: boolean;
}

export type ApprovalAction = 'approve' | 'reject';

const VALID_DOC_TYPES: DocumentType[] = ['purchase_order', 'bill', 'invoice', 'expense'];

const validateDocType = (docType: string): void => {
  if (!VALID_DOC_TYPES.includes(docType as DocumentType)) {
    throw new ValidationError(
      `Invalid document_type: ${docType}. Must be one of ${VALID_DOC_TYPES.join(', ')}`
    );
  }
};

// ─── Rules CRUD ──────────────────────────────────────────────────────────────

export const getRules = async (companyId: string): Promise<ApprovalRule[]> => {
  const [rows] = await pool.query(
    `SELECT id, company_id, document_type, min_amount, max_amount, approver_role,
            step_order, is_active, created_at, updated_at
     FROM approval_workflow_rules
     WHERE company_id = ?
     ORDER BY document_type ASC, step_order ASC, min_amount ASC`,
    [companyId]
  );
  return rows as ApprovalRule[];
};

export const getRuleById = async (companyId: string, ruleId: string): Promise<ApprovalRule> => {
  const [rows] = await pool.query(
    `SELECT id, company_id, document_type, min_amount, max_amount, approver_role,
            step_order, is_active, created_at, updated_at
     FROM approval_workflow_rules
     WHERE id = ? AND company_id = ?`,
    [ruleId, companyId]
  );
  if (!(rows as ApprovalRule[]).length) throw new NotFoundError('Approval rule');
  return (rows as ApprovalRule[])[0];
};

export const createRule = async (
  companyId: string,
  userId: string,
  userName: string,
  data: CreateRuleInput
): Promise<ApprovalRule> => {
  validateDocType(data.document_type);
  if (!data.approver_role || !data.approver_role.trim()) {
    throw new ValidationError('approver_role is required');
  }
  if (data.max_amount != null && data.min_amount != null && Number(data.max_amount) < Number(data.min_amount)) {
    throw new ValidationError('max_amount must be greater than or equal to min_amount');
  }

  const minAmount = data.min_amount ?? 0;
  const maxAmount = data.max_amount ?? null;
  const stepOrder = data.step_order ?? 1;
  const isActive = data.is_active === undefined ? 1 : (data.is_active ? 1 : 0);

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO approval_workflow_rules
         (company_id, document_type, min_amount, max_amount, approver_role, step_order, is_active)
       VALUES (?,?,?,?,?,?,?)`,
      [companyId, data.document_type, minAmount, maxAmount, data.approver_role.trim(), stepOrder, isActive]
    );
    const [rows] = await client.query(
      `SELECT id, company_id, document_type, min_amount, max_amount, approver_role,
              step_order, is_active, created_at, updated_at
       FROM approval_workflow_rules
       WHERE company_id = ? AND document_type = ? AND approver_role = ?
       ORDER BY created_at DESC LIMIT 1`,
      [companyId, data.document_type, data.approver_role.trim()]
    );
    const created = (rows as ApprovalRule[])[0];
    await createAuditLog({
      company_id: companyId,
      entity_type: 'approval_rule',
      entity_id: created.id,
      action: 'create',
      user_id: userId,
      user_name: userName,
      description: `Approval rule created for ${data.document_type} (${minAmount} – ${maxAmount ?? 'unlimited'}) → ${data.approver_role}`,
    }, client);
    return created;
  });
};

export const updateRule = async (
  companyId: string,
  ruleId: string,
  userId: string,
  userName: string,
  data: UpdateRuleInput
): Promise<ApprovalRule> => {
  await getRuleById(companyId, ruleId);
  if (data.document_type !== undefined) validateDocType(data.document_type);
  if (data.max_amount != null && data.min_amount != null && Number(data.max_amount) < Number(data.min_amount)) {
    throw new ValidationError('max_amount must be greater than or equal to min_amount');
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.document_type !== undefined) { fields.push('document_type = ?'); values.push(data.document_type); }
  if (data.min_amount !== undefined)    { fields.push('min_amount = ?');    values.push(data.min_amount); }
  if (data.max_amount !== undefined)    { fields.push('max_amount = ?');    values.push(data.max_amount); }
  if (data.approver_role !== undefined) { fields.push('approver_role = ?'); values.push(data.approver_role.trim()); }
  if (data.step_order !== undefined)    { fields.push('step_order = ?');    values.push(data.step_order); }
  if (data.is_active !== undefined)     { fields.push('is_active = ?');     values.push(data.is_active ? 1 : 0); }

  if (!fields.length) return getRuleById(companyId, ruleId);

  fields.push('updated_at = NOW()');

  await pool.query(
    `UPDATE approval_workflow_rules SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`,
    [...values, ruleId, companyId]
  );

  await createAuditLog({
    company_id: companyId,
    entity_type: 'approval_rule',
    entity_id: ruleId,
    action: 'update',
    user_id: userId,
    user_name: userName,
    description: `Approval rule updated`,
  });

  return getRuleById(companyId, ruleId);
};

export const deleteRule = async (
  companyId: string,
  ruleId: string,
  userId: string,
  userName: string
): Promise<void> => {
  await getRuleById(companyId, ruleId);
  // Soft delete via is_active=0 to preserve referential integrity with approval_requests
  await pool.query(
    `UPDATE approval_workflow_rules SET is_active = 0, updated_at = NOW() WHERE id = ? AND company_id = ?`,
    [ruleId, companyId]
  );
  await createAuditLog({
    company_id: companyId,
    entity_type: 'approval_rule',
    entity_id: ruleId,
    action: 'delete',
    user_id: userId,
    user_name: userName,
    description: 'Approval rule deactivated',
  });
};

// ─── Rule Matching ───────────────────────────────────────────────────────────

/**
 * Find the active rule that matches the given (document_type, amount) pair.
 * If multiple rules match, the one with the lowest step_order, then the most
 * specific (smallest max_amount) wins. Rules with NULL max_amount are treated
 * as "no upper limit" and match any amount >= min_amount.
 */
export const findMatchingRule = async (
  companyId: string,
  documentType: string,
  amount: number,
  client?: Connection
): Promise<ApprovalRule | null> => {
  const conn = client || pool;
  const [rows] = await conn.query(
    `SELECT id, company_id, document_type, min_amount, max_amount, approver_role,
            step_order, is_active, created_at, updated_at
     FROM approval_workflow_rules
     WHERE company_id = ?
       AND document_type = ?
       AND is_active = 1
       AND ? >= min_amount
       AND (max_amount IS NULL OR ? <= max_amount)
     ORDER BY step_order ASC,
              CASE WHEN max_amount IS NULL THEN 1 ELSE 0 END ASC,
              max_amount ASC,
              created_at ASC
     LIMIT 1`,
    [companyId, documentType, amount, amount]
  );
  const matches = rows as ApprovalRule[];
  return matches.length ? matches[0] : null;
};

// ─── Requests ────────────────────────────────────────────────────────────────

/**
 * Called by document services when a doc moves to 'pending_approval'. Looks up
 * a matching active rule; if found, creates a pending approval_request and
 * returns it. If no rule matches, returns null and the caller can let the
 * document continue along its existing path.
 */
export const createRequestIfRuleMatches = async (
  companyId: string,
  documentType: string,
  documentId: string,
  documentNo: string | null,
  amount: number,
  requestedByUserId: string | null,
  client?: Connection
): Promise<ApprovalRequest | null> => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const rule = await findMatchingRule(companyId, documentType, safeAmount, client);
  if (!rule) return null;

  const conn = client || pool;
  await conn.query(
    `INSERT INTO approval_requests
       (company_id, rule_id, document_type, document_id, document_no, document_amount,
        status, requested_by)
     VALUES (?,?,?,?,?,?, 'pending', ?)`,
    [companyId, rule.id, documentType, documentId, documentNo, safeAmount, requestedByUserId]
  );
  const [rows] = await conn.query(
    `SELECT id, company_id, rule_id, document_type, document_id, document_no, document_amount,
            status, requested_by, actioned_by, actioned_at, rejection_reason, created_at, updated_at
     FROM approval_requests
     WHERE company_id = ? AND document_id = ? AND document_type = ?
     ORDER BY created_at DESC LIMIT 1`,
    [companyId, documentId, documentType]
  );
  return (rows as ApprovalRequest[])[0] || null;
};

/**
 * Pending approval requests where the current user's role matches the rule's
 * approver_role. Joined to the rule so we can filter by role.
 */
export const getMyPendingRequests = async (
  companyId: string,
  userRole: string
): Promise<Array<ApprovalRequest & { approver_role: string; requested_by_name: string | null }>> => {
  const [rows] = await pool.query(
    `SELECT ar.id, ar.company_id, ar.rule_id, ar.document_type, ar.document_id,
            ar.document_no, ar.document_amount, ar.status, ar.requested_by,
            ar.actioned_by, ar.actioned_at, ar.rejection_reason,
            ar.created_at, ar.updated_at,
            r.approver_role,
            CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,'')) AS requested_by_name
     FROM approval_requests ar
     INNER JOIN approval_workflow_rules r ON r.id = ar.rule_id
     LEFT JOIN users u ON u.id = ar.requested_by
     WHERE ar.company_id = ?
       AND ar.status = 'pending'
       AND r.approver_role = ?
     ORDER BY ar.created_at DESC`,
    [companyId, userRole]
  );
  return rows as Array<ApprovalRequest & { approver_role: string; requested_by_name: string | null }>;
};

export const getPendingRequestsForDocument = async (
  companyId: string,
  documentType: string,
  documentId: string
): Promise<ApprovalRequest[]> => {
  const [rows] = await pool.query(
    `SELECT id, company_id, rule_id, document_type, document_id, document_no, document_amount,
            status, requested_by, actioned_by, actioned_at, rejection_reason, created_at, updated_at
     FROM approval_requests
     WHERE company_id = ? AND document_type = ? AND document_id = ?
     ORDER BY created_at DESC`,
    [companyId, documentType, documentId]
  );
  return rows as ApprovalRequest[];
};

const getRequestById = async (
  companyId: string,
  requestId: string,
  client?: Connection
): Promise<ApprovalRequest & { approver_role: string }> => {
  const conn = client || pool;
  const [rows] = await conn.query(
    `SELECT ar.id, ar.company_id, ar.rule_id, ar.document_type, ar.document_id,
            ar.document_no, ar.document_amount, ar.status, ar.requested_by,
            ar.actioned_by, ar.actioned_at, ar.rejection_reason,
            ar.created_at, ar.updated_at,
            r.approver_role
     FROM approval_requests ar
     INNER JOIN approval_workflow_rules r ON r.id = ar.rule_id
     WHERE ar.id = ? AND ar.company_id = ?`,
    [requestId, companyId]
  );
  if (!(rows as Array<ApprovalRequest & { approver_role: string }>).length) {
    throw new NotFoundError('Approval request');
  }
  return (rows as Array<ApprovalRequest & { approver_role: string }>)[0];
};

/**
 * Approve or reject a pending request. Only a user whose role matches the
 * rule's approver_role may action the request.
 */
export const actionRequest = async (
  companyId: string,
  requestId: string,
  userId: string,
  userName: string,
  userRole: string,
  action: ApprovalAction,
  rejectionReason?: string
): Promise<ApprovalRequest> => {
  if (action !== 'approve' && action !== 'reject') {
    throw new ValidationError(`Invalid action: ${action}`);
  }
  if (action === 'reject' && (!rejectionReason || !rejectionReason.trim())) {
    throw new ValidationError('rejection_reason is required when rejecting');
  }

  return withTransaction(async (client) => {
    const reqRow = await getRequestById(companyId, requestId, client);
    if (reqRow.status !== 'pending') {
      throw new ValidationError(`Request already ${reqRow.status}`);
    }
    if (reqRow.approver_role !== userRole) {
      throw new ForbiddenError(
        `Only users with role '${reqRow.approver_role}' may action this request`
      );
    }

    const newStatus: ApprovalStatus = action === 'approve' ? 'approved' : 'rejected';

    await client.query(
      `UPDATE approval_requests
       SET status = ?, actioned_by = ?, actioned_at = NOW(),
           rejection_reason = ?, updated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [newStatus, userId, action === 'reject' ? (rejectionReason || null) : null, requestId, companyId]
    );

    await createAuditLog({
      company_id: companyId,
      entity_type: 'approval_request',
      entity_id: requestId,
      action: 'status_change',
      user_id: userId,
      user_name: userName,
      old_value: 'pending',
      new_value: newStatus,
      description: `Approval request ${newStatus} for ${reqRow.document_type} ${reqRow.document_no || reqRow.document_id}`,
    }, client);

    const [rows] = await client.query(
      `SELECT id, company_id, rule_id, document_type, document_id, document_no, document_amount,
              status, requested_by, actioned_by, actioned_at, rejection_reason, created_at, updated_at
       FROM approval_requests WHERE id = ?`,
      [requestId]
    );
    return (rows as ApprovalRequest[])[0];
  });
};
