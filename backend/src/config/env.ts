import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'erp_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim()),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    email: process.env.VAPID_EMAIL || 'mailto:admin@candydada.com',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'AccountPro <noreply@candydada.com>',
  },
  // Pakistan FBR Digital Invoicing (DI) API — PRAL Technical Spec v1.12.
  // Endpoints are identical for sandbox and production (routing is by token +
  // the `_sb` suffix on submit endpoints); overridable only for testing/mocking.
  fbr: {
    diBase: process.env.FBR_DI_BASE || 'https://gw.fbr.gov.pk/di_data/v1/di',   // postinvoicedata[_sb], validateinvoicedata[_sb]
    pdiBase: process.env.FBR_PDI_BASE || 'https://gw.fbr.gov.pk/pdi',           // /v1/* and /v2/* reference APIs
    distBase: process.env.FBR_DIST_BASE || 'https://gw.fbr.gov.pk/dist/v1',     // statl, Get_Reg_Type
    timeoutMs: parseInt(process.env.FBR_TIMEOUT_MS || '20000', 10),
  },
  // Punjab Revenue Authority (PRA) Software Fiscal Device — PRAL Technical Spec v1.2.
  // Unlike FBR, sandbox and production are different hosts/paths (not a suffix),
  // and each has its own POS ID + Bearer token pair.
  pra: {
    sandboxUrl: process.env.PRA_SANDBOX_URL || 'https://ims.pral.com.pk/ims/sandbox/api/Live/PostData',
    productionUrl: process.env.PRA_PRODUCTION_URL || 'https://ims.pral.com.pk/ims/production/api/Live/PostData',
    // Invoice-verification page — the printed QR encodes `${verifyBase}?PRAInvNo=<InvoiceNumber>`.
    verifyBase: process.env.PRA_VERIFY_BASE || 'https://reg.pra.punjab.gov.pk/IMSFiscalReport/SearchPOSInvoice_Report.aspx',
    timeoutMs: parseInt(process.env.PRA_TIMEOUT_MS || '20000', 10),
  },
};
