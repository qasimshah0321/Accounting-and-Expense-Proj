import crypto from 'crypto';
import https from 'https';
import { URL } from 'url';
import { pool } from '../../config/database';
import { config } from '../../config/env';
import { NotFoundError, ValidationError } from '../../utils/errors';

// ──────────────────────────────────────────────────────────────────────────────
// Punjab Revenue Authority (PRA) Fiscal Invoicing integration — PRAL "Technical
// Specification for Data Sharing through Software Fiscal Device with PRA" v1.2.
//
// Unlike FBR's local-hostname flow (a Windows service on localhost:8524), the
// spec also documents posting directly to PRAL's cloud endpoint (§7.2.2), which
// is what this module does — no local software fiscal device is required.
//
// Auth: a Bearer token per POS ID. Sandbox and production are separate hosts
// with separate POS IDs + tokens (kept in separate encrypted columns so
// switching modes doesn't lose either set of credentials).
// ──────────────────────────────────────────────────────────────────────────────

// PRAL's own published shared Sandbox token (Technical Spec v1.2 §7.2.2) — used
// as a fallback only while sandbox mode is on and no custom token was saved.
const DEFAULT_SANDBOX_TOKEN = '24d8fab3-f2e9-398f-ae17-b387125ec4a2';

const SUBMITTABLE_STATUSES = ['approved', 'sent', 'paid', 'partially_paid'];

// PaymentMode: 1 Cash, 2 Card, 3 Gift Voucher, 4 Loyalty Card, 5 Mixed, 6 Cheque
// InvoiceType: 1 New, 2 Debit, 3 Credit
const INVOICE_TYPE_CODE: Record<string, number> = { New: 1, Debit: 2, Credit: 3 };

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface PRAConfig {
  pra_enabled: boolean;
  pra_sandbox_mode: boolean;
  pra_pntn: string | null;
  pra_sandbox_pos_id: string | null;
  pra_production_pos_id: string | null;
  pra_sandbox_token?: string | null;      // raw (only on save / internal use)
  pra_production_token?: string | null;   // raw (only on save / internal use)
  pra_sandbox_token_set?: boolean;        // flag for GET (raw token never returned)
  pra_production_token_set?: boolean;
  tax_authority?: string;
}

export interface PRASubmitResult {
  invoiceNumber: string;
  qr_url: string;
  raw: any;
}

// ──────────────────────────────────────────────────────────────────────────────
// Token encryption (AES-256-CBC, own salt — mirrors fbr.service.ts)
// Stored as `iv:encryptedHex`
// ──────────────────────────────────────────────────────────────────────────────
const getEncryptionKey = (): Buffer =>
  crypto.scryptSync(config.jwt.secret, 'pra-salt', 32);

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
// Minimal HTTPS JSON helper (built-in `https` — no extra deps)
// ──────────────────────────────────────────────────────────────────────────────
const httpsPostJson = (
  urlStr: string,
  body: any,
  bearer?: string,
  timeoutMs = config.pra.timeoutMs
): Promise<{ status: number; data: any }> => {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try { parsed = new URL(urlStr); } catch (e) { return reject(e); }
    const payload = Buffer.from(JSON.stringify(body || {}), 'utf8');
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': String(payload.length),
    };
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

    const req = https.request(
      {
        method: 'POST',
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
    req.setTimeout(timeoutMs, () => { req.destroy(new Error('PRA request timeout')); });
    req.write(payload);
    req.end();
  });
};

// The PRA invoice-verification target — the printed QR encodes the PRA invoice number.
const praQrUrl = (invoiceNumber: string): string =>
  `${config.pra.verifyBase}?PRAInvNo=${encodeURIComponent(invoiceNumber)}`;

// ──────────────────────────────────────────────────────────────────────────────
// Config CRUD
// ──────────────────────────────────────────────────────────────────────────────
export const getPRAConfig = async (
  companyId: string,
  includeTokens = false
): Promise<PRAConfig | null> => {
  const [rows] = await pool.query(
    `SELECT pra_enabled, pra_sandbox_mode, pra_pntn, pra_sandbox_pos_id, pra_production_pos_id,
            pra_sandbox_token_enc, pra_production_token_enc, tax_authority
     FROM companies WHERE id=?`,
    [companyId]
  );
  const r = (rows as any[])[0];
  if (!r) return null;
  const out: PRAConfig = {
    pra_enabled: !!r.pra_enabled,
    pra_sandbox_mode:
      r.pra_sandbox_mode === null || r.pra_sandbox_mode === undefined ? true : !!r.pra_sandbox_mode,
    pra_pntn: r.pra_pntn || null,
    pra_sandbox_pos_id: r.pra_sandbox_pos_id || null,
    pra_production_pos_id: r.pra_production_pos_id || null,
    pra_sandbox_token_set: !!r.pra_sandbox_token_enc,
    pra_production_token_set: !!r.pra_production_token_enc,
    tax_authority: r.tax_authority || 'none',
  };
  if (includeTokens) {
    if (r.pra_sandbox_token_enc) {
      try { out.pra_sandbox_token = decryptSecret(r.pra_sandbox_token_enc); }
      catch { out.pra_sandbox_token = null; }
    }
    if (r.pra_production_token_enc) {
      try { out.pra_production_token = decryptSecret(r.pra_production_token_enc); }
      catch { out.pra_production_token = null; }
    }
  }
  return out;
};

