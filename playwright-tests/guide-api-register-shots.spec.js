/**
 * Guide screenshots — API token injection + targeted single-action tests.
 * Run: npx playwright test guide-api-register-shots.spec.js --reporter=line
 */

const { test } = require('@playwright/test');
const path   = require('path');
const fs     = require('fs');
const https  = require('https');

const BASE_URL = 'https://candydada.com/';
const API_BASE = 'https://candydada.com/api/v1';
const OUT      = path.join(__dirname, '..', 'user-guide-screenshots');
const EMAIL    = 'qasimshah33@gmail.com';
const PASSWORD = 'Test123@';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Login via API, inject token into browser — avoids the browser form entirely
let cachedToken = null;

function apiLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: EMAIL, password: PASSWORD });
    const req = https.request({
      hostname: 'candydada.com', path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      rejectUnauthorized: false,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(buf);
          resolve(j?.data?.token || j?.token || null);
        } catch(_) { resolve(null); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function openApp(page) {
  if (!cachedToken) {
    cachedToken = await apiLogin();
    if (cachedToken) console.log('  ✅ Logged in via API');
    else console.log('  ⚠ API login failed — will try browser form');
  }

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForTimeout(1200);

  if (cachedToken) {
    // Inject token and reload
    await page.evaluate(t => localStorage.setItem('auth_token', t), cachedToken);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
  } else {
    // Browser form fallback
    const emailEl = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailEl.isVisible().catch(() => false)) {
      await emailEl.fill(EMAIL);
      await page.locator('input[name="password"], input[type="password"]').first().fill(PASSWORD);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }
  }

  // Confirm dashboard loaded
  await page.locator('[class*="menuItem"]').first().waitFor({ state: 'visible', timeout: 12000 });
}

const ss = async (page, name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  📸 ${name}.png`);
};

async function nav(page, group, sub) {
  await page.locator('[class*="menuItem"]').filter({ hasText: new RegExp(`^${group}$`) }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  const el = page.locator('[class*="submenuItem"], [class*="submenu"] li').filter({ hasText: new RegExp(`^${sub}$`) }).first();
  try { await el.waitFor({ state: 'visible', timeout: 5000 }); await el.click({ force: true }); }
  catch(_) { await page.getByText(sub, { exact: true }).first().click().catch(() => {}); }
  await page.waitForTimeout(1500);
}

async function cls(page) {
  await page.locator('[class*="closeBtn"], [class*="listHeader"] button:last-child').first().click().catch(() => {});
  await page.waitForTimeout(400);
}

// Each test is INDEPENDENT — no serial dependency
test('ss: Company Settings', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Company Settings');
  await ss(page, 'ch03_01_company_settings');
});

test('ss: Chart of Accounts', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'Chart of Accounts');
  await page.waitForTimeout(1000);
  await ss(page, 'ch03_02_chart_of_accounts');
});

test('ss: Opening Balance', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'Chart of Accounts');
  await page.waitForTimeout(1000);
  const ob = page.locator('button').filter({ hasText: /opening balance/i }).first();
  if (await ob.isVisible().catch(() => false)) { await ob.click(); await page.waitForTimeout(1000); }
  await ss(page, 'ch03_03_opening_balance_wizard');
});

test('ss: Tax Configuration', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Tax');
  await ss(page, 'ch03_04_tax_configuration');
  const btn = page.locator('button').filter({ hasText: /add tax/i }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(600); }
  await ss(page, 'ch03_05_tax_form_filled');
});

test('ss: Ship Via', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Ship Via');
  await ss(page, 'ch03_06_ship_via_configuration');
});

test('ss: Year-End Close', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'Chart of Accounts');
  await page.waitForTimeout(1000);
  const yec = page.locator('button').filter({ hasText: /year.end/i }).first();
  if (await yec.isVisible().catch(() => false)) {
    await yec.click(); await page.waitForTimeout(1000);
    await ss(page, 'ch12_01_year_end_close_panel');
    await page.locator('input[type="date"]').last().fill('2025-12-31').catch(() => {});
    const prev = page.locator('button').filter({ hasText: /preview/i }).first();
    if (await prev.isVisible().catch(() => false)) { await prev.click(); await page.waitForTimeout(2000); await ss(page, 'ch12_02_year_end_preview'); }
  }
});

test('ss: Journal Entries', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'Journal Entries');
  await ss(page, 'ch09_01_journal_entries_list');
  const btn = page.locator('button').filter({ hasText: /new journal|new entry/i }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(800); }
  await ss(page, 'ch09_02_journal_entry_form');
});

test('ss: General Ledger', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'General Ledger');
  await ss(page, 'ch09_03_general_ledger');
});

test('ss: Trial Balance', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'Trial Balance');
  await ss(page, 'ch09_04_trial_balance');
});

test('ss: Reports Panel', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Reports', 'Financial Statements');
  await page.waitForTimeout(1000);
  await ss(page, 'ch10_01_reports_panel');
});

test('ss: Report Tabs', async ({ page }) => {
  test.setTimeout(120000);
  await openApp(page);
  await nav(page, 'Reports', 'Financial Statements');
  await page.waitForTimeout(1000);
  for (const [label, file] of [
    ['Profit & Loss', 'ch10_02_profit_loss'],
    ['Balance Sheet', 'ch10_03_balance_sheet'],
    ['Cash Flow',     'ch10_04_cash_flow'],
    ['AR Aging',      'ch10_05_ar_aging'],
    ['AP Aging',      'ch10_06_ap_aging'],
    ['Inventory',     'ch10_07_inventory_valuation'],
    ['Tax Summary',   'ch10_08_tax_summary'],
  ]) {
    const tab = page.getByText(label, { exact: true }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click(); await page.waitForTimeout(500);
      const run = page.locator('button').filter({ hasText: /run report/i }).first();
      if (await run.isVisible().catch(() => false)) { await run.click(); await page.waitForTimeout(2000); }
      await ss(page, file);
    }
  }
});

test('ss: User Management', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Users & Roles');
  await ss(page, 'ch11_01_user_management');
  const btn = page.locator('button').filter({ hasText: /add user/i }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(600); }
  await ss(page, 'ch11_02_add_user_form');
});

test('ss: Approval Workflows', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Approval Workflows');
  await ss(page, 'ch11_03_approval_workflows');
  const btn = page.locator('button').filter({ hasText: /add rule/i }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(600); }
  await ss(page, 'ch11_04_approval_rule_form');
});

test('ss: Recurring Documents', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Recurring Documents');
  await ss(page, 'ch11_05_recurring_documents');
});

test('ss: Banking Center', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Banking', 'Banking Center');
  await ss(page, 'ch08_01_banking_center');
});

test('ss: Bank Reconciliation', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Banking', 'Bank Reconciliation');
  await ss(page, 'ch08_02_bank_reconciliation');
});

