import crypto from 'crypto';
import https from 'https';
import { URL } from 'url';
import { pool } from '../../config/database';
import { config } from '../../config/env';
import { NotFoundError, ValidationError } from '../../utils/errors';

// ──────────────────────────────────────────────────────────────────────────────
// FBR Digital Invoicing (DI) integration — PRAL Technical Spec v1.12.
//
// Auth: a single 5-year Bearer "security token" issued by PRAL, stored per
// company (AES-encrypted). Sandbox vs production is selected by fbr_sandbox_mode
// (the `_sb` suffix on submit endpoints) and by which token is configured.
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface FBRConfig {
  fbr_enabled: boolean;
  fbr_sandbox_mode: boolean;
  fbr_ntn: string | null;                 // seller NTN/CNIC (7/13 digits)
  fbr_seller_business_name: string | null;
  fbr_seller_province: string | null;
  fbr_seller_address: string | null;
  fbr_business_activity: string | null;
  fbr_sector: string | null;
  fbr_default_scenario_id: string | null;
  fbr_security_token?: string | null;     // raw (only on save / internal use)
  fbr_token_set?: boolean;                // flag for GET (raw token never returned)
}

export interface FBRValidationResponse {
  invoiceNumber?: string | null;
  dated?: string | null;
  validationResponse: {
    statusCode: string;                   // "00" valid, "01" invalid
    status: string;                       // "Valid" / "Invalid"
    errorCode?: string | null;
    error?: string | null;
    invoiceStatuses?: Array<{
      itemSNo?: string;
      statusCode?: string;
      status?: string;
      invoiceNo?: string | null;
      errorCode?: string | null;
      error?: string | null;
    }> | null;
  };
}

export interface FBRSubmitResult {
  invoiceNumber: string;
  dated: string | null;
  qr_url: string;
  raw: FBRValidationResponse;
}

// ──────────────────────────────────────────────────────────────────────────────
// Token encryption (AES-256-CBC using key derived from JWT_SECRET)
// Stored as `iv:encryptedHex`
// ──────────────────────────────────────────────────────────────────────────────
const getEncryptionKey = (): Buffer =>
  crypto.scryptSync(config.jwt.secret, 'fbr-salt', 32);