export const savePRAConfig = async (
  companyId: string,
  input: Partial<PRAConfig>
): Promise<PRAConfig> => {
  const setParts: string[] = [];
  const params: unknown[] = [];
  const setStr = (col: string, val: unknown) => { setParts.push(`${col}=?`); params.push(val ?? null); };

  if (input.pra_enabled !== undefined) {
    setParts.push('pra_enabled=?');
    params.push(input.pra_enabled ? 1 : 0);
    // Mutual exclusivity with FBR — only one tax authority is active at a time.
    if (input.pra_enabled) {
      setParts.push("tax_authority='pra'");
      setParts.push('fbr_enabled=0');
    } else {
      setParts.push("tax_authority=IF(tax_authority='pra','none',tax_authority)");
    }
  }
  if (input.pra_sandbox_mode !== undefined) { setParts.push('pra_sandbox_mode=?'); params.push(input.pra_sandbox_mode ? 1 : 0); }
  if (input.pra_pntn !== undefined) setStr('pra_pntn', input.pra_pntn || null);
  if (input.pra_sandbox_pos_id !== undefined) setStr('pra_sandbox_pos_id', input.pra_sandbox_pos_id || null);
  if (input.pra_production_pos_id !== undefined) setStr('pra_production_pos_id', input.pra_production_pos_id || null);

  if (input.pra_sandbox_token !== undefined && input.pra_sandbox_token !== null && input.pra_sandbox_token !== '') {
    setParts.push('pra_sandbox_token_enc=?');
    params.push(encryptSecret(String(input.pra_sandbox_token)));
  }
  if (input.pra_production_token !== undefined && input.pra_production_token !== null && input.pra_production_token !== '') {
    setParts.push('pra_production_token_enc=?');
    params.push(encryptSecret(String(input.pra_production_token)));
  }

  if (setParts.length > 0) {
    params.push(companyId);
    await pool.query(`UPDATE companies SET ${setParts.join(', ')}, updated_at=NOW() WHERE id=?`, params);
  }

  const saved = await getPRAConfig(companyId, false);
  if (!saved) throw new NotFoundError('Company');
  return saved;
};

// ──────────────────────────────────────────────────────────────────────────────
// Active credentials (mode-aware: sandbox vs production POS ID + token)
// ──────────────────────────────────────────────────────────────────────────────
const getActiveCredentials = async (
  companyId: string
): Promise<{ posId: string; token: string; sandbox: boolean; url: string }> => {
  const cfg = await getPRAConfig(companyId, true);
  if (!cfg) throw new NotFoundError('Company');
  if (!cfg.pra_enabled) throw new ValidationError('PRA integration is not enabled for this company');

  const sandbox = !!cfg.pra_sandbox_mode;
  const posId = sandbox ? cfg.pra_sandbox_pos_id : cfg.pra_production_pos_id;
  if (!posId) {
    throw new ValidationError(
      `PRA ${sandbox ? 'Sandbox Test' : 'Production'} POS ID is not configured. Register your POS on the PRA portal and paste the POS ID in PRA settings.`
    );
  }
  const token = sandbox ? (cfg.pra_sandbox_token || DEFAULT_SANDBOX_TOKEN) : cfg.pra_production_token;
  if (!token) {
    throw new ValidationError(
      `PRA ${sandbox ? 'Sandbox' : 'Production'} access token is not configured. Paste the Bearer token from the PRA POS Registration screen in PRA settings.`
    );
  }
  const url = sandbox ? config.pra.sandboxUrl : config.pra.productionUrl;
  return { posId, token, sandbox, url };
};

