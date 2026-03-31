/**
 * Test emailCustomer exactly as sales-orders.service does on status change
 * Run on server: node test-so-email.js
 */
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const dbCfg = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const smtpCfg = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
};

async function emailCustomer(conn, companyId, customerId, subject, bodyText) {
  const [rows] = await conn.query(
    `SELECT u.email FROM users u
     JOIN user_customer_map ucm ON ucm.user_id = u.id
     WHERE u.company_id=? AND ucm.customer_id=? AND u.is_active=1
       AND u.email IS NOT NULL AND u.email != ''`,
    [companyId, customerId]
  );
  console.log(`  Recipients found: ${rows.length} → ${rows.map(r => r.email).join(', ')}`);
  if (!rows.length) return;

  const transporter = nodemailer.createTransport({
    host: smtpCfg.host,
    port: smtpCfg.port,
    secure: smtpCfg.port === 465,
    auth: { user: smtpCfg.user, pass: smtpCfg.pass },
  });

  const html = `<!DOCTYPE html><html><body style="font-family:Arial;font-size:14px;">
    <h2 style="color:#2CA01C;">${subject}</h2>
    <p>${bodyText}</p>
    <p style="color:#94a3b8;font-size:12px;">AccountPro ERP — automated notification</p>
  </body></html>`;

  for (const row of rows) {
    await transporter.sendMail({ from: smtpCfg.from, to: row.email, subject, html });
    console.log(`  Email sent to: ${row.email}`);
  }
}

async function main() {
  const conn = await mysql.createConnection(dbCfg);
  const companyId = 'df2c22d9-260f-4ff2-b9be-f2877d1a84a3';
  const customerId = 'e9550414-2392-11f1-89d7-a8a159c11b27'; // cust1 (linked to qasim)

  console.log('Testing emailCustomer() exactly as the service calls it...\n');
  console.log('Subject: Order Update: SO-007 (re-confirmed)');
  await emailCustomer(
    conn,
    companyId,
    customerId,
    'Order Update: SO-007',
    'Your order <strong>SO-007</strong> status has been updated to <strong>Confirmed</strong>.'
  );

  await conn.end();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
