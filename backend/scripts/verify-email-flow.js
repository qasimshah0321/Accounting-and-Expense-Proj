/**
 * Verify email notification flow for SO-007 / qasim@candydada.com
 * Run: node scripts/verify-email-flow.js
 */
// Look for .env in script dir, then parent (works both locally and on server)
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const dbCfg = {
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

const smtpCfg = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM,
};

async function main() {
  console.log('=== Email Flow Verification ===\n');
  console.log('DB:', dbCfg.host, '/', dbCfg.database);
  console.log('SMTP:', smtpCfg.host, ':', smtpCfg.port, 'user:', smtpCfg.user, '\n');

  const conn = await mysql.createConnection(dbCfg);

  // 1. Find qasim
  const [users] = await conn.query(
    `SELECT u.id, u.email, u.role, u.company_id,
            ucm.customer_id as linked_customer_id,
            c.name as customer_name
     FROM users u
     LEFT JOIN user_customer_map ucm ON ucm.user_id = u.id
     LEFT JOIN customers c ON c.id = ucm.customer_id
     WHERE u.email = 'qasim@candydada.com'`
  );
  if (!users.length) { console.log('ERROR: qasim@candydada.com not found in users table'); process.exit(1); }
  const qasim = users[0];
  console.log('qasim user:', JSON.stringify(qasim, null, 2));

  if (!qasim.linked_customer_id) {
    console.log('\nERROR: qasim has NO entry in user_customer_map — email notifications will never reach them!');
    console.log('Fix: admin must go to Users & Roles → edit qasim → assign a linked customer.');
    await conn.end();
    return;
  }

  // 2. Find SO-007
  const [orders] = await conn.query(
    `SELECT id, sales_order_no, customer_id, customer_name, status, company_id
     FROM sales_orders
     WHERE sales_order_no = 'SO-007' AND deleted_at IS NULL`
  );
  console.log('\nSO-007 records:', orders.length ? JSON.stringify(orders[0], null, 2) : 'NOT FOUND');

  // 3. Check user_customer_map matches SO customer_id
  if (orders.length) {
    const so = orders[0];
    const match = so.customer_id === qasim.linked_customer_id;
    console.log(`\nSO-007 customer_id:        ${so.customer_id}`);
    console.log(`qasim linked_customer_id:  ${qasim.linked_customer_id}`);
    console.log(`Match: ${match ? 'YES ✓' : 'NO ✗ — mismatch! email would go to wrong/no recipient'}`);
  }

  // 4. Send test email directly to qasim
  console.log('\n--- Sending test email to qasim@candydada.com ---');
  const transporter = nodemailer.createTransport({
    host: smtpCfg.host,
    port: smtpCfg.port,
    secure: smtpCfg.port === 465,
    auth: { user: smtpCfg.user, pass: smtpCfg.pass },
  });
  try {
    await transporter.sendMail({
      from: smtpCfg.from,
      to: 'qasim@candydada.com',
      subject: '[Test] Order Update: SO-007',
      html: `<p>This is a test email from the AccountPro ERP verification script.</p>
             <p>Your order <strong>SO-007</strong> status has been updated to <strong>Confirmed</strong>.</p>`,
    });
    console.log('TEST EMAIL SENT OK');
  } catch (e) {
    console.log('TEST EMAIL FAILED:', e.message);
  }

  await conn.end();
}

main().catch(err => { console.error(err); process.exit(1); });
