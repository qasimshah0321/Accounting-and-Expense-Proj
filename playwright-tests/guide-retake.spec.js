/**
 * Retake specific guide screenshots using working credentials.
 * Run: npx playwright test guide-retake.spec.js --reporter=line
 */

const { test } = require('@playwright/test');
const path  = require('path');
const fs    = require('fs');
const https = require('https');

const BASE_URL = 'https://candydada.com/';
const OUT      = path.join(__dirname, '..', 'user-guide-screenshots');
const EMAIL    = 'qasimshah33@gmail.com';
const PASSWORD = 'Test123@';

let token = null;

function apiLogin() {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email: EMAIL, password: PASSWORD });
    const req = https.request({
      hostname: 'candydada.com', path: '/api/v1/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      rejectUnauthorized: false,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { const j = JSON.parse(buf); resolve(j?.data?.token || null); }
        catch(_) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.write(data); req.end();
  });
}

async function openApp(page) {
  if (!token) { token = await apiLogin(); console.log(token ? '  ✅ token ok' : '  ❌ token failed'); }
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForTimeout(1500);
  if (token) {
    await page.evaluate(t => localStorage.setItem('auth_token', t), token);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
  }
  await page.locator('[class*="menuItem"]').first().waitFor({ state: 'visible', timeout: 15000 });
}

const ss = async (page, name) => {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  📸 ${name}.png`);
};

async function nav(page, group, sub) {
  await page.locator('[class*="menuItem"]').filter({ hasText: new RegExp(`^${group}$`) }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  const el = page.locator('[class*="submenuItem"], [class*="submenu"] li').filter({ hasText: new RegExp(`^${sub}$`) }).first();
  await el.waitFor({ state: 'visible', timeout: 6000 });
  await el.click({ force: true });
  await page.waitForTimeout(1800);
}

async function cls(page) {
  await page.locator('[class*="closeBtn"], [class*="listHeader"] button:last-child').first().click().catch(() => {});
  await page.waitForTimeout(400);
}

// ── 1.1 Login page ───────────────────────────────────────────────────────────
test('1.1 Login page', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForTimeout(2000);
  await ss(page, 'ch01_01_login_page');
});

// ── 2.1 Dashboard ────────────────────────────────────────────────────────────
test('2.1 Dashboard', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await ss(page, 'ch02_01_dashboard_kpi_cards');
  // Also capture sidebar expanded
  await page.locator('[class*="menuItem"]').filter({ hasText: /^Sales$/ }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  await ss(page, 'ch02_02_sidebar_expanded');
});

// ── 3.1 Company Settings ─────────────────────────────────────────────────────
test('3.1 Company Settings', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Company Settings');
  await ss(page, 'ch03_01_company_settings');
});

// ── 3.2 Chart of Accounts ────────────────────────────────────────────────────
test('3.2 Chart of Accounts', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'Chart of Accounts');
  await page.waitForTimeout(1000);
  await ss(page, 'ch03_02_chart_of_accounts');
  await cls(page);
});

// ── 3.4 Tax Configuration ────────────────────────────────────────────────────
test('3.4 Tax Configuration', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Tax');
  await ss(page, 'ch03_04_tax_configuration');
  // Open add form
  const btn = page.locator('button').filter({ hasText: /add tax/i }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(800); }
  await ss(page, 'ch03_05_tax_form_filled');
});

// ── 9.1 Journal Entries list ─────────────────────────────────────────────────
test('9.1 Journal Entries', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'Journal Entries');
  await ss(page, 'ch09_01_journal_entries_list');
  const btn = page.locator('button').filter({ hasText: /new journal|new entry/i }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(800); }
  await ss(page, 'ch09_02_journal_entry_form');
});

// ── 9.3 General Ledger ───────────────────────────────────────────────────────
test('9.3 General Ledger', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Accounting', 'General Ledger');
  await ss(page, 'ch09_03_general_ledger');
});

// ── 11.1 User Management ─────────────────────────────────────────────────────
test('11.1 User Management', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  await nav(page, 'Settings', 'Users & Roles');
  await ss(page, 'ch11_01_user_management');
  const btn = page.locator('button').filter({ hasText: /add user/i }).first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(800); }
  await ss(page, 'ch11_02_add_user_form');
});
