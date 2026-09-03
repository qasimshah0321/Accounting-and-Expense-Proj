/**
 * Guide — Missing Screenshots
 * Captures sections not covered by erp-e2e.spec.js:
 * Settings, Banking, Accounting, Reports, Expenses, RFQ, Year-End Close
 *
 * Run: npx playwright test guide-missing-screenshots.spec.js --reporter=line
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL = 'https://candydada.com/';
const OUT      = path.join(__dirname, '..', 'user-guide-screenshots');
const TS       = Date.now();
const EMAIL    = `guide${TS}@demo.com`;
const PASSWORD = 'GuidePass123!';
const COMPANY  = 'Guide Demo Co';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const ss = async (page, name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
};

// ── Navigation helpers (exact selectors from working erp-e2e.spec.js) ────────

async function expandGroup(page, name) {
  const el = page.locator('[class*="menuItem"]').filter({ hasText: new RegExp(`^${name}$`) }).first();
  await el.click().catch(() => {});
  await page.waitForTimeout(500);
}

async function clickSub(page, text) {
  const el = page.locator('[class*="submenuItem"], [class*="submenu"] li').filter({ hasText: new RegExp(`^${text}$`) }).first();
  try { await el.waitFor({ state: 'visible', timeout: 6000 }); await el.click({ force: true }); }
  catch (_) { await page.getByText(text, { exact: true }).first().click().catch(() => {}); }
  await page.waitForTimeout(1200);
}

async function navTo(page, group, sub) {
  await expandGroup(page, group);
  await clickSub(page, sub);
}

async function closePanel(page) {
  const btn = page.locator('[class*="closeBtn"], [class*="listHeader"] button, [class*="popupHeader"] button').first();
  if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(400); }
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('input[name="email"]', { timeout: 20000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  // Confirm on dashboard
  await expect(page.locator('[class*="sidebar"], nav').first()).toBeVisible({ timeout: 10000 });
}

// ════════════════════════════════════════════════════════════════════════════

test.describe.configure({ mode: 'serial' });

test.describe('Guide Missing Screenshots', () => {

  // ── Register once ─────────────────────────────────────────────────────────
  test('00 — Register account', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('button:has-text("Register")', { timeout: 20000 });
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);
    await page.fill('input[name="first_name"]', 'Demo');
    await page.fill('input[name="last_name"]', 'Admin');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    const pwFields = page.locator('input[type="password"]');
    if (await pwFields.count() > 1) await pwFields.nth(1).fill(PASSWORD);
    await page.fill('input[name="company_name"]', COMPANY);
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(4000);
    await expect(page.locator('[class*="sidebar"], nav').first()).toBeVisible({ timeout: 10000 });
    console.log('  ✅ Registered:', EMAIL);
  });

  // ── RFQ ───────────────────────────────────────────────────────────────────
  test('01 — RFQ list and form', async ({ page }) => {
    await login(page);
    await navTo(page, 'Purchases', 'Request for Quotation');
    await ss(page, 'ch05_01_rfq_list');
    const newBtn = page.locator('button').filter({ hasText: /new rfq|new request/i }).first();
    if (await newBtn.isVisible().catch(() => false)) { await newBtn.click(); await page.waitForTimeout(800); }
    await ss(page, 'ch05_02_rfq_form');
    await closePanel(page);
  });

  // ── Estimates ─────────────────────────────────────────────────────────────
  test('02 — Estimates list and form', async ({ page }) => {
    await login(page);
    await navTo(page, 'Sales', 'Estimates/Quotations');
    await ss(page, 'ch06_01_estimates_list');
    const newBtn = page.locator('button').filter({ hasText: /new estimate/i }).first();
    if (await newBtn.isVisible().catch(() => false)) { await newBtn.click(); await page.waitForTimeout(800); }
    await ss(page, 'ch06_02_estimate_form');
    await closePanel(page);
  });

  // ── Delivery Notes ────────────────────────────────────────────────────────
  test('03 — Delivery Notes list', async ({ page }) => {
    await login(page);
    await navTo(page, 'Sales', 'Delivery Notes');
    await ss(page, 'ch06_05_delivery_note_list');
    await closePanel(page);
  });

  // ── Expenses ─────────────────────────────────────────────────────────────
  test('04 — Expenses list and form', async ({ page }) => {
    await login(page);
    await navTo(page, 'Purchases', 'Expenses');
    await ss(page, 'ch07_01_expenses_list');
    const newBtn = page.locator('button').filter({ hasText: /new expense/i }).first();
    if (await newBtn.isVisible().catch(() => false)) { await newBtn.click(); await page.waitForTimeout(800); }
    await ss(page, 'ch07_02_expense_form');
    await closePanel(page);
  });

  // ── Banking ───────────────────────────────────────────────────────────────
  test('05 — Banking Center and Reconciliation', async ({ page }) => {
    await login(page);
    await navTo(page, 'Banking', 'Banking Center');
    await ss(page, 'ch08_01_banking_center');
    await navTo(page, 'Banking', 'Bank Reconciliation');
    await ss(page, 'ch08_02_bank_reconciliation');
    await closePanel(page);
  });

  // ── Accounting ────────────────────────────────────────────────────────────
  test('06 — Journal Entries, GL, Trial Balance', async ({ page }) => {
    await login(page);

    await navTo(page, 'Accounting', 'Journal Entries');
    await ss(page, 'ch09_01_journal_entries_list');
    const newJE = page.locator('button').filter({ hasText: /new journal|new entry/i }).first();
    if (await newJE.isVisible().catch(() => false)) { await newJE.click(); await page.waitForTimeout(800); }
    await ss(page, 'ch09_02_journal_entry_form');
    await closePanel(page);

    await navTo(page, 'Accounting', 'General Ledger');
    await ss(page, 'ch09_03_general_ledger');
    await closePanel(page);

    await navTo(page, 'Accounting', 'Trial Balance');
    await ss(page, 'ch09_04_trial_balance');
    await closePanel(page);
  });

  // ── Chart of Accounts + Year-End Close ───────────────────────────────────
  test('07 — Chart of Accounts and Year-End Close', async ({ page }) => {
    await login(page);
    await navTo(page, 'Accounting', 'Chart of Accounts');
    await ss(page, 'ch03_02_chart_of_accounts');

    const yecBtn = page.locator('button').filter({ hasText: /year.end/i }).first();
    if (await yecBtn.isVisible().catch(() => false)) {
      await yecBtn.click();
      await page.waitForTimeout(1000);
      await ss(page, 'ch12_01_year_end_close_panel');
      const dateIn = page.locator('input[type="date"]').last();
      if (await dateIn.isVisible().catch(() => false)) await dateIn.fill('2025-12-31');
      const prevBtn = page.locator('button').filter({ hasText: /preview/i }).first();
      if (await prevBtn.isVisible().catch(() => false)) { await prevBtn.click(); await page.waitForTimeout(2000); }
      await ss(page, 'ch12_02_year_end_preview');
      await closePanel(page);
    }

    // Opening balance
    const obBtn = page.locator('button').filter({ hasText: /opening balance/i }).first();
    if (await obBtn.isVisible().catch(() => false)) {
      await obBtn.click();
      await page.waitForTimeout(800);
      await ss(page, 'ch03_03_opening_balance_wizard');
      await closePanel(page);
    }
    await closePanel(page);
  });

  // ── Reports ───────────────────────────────────────────────────────────────
  test('08 — Reports panel and all report tabs', async ({ page }) => {
    await login(page);
    await navTo(page, 'Reports', 'Financial Statements');
    await page.waitForTimeout(1500);
    await ss(page, 'ch10_01_reports_panel');

    const tabs = [
      ['Profit & Loss', 'ch10_02_profit_loss'],
      ['Balance Sheet', 'ch10_03_balance_sheet'],
      ['Cash Flow',     'ch10_04_cash_flow'],
      ['AR Aging',      'ch10_05_ar_aging'],
      ['AP Aging',      'ch10_06_ap_aging'],
      ['Inventory',     'ch10_07_inventory_valuation'],
      ['Tax Summary',   'ch10_08_tax_summary'],
    ];
    for (const [label, file] of tabs) {
      const tab = page.getByText(label).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click(); await page.waitForTimeout(600);
        const run = page.locator('button').filter({ hasText: /run report/i }).first();
        if (await run.isVisible().catch(() => false)) { await run.click(); await page.waitForTimeout(2000); }
        await ss(page, file);
      }
    }
    await closePanel(page);
  });

  // ── Settings ─────────────────────────────────────────────────────────────
  test('09 — Company Settings, Tax, Ship Via', async ({ page }) => {
    await login(page);

    await navTo(page, 'Settings', 'Company Settings');
    await ss(page, 'ch03_01_company_settings');
    await closePanel(page);

    await navTo(page, 'Settings', 'Tax');
    await ss(page, 'ch03_04_tax_configuration');
    const addTax = page.locator('button').filter({ hasText: /add tax/i }).first();
    if (await addTax.isVisible().catch(() => false)) { await addTax.click(); await page.waitForTimeout(600); }
    await ss(page, 'ch03_05_tax_form_filled');
    await closePanel(page);

    await navTo(page, 'Settings', 'Ship Via');
    await ss(page, 'ch03_06_ship_via_configuration');
    await closePanel(page);
  });

  // ── Users & Approvals & Recurring ────────────────────────────────────────
  test('10 — Users, Approval Workflows, Recurring', async ({ page }) => {
    await login(page);

    await navTo(page, 'Settings', 'Users & Roles');
    await ss(page, 'ch11_01_user_management');
    const addUser = page.locator('button').filter({ hasText: /add user/i }).first();
    if (await addUser.isVisible().catch(() => false)) { await addUser.click(); await page.waitForTimeout(600); }
    await ss(page, 'ch11_02_add_user_form');
    await closePanel(page);

    await navTo(page, 'Settings', 'Approval Workflows');
    await ss(page, 'ch11_03_approval_workflows');
    const addRule = page.locator('button').filter({ hasText: /add rule/i }).first();
    if (await addRule.isVisible().catch(() => false)) { await addRule.click(); await page.waitForTimeout(600); }
    await ss(page, 'ch11_04_approval_rule_form');
    await closePanel(page);

    await navTo(page, 'Settings', 'Recurring Documents');
    await ss(page, 'ch11_05_recurring_documents');
    await closePanel(page);
  });

});