// Public: verifies config completeness and reachability. Production has no
// side-effect-free health-check endpoint in the PRA spec, so a real dummy
// invoice would create a live fiscal record — only sandbox is tested live.
export const testPRAConnection = async (companyId: string): Promise<{ ok: boolean; message: string }> => {
  const { posId, token, sandbox, url } = await getActiveCredentials(companyId);

  if (!sandbox) {
    return {
      ok: true,
      message: `Production POS ID ${posId} and access token are configured. PRA provides no side-effect-free production test endpoint — switch to Sandbox mode to verify connectivity, or submit a real invoice to confirm.`,
    };
  }

  const testUsin = `TESTCONN-${Date.now()}`;
  const payload = {
    InvoiceNumber: '',
    POSID: Number(posId),
    USIN: testUsin,
    DateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
    BuyerPNTN: null,
    BuyerCNIC: null,
    BuyerName: null,
    BuyerPhoneNumber: null,
    TotalBillAmount: 1,
    TotalQuantity: 1,
    TotalSaleValue: 1,
    TotalTaxCharged: 0,
    Discount: 0,
    FurtherTax: 0,
    PaymentMode: 1,
    RefUSIN: null,
    InvoiceType: 1,
    Items: [
      {
        ItemCode: 'TESTCONN',
        ItemName: 'Connection Test Item',
        Quantity: 1,
        PCTCode: '00000000',
        TaxRate: 0,
        SaleValue: 1,
        TotalAmount: 1,
        TaxCharged: 0,
        Discount: 0,
        FurtherTax: 0,
        InvoiceType: 1,
        RefUSIN: null,
      },
    ],
  };

  const { status, data } = await httpsPostJson(url, payload, token);
  if (status === 401 || status === 403) {
    throw new ValidationError('PRA rejected the access token (unauthorized). Check the POS ID and Bearer token.');
  }
  if (status < 200 || status >= 300) {
    throw new ValidationError(`PRA returned HTTP ${status}${data ? `: ${JSON.stringify(data)}` : ''}`);
  }
  if (data && String(data.Code) === '100' && data.InvoiceNumber) {
    return { ok: true, message: `PRA sandbox connection successful — test invoice ${data.InvoiceNumber} accepted.` };
  }
  const msg = (data && (data.Response || data.Errors)) || 'PRA did not confirm the test invoice';
  throw new ValidationError(typeof msg === 'string' ? msg : JSON.stringify(msg));
};