const encryptSecret = (plain: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptSecret = (stored: string): string => {
  const [ivHex, encHex] = stored.split(':');
  if (!ivHex || !encHex) throw new Error('Malformed encrypted secret');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

// ──────────────────────────────────────────────────────────────────────────────
// Minimal HTTPS JSON helpers (built-in `https` — no extra deps)
// ──────────────────────────────────────────────────────────────────────────────
const httpsRequestJson = (
  method: 'GET' | 'POST',
  urlStr: string,
  body: any,
  bearer?: string,
  timeoutMs = config.fbr.timeoutMs
): Promise<{ status: number; data: any }> => {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try { parsed = new URL(urlStr); } catch (e) { return reject(e); }
    const payload = method === 'POST' ? Buffer.from(JSON.stringify(body || {}), 'utf8') : null;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = String(payload.length);
    }
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

    const req = https.request(
      {
        method,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search || ''}`,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let data: any = raw;
          try { data = raw ? JSON.parse(raw) : null; } catch { /* keep raw */ }
          resolve({ status: res.statusCode || 0, data });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('FBR request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
};

const httpsPostJson = (urlStr: string, body: any, bearer?: string) =>
  httpsRequestJson('POST', urlStr, body, bearer);
const httpsGetJson = (urlStr: string, bearer?: string) =>
  httpsRequestJson('GET', urlStr, null, bearer);

// ──────────────────────────────────────────────────────────────────────────────
// FBR endpoint builders
// ──────────────────────────────────────────────────────────────────────────────
// Submit endpoints share one host; sandbox uses the `_sb` suffix.
const diPostUrl = (sandbox: boolean): string =>
  `${config.fbr.diBase}/postinvoicedata${sandbox ? '_sb' : ''}`;
const diValidateUrl = (sandbox: boolean): string =>
  `${config.fbr.diBase}/validateinvoicedata${sandbox ? '_sb' : ''}`;

// Reference APIs (same for both environments; routing is by token).
const REFERENCE_ENDPOINTS: Record<string, string> = {
  provinces:  `${config.fbr.pdiBase}/v1/provinces`,
  doctypes:   `${config.fbr.pdiBase}/v1/doctypecode`,
  hscodes:    `${config.fbr.pdiBase}/v1/itemdesccode`,
  sroitems:   `${config.fbr.pdiBase}/v1/sroitemcode`,
  transtypes: `${config.fbr.pdiBase}/v1/transtypecode`,
  uom:        `${config.fbr.pdiBase}/v1/uom`,
};

// The FBR verification/QR target — the printed QR encodes the FBR invoice number.
const fbrQrUrl = (invoiceNumber: string): string =>
  `https://gw.fbr.gov.pk/di_data/v1/di/verifyinvoice?invoiceNumber=${encodeURIComponent(invoiceNumber)}`;

// ──────────────────────────────────────────────────────────────────────────────
// Config CRUD
// ──────────────────────────────────────────────────────────────────────────────
export const getFBRConfig = async (
  companyId: string,
  includeToken = false
): Promise<FBRConfig | null> => {
  const [rows] = await pool.query(
    `SELECT fbr_enabled, fbr_sandbox_mode, fbr_ntn, fbr_security_token_enc,
            fbr_seller_business_name, fbr_seller_province, fbr_seller_address,
            fbr_business_activity, fbr_sector, fbr_default_scenario_id
     FROM companies WHERE id=?`,
    [companyId]
  );
  const r = (rows as any[])[0];
  if (!r) return null;
  const out: FBRConfig = {
    fbr_enabled: !!r.fbr_enabled,
    fbr_sandbox_mode:
      r.fbr_sandbox_mode === null || r.fbr_sandbox_mode === undefined ? true : !!r.fbr_sandbox_mode,
    fbr_ntn: r.fbr_ntn || null,
    fbr_seller_business_name: r.fbr_seller_business_name || null,
    fbr_seller_province: r.fbr_seller_province || null,
    fbr_seller_address: r.fbr_seller_address || null,
    fbr_business_activity: r.fbr_business_activity || null,
    fbr_sector: r.fbr_sector || null,
    fbr_default_scenario_id: r.fbr_default_scenario_id || null,
    fbr_token_set: !!r.fbr_security_token_enc,
  };
  if (includeToken && r.fbr_security_token_enc) {
    try { out.fbr_security_token = decryptSecret(r.fbr_security_token_enc); }
    catch { out.fbr_security_token = null; }
  }
  return out;
};

export const saveFBRConfig = async (
  companyId: string,
  input: Partial<FBRConfig>
): Promise<FBRConfig> => {
  const setParts: string[] = [];
  const params: unknown[] = [];

  const setStr = (col: string, val: unknown) => { setParts.push(`${col}=?`); params.push(val ?? null); };

  if (input.fbr_enabled !== undefined) {
    setParts.push('fbr_enabled=?');
    params.push(input.fbr_enabled ? 1 : 0);
    // Mutual exclusivity with PRA — only one tax authority is active at a time.
    if (input.fbr_enabled) {
      setParts.push("tax_authority='fbr'");
      setParts.push('pra_enabled=0');
    } else {
      setParts.push("tax_authority=IF(tax_authority='fbr','none',tax_authority)");
    }
  }
  if (input.fbr_sandbox_mode !== undefined) { setParts.push('fbr_sandbox_mode=?'); params.push(input.fbr_sandbox_mode ? 1 : 0); }
  if (input.fbr_ntn !== undefined) setStr('fbr_ntn', input.fbr_ntn || null);
  if (input.fbr_seller_business_name !== undefined) setStr('fbr_seller_business_name', input.fbr_seller_business_name || null);
  if (input.fbr_seller_province !== undefined) setStr('fbr_seller_province', input.fbr_seller_province || null);
  if (input.fbr_seller_address !== undefined) setStr('fbr_seller_address', input.fbr_seller_address || null);
  if (input.fbr_business_activity !== undefined) setStr('fbr_business_activity', input.fbr_business_activity || null);
  if (input.fbr_sector !== undefined) setStr('fbr_sector', input.fbr_sector || null);
  if (input.fbr_default_scenario_id !== undefined) setStr('fbr_default_scenario_id', input.fbr_default_scenario_id || null);

  // Only update the token when a non-empty string is supplied
  if (input.fbr_security_token !== undefined && input.fbr_security_token !== null && input.fbr_security_token !== '') {
    setParts.push('fbr_security_token_enc=?');
    params.push(encryptSecret(String(input.fbr_security_token)));
  }

  if (setParts.length > 0) {
    params.push(companyId);
    await pool.query(`UPDATE companies SET ${setParts.join(', ')}, updated_at=NOW() WHERE id=?`, params);
  }

  const saved = await getFBRConfig(companyId, false);
  if (!saved) throw new NotFoundError('Company');
  return saved;
};

// ──────────────────────────────────────────────────────────────────────────────
// Token access
// ──────────────────────────────────────────────────────────────────────────────
const getSecurityToken = async (companyId: string): Promise<string> => {
  const cfg = await getFBRConfig(companyId, true);
  if (!cfg) throw new NotFoundError('Company');
  if (!cfg.fbr_enabled) throw new ValidationError('FBR integration is not enabled for this company');
  if (!cfg.fbr_security_token) {
    throw new ValidationError('FBR security token is not configured. Paste your PRAL Bearer token in FBR settings.');
  }
  return cfg.fbr_security_token;
};

// Public: validate the token by calling a cheap reference GET (provinces).
export const testFBRConnection = async (companyId: string): Promise<{ ok: boolean; message: string }> => {
  const token = await getSecurityToken(companyId);
  const { status, data } = await httpsGetJson(REFERENCE_ENDPOINTS.provinces, token);
  if (status === 401) throw new ValidationError('FBR rejected the security token (401 Unauthorized). Check the token and seller NTN.');
  if (status < 200 || status >= 300) {
    const msg = (data && (data.message || data.error)) || `FBR returned HTTP ${status}`;
    throw new ValidationError(typeof msg === 'string' ? msg : 'FBR connection test failed');
  }
  return { ok: true, message: 'FBR security token is valid — connection successful' };
};

// ──────────────────────────────────────────────────────────────────────────────
// Reference data sync + cache
// ──────────────────────────────────────────────────────────────────────────────
const REFERENCE_MAPPERS: Record<string, (row: any) => { code: string; description: string; extra: any } | null> = {
  provinces:  (r) => ({ code: String(r.stateProvinceCode), description: r.stateProvinceDesc, extra: null }),
  doctypes:   (r) => ({ code: String(r.docTypeId), description: r.docDescription, extra: null }),
  hscodes:    (r) => ({ code: String(r.hS_CODE ?? r.hs_code ?? r.HS_CODE), description: r.description, extra: null }),
  sroitems:   (r) => ({ code: String(r.srO_ITEM_ID), description: String(r.srO_ITEM_DESC), extra: null }),
  transtypes: (r) => ({ code: String(r.transactioN_TYPE_ID), description: r.transactioN_DESC, extra: null }),
  uom:        (r) => ({ code: String(r.uoM_ID), description: r.description, extra: null }),
};

// Sync one reference type into fbr_reference_data. Returns count synced.
export const syncReferenceType = async (companyId: string, refType: string, token: string): Promise<number> => {
  const endpoint = REFERENCE_ENDPOINTS[refType];
  const mapper = REFERENCE_MAPPERS[refType];
  if (!endpoint || !mapper) throw new ValidationError(`Unknown FBR reference type: ${refType}`);

  const { status, data } = await httpsGetJson(endpoint, token);
  if (status === 401) throw new ValidationError('FBR rejected the security token (401 Unauthorized).');
  if (status < 200 || status >= 300 || !Array.isArray(data)) {
    const msg = (data && (data.message || data.error)) || `FBR returned HTTP ${status} for ${refType}`;
    throw new ValidationError(typeof msg === 'string' ? msg : `Failed to sync ${refType}`);
  }

  let count = 0;
  for (const row of data) {
    const m = mapper(row);
    if (!m || m.code === 'undefined' || m.code === 'null') continue;
    await pool.query(
      `INSERT INTO fbr_reference_data (company_id, ref_type, code, description, extra_json, synced_at)
       VALUES (?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE description=VALUES(description), extra_json=VALUES(extra_json), synced_at=NOW()`,
      [companyId, refType, m.code, m.description ?? null, m.extra ? JSON.stringify(m.extra) : null]
    );
    count++;
  }
  return count;
};

// Sync all (or one) reference types. Returns per-type counts.
export const syncReferenceData = async (
  companyId: string,
  refType?: string
): Promise<Record<string, number>> => {
  const token = await getSecurityToken(companyId);
  const types = refType ? [refType] : Object.keys(REFERENCE_ENDPOINTS);
  const result: Record<string, number> = {};
  for (const t of types) {
    result[t] = await syncReferenceType(companyId, t, token);
  }
  return result;
};

export const getReferenceData = async (companyId: string, refType: string) => {
  const [rows] = await pool.query(
    `SELECT code, description, extra_json, synced_at
     FROM fbr_reference_data WHERE company_id=? AND ref_type=? ORDER BY description`,
    [companyId, refType]
  );
  return rows as any[];
};

// Proxy FBR's Get_Reg_Type: returns whether a buyer NTN/CNIC is Registered.
export const lookupBuyerRegistration = async (companyId: string, regNo: string) => {
  const token = await getSecurityToken(companyId);
  const { status, data } = await httpsPostJson(
    `${config.fbr.distBase}/Get_Reg_Type`,
    { Registration_No: regNo },
    token
  );
  if (status < 200 || status >= 300) {
    const msg = (data && (data.message || data.error)) || `FBR returned HTTP ${status}`;
    throw new ValidationError(typeof msg === 'string' ? msg : 'FBR registration lookup failed');
  }
  return {
    registration_no: data?.REGISTRATION_NO || regNo,
    registration_type: data?.REGISTRATION_TYPE || null, // "Registered" / "unregistered"
    raw: data,
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// Build DI payload from an invoice
// ──────────────────────────────────────────────────────────────────────────────
const toDIDate = (d: any): string => {
  if (!d) return new Date().toISOString().slice(0, 10);
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
};

// Derives a "rate" string (e.g. "18%") from stored rate_desc or numeric tax_rate.
const deriveRate = (li: any): string => {
  if (li.rate_desc) return String(li.rate_desc);
  const taxRate = parseFloat(li.tax_rate);
  if (!isNaN(taxRate)) return `${taxRate}%`;
  return '0%';
};

export const buildDIPayload = (invoice: any, lineItems: any[], cfg: FBRConfig) => {
  const sandbox = !!cfg.fbr_sandbox_mode;

  const items = lineItems.map((li) => {
    const qty = parseFloat(li.quantity) || 0;
    const rate = parseFloat(li.rate) || 0;
    const discount = parseFloat(li.discount_per_item ?? li.discount) || 0;
    const valueExclST = Number((qty * rate - discount).toFixed(2));
    const salesTax = parseFloat(li.tax_amount);
    const salesTaxApplicable = !isNaN(salesTax)
      ? Number(salesTax.toFixed(2))
      : Number((valueExclST * (parseFloat(li.tax_rate) || 0) / 100).toFixed(2));

    return {
      hsCode: li.hs_code || '',
      productDescription: li.description || '',
      rate: deriveRate(li),
      uoM: li.uom || li.unit_of_measure || 'Numbers, pieces, units',
      quantity: Number(qty.toFixed(4)),
      totalValues: Number((valueExclST + salesTaxApplicable).toFixed(2)),
      valueSalesExcludingST: valueExclST,
      fixedNotifiedValueOrRetailPrice: Number((parseFloat(li.fixed_notified_value) || 0).toFixed(2)),
      salesTaxApplicable,
      salesTaxWithheldAtSource: Number((parseFloat(li.sales_tax_withheld) || 0).toFixed(2)),
      extraTax: Number((parseFloat(li.extra_tax) || 0).toFixed(2)),
      furtherTax: Number((parseFloat(li.further_tax) || 0).toFixed(2)),
      sroScheduleNo: li.sro_schedule_no || '',
      fedPayable: Number((parseFloat(li.fed_payable) || 0).toFixed(2)),
      discount: Number(discount.toFixed(2)),
      saleType: li.sale_type || 'Goods at standard rate (default)',
      sroItemSerialNo: li.sro_item_serial_no || '',
    };
  });

  const registrationType = invoice.buyer_registration_type || 'Unregistered';

  const payload: any = {
    invoiceType: invoice.fbr_invoice_type || 'Sale Invoice',
    invoiceDate: toDIDate(invoice.invoice_date),
    sellerNTNCNIC: cfg.fbr_ntn || '',
    sellerBusinessName: cfg.fbr_seller_business_name || '',
    sellerProvince: cfg.fbr_seller_province || '',
    sellerAddress: cfg.fbr_seller_address || '',
    buyerNTNCNIC: invoice.buyer_ntn || invoice.buyer_cnic || '',
    buyerBusinessName: invoice.buyer_business_name || invoice.customer_name || '',
    buyerProvince: invoice.buyer_province || '',
    buyerAddress: invoice.bill_to || invoice.billing_address || '',
    buyerRegistrationType: registrationType,
    invoiceRefNo: invoice.reference_no || '',
    items,
  };

  // scenarioId is required for sandbox only.
  if (sandbox) {
    payload.scenarioId = invoice.fbr_scenario_id || cfg.fbr_default_scenario_id || 'SN001';
  }

  return payload;
};

// ──────────────────────────────────────────────────────────────────────────────
// Load an invoice + line items + config (shared by validate/submit)
// ──────────────────────────────────────────────────────────────────────────────
const loadInvoiceForFBR = async (companyId: string, invoiceId: string) => {
  const [invRows] = await pool.query(
    'SELECT * FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL',
    [invoiceId, companyId]
  );
  if (!(invRows as any[]).length) throw new NotFoundError('Invoice');
  const invoice = (invRows as any[])[0];

  const [liRows] = await pool.query(
    'SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY line_number',
    [invoiceId]
  );

  const cfg = await getFBRConfig(companyId, true);
  if (!cfg) throw new NotFoundError('Company');
  if (!cfg.fbr_enabled) throw new ValidationError('FBR integration is not enabled for this company');

  return { invoice, lineItems: liRows as any[], cfg };
};

const extractError = (resp: FBRValidationResponse): string => {
  const vr = resp?.validationResponse;
  if (!vr) return 'Unknown FBR error';
  const parts: string[] = [];
  if (vr.error) parts.push(`${vr.errorCode ? `[${vr.errorCode}] ` : ''}${vr.error}`);
  for (const s of vr.invoiceStatuses || []) {
    if (s.status && s.status.toLowerCase() === 'invalid' && s.error) {
      parts.push(`item ${s.itemSNo}: ${s.errorCode ? `[${s.errorCode}] ` : ''}${s.error}`);
    }
  }
  return parts.length ? parts.join('; ') : 'FBR reported the invoice as invalid';
};

const isValid = (resp: FBRValidationResponse): boolean => {
  const vr = resp?.validationResponse;
  if (!vr) return false;
  if (vr.statusCode !== '00' || (vr.status || '').toLowerCase() !== 'valid') return false;
  // Any invalid item fails the whole submission.
  for (const s of vr.invoiceStatuses || []) {
    if ((s.status || '').toLowerCase() === 'invalid') return false;
  }
  return true;
};

// ──────────────────────────────────────────────────────────────────────────────
// Validate (dry run) — does not persist a submission
// ──────────────────────────────────────────────────────────────────────────────
export const validateInvoiceWithFBR = async (
  companyId: string,
  invoiceId: string
): Promise<FBRValidationResponse> => {
  const { invoice, lineItems, cfg } = await loadInvoiceForFBR(companyId, invoiceId);
  const token = await getSecurityToken(companyId);
  const payload = buildDIPayload(invoice, lineItems, cfg);

  const { status, data } = await httpsPostJson(diValidateUrl(!!cfg.fbr_sandbox_mode), payload, token);
  if (status === 401) throw new ValidationError('FBR rejected the security token (401 Unauthorized).');
  if (status < 200 || status >= 300) {
    const msg = (data && (data.message || data.error)) || `FBR returned HTTP ${status}`;
    throw new ValidationError(typeof msg === 'string' ? msg : 'FBR validation failed');
  }
  return data as FBRValidationResponse;
};

// ──────────────────────────────────────────────────────────────────────────────
// Submit (real) — persists the FBR invoice number + status
// ──────────────────────────────────────────────────────────────────────────────
export const submitInvoiceToFBR = async (
  companyId: string,
  invoiceId: string
): Promise<FBRSubmitResult> => {
  const { invoice, lineItems, cfg } = await loadInvoiceForFBR(companyId, invoiceId);

  if (invoice.fbr_submission_status === 'submitted' && invoice.fbr_usin) {
    throw new ValidationError(`Invoice already submitted to FBR (${invoice.fbr_usin})`);
  }
  const submittableStatuses = ['approved', 'sent', 'paid', 'partially_paid'];
  if (!submittableStatuses.includes(invoice.status)) {
    throw new ValidationError(`Invoice must be approved/sent before submitting to FBR (current status: ${invoice.status})`);
  }

  const token = await getSecurityToken(companyId);
  const payload = buildDIPayload(invoice, lineItems, cfg);

  let response: { status: number; data: any };
  try {
    response = await httpsPostJson(diPostUrl(!!cfg.fbr_sandbox_mode), payload, token);
  } catch (err: any) {
    const msg = err?.message || 'FBR submission failed';
    await pool.query(
      `UPDATE invoices SET fbr_submission_status='failed', fbr_error=?, updated_at=NOW() WHERE id=?`,
      [msg, invoiceId]
    );
    throw new ValidationError(msg);
  }

  if (response.status === 401) {
    await pool.query(
      `UPDATE invoices SET fbr_submission_status='failed', fbr_error=?, updated_at=NOW() WHERE id=?`,
      ['FBR rejected the security token (401 Unauthorized).', invoiceId]
    );
    throw new ValidationError('FBR rejected the security token (401 Unauthorized).');
  }
  if (response.status < 200 || response.status >= 300) {
    const msg =
      (response.data && (response.data.message || response.data.error)) ||
      `FBR returned HTTP ${response.status}`;
    await pool.query(
      `UPDATE invoices SET fbr_submission_status='failed', fbr_error=?, updated_at=NOW() WHERE id=?`,
      [typeof msg === 'string' ? msg : JSON.stringify(msg), invoiceId]
    );
    throw new ValidationError(typeof msg === 'string' ? msg : 'FBR submission failed');
  }

  const resp = response.data as FBRValidationResponse;

  if (!isValid(resp)) {
    const errMsg = extractError(resp);
    await pool.query(
      `UPDATE invoices SET fbr_submission_status='failed', fbr_error=?, fbr_response_json=?, updated_at=NOW() WHERE id=?`,
      [errMsg, JSON.stringify(resp), invoiceId]
    );
    throw new ValidationError(`FBR rejected the invoice: ${errMsg}`);
  }

  const invoiceNumber = resp.invoiceNumber || '';
  if (!invoiceNumber) {
    await pool.query(
      `UPDATE invoices SET fbr_submission_status='failed', fbr_error=?, fbr_response_json=?, updated_at=NOW() WHERE id=?`,
      ['FBR returned Valid but no invoice number', JSON.stringify(resp), invoiceId]
    );
    throw new ValidationError('FBR returned Valid but no invoice number');
  }

  const qrUrl = fbrQrUrl(invoiceNumber);
  await pool.query(
    `UPDATE invoices
     SET fbr_usin=?, fbr_qr_url=?, fbr_submission_status='submitted',
         fbr_submitted_at=NOW(), fbr_error=NULL, fbr_response_json=?, updated_at=NOW()
     WHERE id=?`,
    [invoiceNumber, qrUrl, JSON.stringify(resp), invoiceId]
  );

  return { invoiceNumber, dated: resp.dated || null, qr_url: qrUrl, raw: resp };
};

// ──────────────────────────────────────────────────────────────────────────────
// Status
// ──────────────────────────────────────────────────────────────────────────────
export const getInvoiceFBRStatus = async (companyId: string, invoiceId: string) => {
  const [rows] = await pool.query(
    `SELECT id, invoice_no, fbr_usin, fbr_qr_url, fbr_submission_status,
            fbr_submitted_at, fbr_error, fbr_scenario_id, fbr_invoice_type
     FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL`,
    [invoiceId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Invoice');
  return (rows as any[])[0];
};
