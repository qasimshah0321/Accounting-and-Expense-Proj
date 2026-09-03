/**
 * Final targeted screenshots — only sections with no existing images.
 * Uses exact selectors confirmed working in erp-e2e.spec.js.
 * Run: npx playwright test guide-final-shots.spec.js --reporter=line
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL = 'https://candydada.com/';
const OUT      = path.join(__dirname, '..', 'user-guide-screenshots');
const TS       = Date.now();
const EMAIL    = `gfinal${TS}@demo.com`;
const PASSWORD = 'FinalPass123!';
const COMPANY  = 'Final Demo Co';

const ss = async (page, name) => {
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`  📸 ${name}.png`);
};

async function expandGroup(page, name) {
  await page.locator('[class*="menuItem"]').filter({ hasText: new RegExp(`^${name}$`) }).first().click().catch(() => {});
  await page.waitForTimeout(500);
}

async function clickSub(page, text) {
  const el = page.locator('[class*="submenuItem"], [class*="submenu"] li').filter({ hasText: new RegExp(`^${text}$`) }).first();
  await el.waitFor({ state: 'visible', timeout: 6000 });
  await el.click({ force: true });
  await page.waitForTimeout(1500);
}

async function closePanel(page) {
  await page.locator('[class*="closeBtn"], [class*="listHeader"] button:last-child').first().click().catch(() => {});
  await page.waitForTimeout(400);
}

test.describe.configure({ mode: 'serial' });

test('00 — Register', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('button:has-text("Register")', { timeout: 20000 });
  await page.click('button:has-text("Register")');
  await page.waitForTimeout(600);
  await page.fill('input[name="first_name"]', 'Demo');
  await page.fill('input[name="last_name"]',  'Admin');
  await page.fill('input[name="email"]',       EMAIL);
  await page.fill('input[name="password"]',    PASSWORD);
  const pws = page.locator('input[type="password"]');
  if (await pws.count() > 1) await pws.nth(1).fill(PASSWORD);
  await page.fill('input[name="company_name"]', COMPANY);
  await page.click('button:has-text("Create Account")');
  // Wait for sidebar — up to 15s
  await page.locator('[class*="menuItem"]').first().waitFor({ state: 'visible', timeout: 15000 });
  console.log('  ✅ Registered & on dashboard');
});

test('01 — Settings: Company, Tax, Ship Via, COA', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.locator('[class*="menuItem"]').first().waitFor({ state: 'visible', timeout: 15000 });

  // Company Settings
  await expandGroup(page, 'Settings');
  await clickSub(page, 'Company Settings');
  await ss(page, 'ch03_01_company_settings');
  await closePanel(page);

  // Tax
  await clickSub(page, 'Tax');
  await ss(page, 'ch03_04_tax_configuration');
  const addTax = page.locator('button').filter({ hasText: /add tax/i }).first();
  if (await addTax.isVisible().catch(() => false)) { await addTax.click(); await page.waitForTimeout(600); }
  await ss(page, 'ch03_05_tax_form_filled');
  await closePanel(page);

  // Ship Via
  await clickSub(page, 'Ship Via');
  await ss(page, 'ch03_06_ship_via_configuration');
  await closePanel(page);

  // Chart of Accounts
  await expandGroup(page, 'Accounting');
  await clickSub(page, 'Chart of Accounts');
  await page.waitForTimeout(1200);
  await ss(page, 'ch03_02_chart_of_accounts');

  // Opening Balance
  const obBtn = page.locator('button').filter({ hasText: /opening balance/i }).first();
  if (await obBtn.isVisible().catch(() => false)) { await obBtn.click(); await page.waitForTimeout(800); await ss(page, 'ch03_03_opening_balance_wizard'); await closePanel(page); }

  // Year-End Close
  const yecBtn = page.locator('button').filter({ hasText: /year.end/i }).first();
  if (await yecBtn.isVisible().catch(() => false)) {
    await yecBtn.click(); await page.waitForTimeout(1000);
    await ss(page, 'ch12_01_year_end_close_panel');
    await page.locator('input[type="date"]').last().fill('2025-12-31').catch(() => {});
    const prev = page.locator('button').filter({ hasText: /preview/i }).first();
    if (await prev.isVisible().catch(() => false)) { await prev.click(); await page.waitForTimeout(2000); await ss(page, 'ch12_02_year_end_preview'); }
    await closePanel(page);
  }
  await closePanel(page);
});

test('02 — Accounting: GL and Trial Balance', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.locator('[class*="menuItem"]').first().waitFor({ state: 'visible', timeout: 15000 });

  await expandGroup(page, 'Accounting');
  await clickSub(page, 'Journal Entries');
  await ss(page, 'ch09_02_journal_entry_form');
  await closePanel(page);

  await clickSub(page, 'General Ledger');
  await ss(page, 'ch09_03_general_ledger');
  await closePanel(page);

  await clickSub(page, 'Trial Balance');
  await ss(page, 'ch09_04_trial_balance');
  await closePanel(page);
});

test('03 — Reports panel', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.locator('[class*="menuItem"]').first().waitFor({ state: 'visible', timeout: 15000 });

  await expandGroup(page, 'Reports');
  await clickSub(page, 'Financial Statements');
  await page.waitForTimeout(1500);
  await ss(page, 'ch10_01_reports_panel');

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
      await tab.click(); await page.waitForTimeout(600);
      const run = page.locator('button').filter({ hasText: /run report/i }).first();
      if (await run.isVisible().catch(() => false)) { await run.click(); await page.waitForTimeout(2000); }
      await ss(page, file);
    }
  }
  await closePanel(page);
});

test('04 — Users, Approvals, Recurring', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.locator('[class*="menuItem"]').first().waitFor({ state: 'visible', timeout: 15000 });

  await expandGroup(page, 'Settings');
  await clickSub(page, 'Users & Roles');
  await ss(page, 'ch11_01_user_management');
  const addUser = page.locator('button').filter({ hasText: /add user/i }).first();
  if (await addUser.isVisible().catch(() => false)) { await addUser.click(); await page.waitForTimeout(600); }
  await ss(page, 'ch11_02_add_user_form');
  await closePanel(page);

  await clickSub(page, 'Approval Workflows');
  await ss(page, 'ch11_03_approval_workflows');
  const addRule = page.locator('button').filter({ hasText: /add rule/i }).first();
  if (await addRule.isVisible().catch(() => false)) { await addRule.click(); await page.waitForTimeout(600); }
  await ss(page, 'ch11_04_approval_rule_form');
  await closePanel(page);

  await clickSub(page, 'Recurring Documents');
  await ss(page, 'ch11_05_recurring_documents');
  await closePanel(page);
});