// ──────────────────────────────────────────────────────────────────────────────
// Build the PRA invoice payload (Technical Spec v1.2 §7 Invoice Model Details)
// ──────────────────────────────────────────────────────────────────────────────
const toPRADateTime = (d: any): string => {
  const dt = d ? new Date(d) : new Date();
  if (isNaN(dt.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  return dt.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:mm:ss
};

export const buildPRAPayload = (invoice: any, lineItems: any[], buyerPhone: string | null, posId: string) => {
  const invoiceTypeName = invoice.pra_invoice_type || 'New';
  const invoiceTypeCode = INVOICE_TYPE_CODE[invoiceTypeName] || 1;

  const items = lineItems.map((li) => {
    const qty = parseFloat(li.quantity) || 0;
    const rate = parseFloat(li.rate) || 0;
    const discount = parseFloat(li.discount_per_item) || 0;
    const saleValue = Number((qty * rate - discount).toFixed(2));
    const taxCharged = parseFloat(li.tax_amount) || 0;
    const furtherTax = parseFloat(li.further_tax) || 0;

    return {
      ItemCode: li.sku || li.product_id || `ITEM${li.line_number}`,
      ItemName: li.description || '',
      Quantity: Number(qty.toFixed(4)),
      PCTCode: li.hs_code || '',
      TaxRate: parseFloat(li.tax_rate) || 0,
      SaleValue: saleValue,
      TotalAmount: Number((saleValue + taxCharged).toFixed(2)),
      TaxCharged: Number(taxCharged.toFixed(2)),
      Discount: Number(discount.toFixed(2)),
      FurtherTax: Number(furtherTax.toFixed(2)),
      InvoiceType: invoiceTypeCode,
      RefUSIN: invoiceTypeCode === 1 ? null : (invoice.pra_ref_usin || null),
    };
  });

  const payload: any = {
    InvoiceNumber: '',
    POSID: Number(posId),
    USIN: invoice.invoice_no,
    RefUSIN: invoiceTypeCode === 1 ? null : (invoice.pra_ref_usin || null),
    DateTime: toPRADateTime(invoice.invoice_date),
    BuyerPNTN: invoice.buyer_ntn || null,
    BuyerCNIC: invoice.buyer_cnic || null,
    BuyerName: invoice.buyer_business_name || invoice.customer_name || null,
    BuyerPhoneNumber: buyerPhone || null,
    TotalBillAmount: Number((parseFloat(invoice.grand_total) || 0).toFixed(2)),
    TotalQuantity: Number(lineItems.reduce((s, li) => s + (parseFloat(li.quantity) || 0), 0).toFixed(4)),
    TotalSaleValue: Number((parseFloat(invoice.subtotal) || 0).toFixed(2)),
    TotalTaxCharged: Number((parseFloat(invoice.tax_amount) || 0).toFixed(2)),
    Discount: Number((parseFloat(invoice.discount_amount) || 0).toFixed(2)),
    FurtherTax: Number(lineItems.reduce((s, li) => s + (parseFloat(li.further_tax) || 0), 0).toFixed(2)),
    PaymentMode: invoice.pra_payment_mode || 1,
    InvoiceType: invoiceTypeCode,
    Items: items,
  };

  return payload;
};

// ──────────────────────────────────────────────────────────────────────────────
// Load an invoice + line items + buyer phone (from linked customer)
// ──────────────────────────────────────────────────────────────────────────────
const loadInvoiceForPRA = async (companyId: string, invoiceId: string) => {
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

  let buyerPhone: string | null = null;
  if (invoice.customer_id) {
    const [custRows] = await pool.query('SELECT phone FROM customers WHERE id=?', [invoice.customer_id]);
    if ((custRows as any[]).length) buyerPhone = (custRows as any[])[0].phone || null;
  }

  return { invoice, lineItems: liRows as any[], buyerPhone };
};

// ──────────────────────────────────────────────────────────────────────────────
// Submit (real) — persists the PRA invoice number + status
// ──────────────────────────────────────────────────────────────────────────────
export const submitInvoiceToPRA = async (
  companyId: string,
  invoiceId: string
): Promise<PRASubmitResult> => {
  const { invoice, lineItems, buyerPhone } = await loadInvoiceForPRA(companyId, invoiceId);

  if (invoice.pra_submission_status === 'submitted' && invoice.pra_invoice_number) {
    throw new ValidationError(`Invoice already submitted to PRA (${invoice.pra_invoice_number})`);
  }
  if (!SUBMITTABLE_STATUSES.includes(invoice.status)) {
    throw new ValidationError(`Invoice must be approved/sent before submitting to PRA (current status: ${invoice.status})`);
  }
  if (!lineItems.length) throw new ValidationError('Invoice has no line items');

  const { posId, token, url } = await getActiveCredentials(companyId);
  const payload = buildPRAPayload(invoice, lineItems, buyerPhone, posId);

  let response: { status: number; data: any };
  try {
    response = await httpsPostJson(url, payload, token);
  } catch (err: any) {
    const msg = err?.message || 'PRA submission failed';
    await pool.query(
      `UPDATE invoices SET pra_submission_status='failed', pra_error=?, updated_at=NOW() WHERE id=?`,
      [msg, invoiceId]
    );
    throw new ValidationError(msg);
  }

  if (response.status === 401 || response.status === 403) {
    await pool.query(
      `UPDATE invoices SET pra_submission_status='failed', pra_error=?, updated_at=NOW() WHERE id=?`,
      ['PRA rejected the access token (unauthorized).', invoiceId]
    );
    throw new ValidationError('PRA rejected the access token (unauthorized).');
  }
  if (response.status < 200 || response.status >= 300) {
    const msg = (response.data && (response.data.Response || response.data.Errors)) || `PRA returned HTTP ${response.status}`;
    await pool.query(
      `UPDATE invoices SET pra_submission_status='failed', pra_error=?, updated_at=NOW() WHERE id=?`,
      [typeof msg === 'string' ? msg : JSON.stringify(msg), invoiceId]
    );
    throw new ValidationError(typeof msg === 'string' ? msg : 'PRA submission failed');
  }

  const data = response.data || {};
  const success = String(data.Code) === '100' && !!data.InvoiceNumber;

  if (!success) {
    const errMsg = data.Errors || data.Response || 'PRA rejected the invoice';
    await pool.query(
      `UPDATE invoices SET pra_submission_status='failed', pra_error=?, pra_response_json=?, updated_at=NOW() WHERE id=?`,
      [typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg), JSON.stringify(data), invoiceId]
    );
    throw new ValidationError(`PRA rejected the invoice: ${typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg)}`);
  }

  const invoiceNumber = String(data.InvoiceNumber);
  const qrUrl = praQrUrl(invoiceNumber);
  await pool.query(
    `UPDATE invoices
     SET pra_invoice_number=?, pra_qr_url=?, pra_submission_status='submitted',
         pra_submitted_at=NOW(), pra_error=NULL, pra_response_json=?, updated_at=NOW()
     WHERE id=?`,
    [invoiceNumber, qrUrl, JSON.stringify(data), invoiceId]
  );

  return { invoiceNumber, qr_url: qrUrl, raw: data };
};

// ──────────────────────────────────────────────────────────────────────────────
// Status
// ──────────────────────────────────────────────────────────────────────────────
export const getInvoicePRAStatus = async (companyId: string, invoiceId: string) => {
  const [rows] = await pool.query(
    `SELECT id, invoice_no, pra_invoice_number, pra_qr_url, pra_submission_status,
            pra_submitted_at, pra_error, pra_invoice_type
     FROM invoices WHERE id=? AND company_id=? AND deleted_at IS NULL`,
    [invoiceId, companyId]
  );
  if (!(rows as any[]).length) throw new NotFoundError('Invoice');
  return (rows as any[])[0];
};
