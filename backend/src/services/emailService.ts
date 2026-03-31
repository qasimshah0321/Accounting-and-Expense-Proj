import { pool } from '../config/database';
import { config } from '../config/env';

// ─── Lazy-load nodemailer to avoid crashing if module is not yet installed ───

// eslint-disable-next-line @typescript-eslint/no-var-requires
let nodemailer: any = null;
try { nodemailer = require('nodemailer'); } catch { /* not installed yet */ }

// ─── Transporter (lazy-initialized) ─────────────────────────────────────────

let _transporter: any = null;

function getTransporter(): any {
  if (!nodemailer) return null;
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) return null;
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return _transporter;
}

// ─── HTML email template ─────────────────────────────────────────────────────

function buildHtml(title: string, body: string, companyName = 'AccountPro'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body{margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;font-size:14px;color:#1e293b}
    .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .top-bar{background:#2CA01C;height:5px}
    .head{padding:24px 32px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #e2e8f0}
    .logo{width:36px;height:36px;border-radius:50%;background:#2CA01C;display:flex;align-items:center;justify-content:center}
    .logo svg{width:18px;height:18px}
    .co{font-size:16px;font-weight:700;color:#1e293b}
    .body{padding:28px 32px}
    .title{font-size:18px;font-weight:700;color:#1e293b;margin:0 0 12px}
    .msg{font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px}
    .badge{display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:13px;font-weight:600;padding:6px 16px;border-radius:20px;margin-bottom:20px}
    .foot{padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
  </style>
</head>
<body>
<div class="wrap">
  <div class="top-bar"></div>
  <div class="head">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3,17 8,12 12,15 17,8 21,11"/>
        <polyline points="17,8 21,8 21,12"/>
      </svg>
    </div>
    <span class="co">${companyName}</span>
  </div>
  <div class="body">
    <div class="title">${title}</div>
    <div class="msg">${body}</div>
  </div>
  <div class="foot">This is an automated notification from ${companyName} &bull; AccountPro ERP</div>
</div>
</body>
</html>`;
}

// ─── Core send helper ────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) return; // SMTP not configured — skip silently
  await t.sendMail({ from: config.smtp.from, to, subject, html });
}

// ─── Get company name ────────────────────────────────────────────────────────

async function getCompanyName(companyId: string): Promise<string> {
  try {
    const [rows] = await pool.query('SELECT name FROM companies WHERE id=? LIMIT 1', [companyId]);
    return (rows as any[])[0]?.name || 'AccountPro';
  } catch { return 'AccountPro'; }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send email to all admin / salesperson / staff users of the company.
 */
export const emailAdmins = async (
  companyId: string,
  subject: string,
  bodyText: string,
): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `SELECT email FROM users WHERE company_id=? AND role IN ('admin','salesperson','staff') AND is_active=1 AND email IS NOT NULL AND email != ''`,
      [companyId],
    );
    const companyName = await getCompanyName(companyId);
    const html = buildHtml(subject, bodyText, companyName);
    for (const row of rows as any[]) {
      await sendEmail(row.email, subject, html).catch(() => {});
    }
  } catch (err) {
    console.error('[emailService] emailAdmins error:', err);
  }
};

/**
 * Send email to all users linked to a specific customer.
 */
export const emailCustomer = async (
  companyId: string,
  customerId: string,
  subject: string,
  bodyText: string,
): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `SELECT u.email FROM users u
       JOIN user_customer_map ucm ON ucm.user_id = u.id
       WHERE u.company_id=? AND ucm.customer_id=? AND u.is_active=1
         AND u.email IS NOT NULL AND u.email != ''`,
      [companyId, customerId],
    );
    const companyName = await getCompanyName(companyId);
    const html = buildHtml(subject, bodyText, companyName);
    for (const row of rows as any[]) {
      await sendEmail(row.email, subject, html).catch(() => {});
    }
  } catch (err) {
    console.error('[emailService] emailCustomer error:', err);
  }
};
