/**
 * User Guide Screenshot Script — ZeroPoint ERP
 * Single test, one login, captures all chapter screenshots sequentially.
 * Run: npx playwright test user-guide-screenshots.spec.js --headed --timeout=300000
 */

const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL  = 'https://candydada.com/';
const OUT_DIR   = path.join(__dirname, '..', 'user-guide-screenshots');
const EMAIL     = 'guidedemo2026@zeropoint.demo';
const PASSWORD  = 'GuideDemo123!';
const COMPANY   = 'ZeroPoint Demo Co';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ss = async (page, name) => {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
  console.log(`  📸 ${name}.png`);
};

// Navigate to URL with fallback wait strategy
const goto = async (page, url = BASE_URL) => {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  } catch (_) {
    await page.goto(url, { waitUntil: 'commit', timeout: 30000 });
  }
  await page.waitForTimeout(2000);
};

// Click any visible element containing text
const clickText = async (page, text, timeout = 6000) => {
  const el = page.getByText(text, { exact: true }).first();
  try {
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
  } catch (_) {
    // try partial match
    const el2 = page.getByText(text).first();
    if (await el2.isVisible().catch(() => false)) await el2.click();
  }
  await page.waitForTimeout(700);
};

// Expand a sidebar accordion group
const expandGroup = async (page, label) => {
  const candidates = [
    page.locator('nav').getByText(label).first(),
    page.locator('[class*="sidebar"], [class*="Sidebar"]').getByText(label).first(),
    page.getByText(label).first(),
  ];
  for (const c of candidates) {
    if (await c.isVisible().catch(() => false)) {
      await c.click();
      await page.waitForTimeout(600);
      return;
    }
  }
};

// Navigate via sidebar submenu (expand group first, then click sub-item)
const nav = async (page, group, item) => {
  await expandGroup(page, group);
  await clickText(page, item, 5000);
  await page.waitForTimeout(1000);
};

// Dismiss open panel
const close = async (page) => {
  const btn = page.locator('button[class*="closeBtn"], [class*="listHeader"] button:last-child, [class*="popupHeader"] button').first();
  if (await btn.isVisible().catch(() => false)) await btn.click();
  await page.waitForTimeout(500);
};

// Click a button by text label
const clickBtn = async (page, text) => {
  const btn = page.getByRole('button', { name: new RegExp(text, 'i') }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(700);
  }
};

// Fill a visible input matching placeholder/name patterns
const fill = async (page, patterns, value) => {
  const selector = patterns.map(p => `input[placeholder*="${p}" i], input[name*="${p}" i], textarea[placeholder*="${p}" i]`).join(', ');
  const el = page.locator(selector).first();
  if (await el.isVisible().catch(() => false)) await el.fill(value);
};

// ════════════════════════════════════════════════════════════════════════════

test('Capture all user guide screenshots', async ({ page }) => {
  test.setTimeout(360000);

  // ── CH01: Login page ────────────────────────────────────────────────────
  await goto(page);
  await ss(page, 'ch01_01_login_page');

  // Try login first; register if account doesn't exist
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);

  const stillOnAuth = await page.locator('input[type="email"]').first().isVisible().catch(() => false);
  if (stillOnAuth) {
    // Account not yet registered — switch to register
    const regLink = page.getByText(/register|create account|sign up/i).first();
    if (await regLink.isVisible().catch(() => false)) await regLink.click();
    await page.waitForTimeout(800);

    await fill(page, ['company'], COMPANY);
    await fill(page, ['full name', 'your name'], 'Demo Admin');
    await page.locator('input[type="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await ss(page, 'ch01_02_register_form_filled');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(4000);
  } else {
    // Already logged in — show login form screenshot
    await goto(page);
    await ss(page, 'ch01_02_login_form');
  }

  await ss(page, 'ch01_03_dashboard_after_login');

  // ── CH02: Dashboard ─────────────────────────────────────────────────────
  await page.waitForTimeout(1000);
  await ss(page, 'ch02_01_dashboard_kpi_cards');
  await expandGroup(page, 'Sales');
  await ss(page, 'ch02_02_sidebar_expanded');
  await expandGroup(page, 'Sales'); // collapse

  // ── CH03: Company Settings ───────────────────────────────────────────────
  await nav(page, 'Settings', 'Company Settings');
  await ss(page, 'ch03_01_company_settings');
  await close(page);

  // Chart of Accounts
  await nav(page, 'Accounting', 'Chart of Accounts');
  await page.waitForTimeout(1500);
  await ss(page, 'ch03_02_chart_of_accounts');

  // Opening Balance
  const obBtn = page.getByText(/opening balance/i).first();
  if (await obBtn.isVisible().catch(() => false)) {
    await obBtn.click();
    await page.waitForTimeout(1000);
    await ss(page, 'ch03_03_opening_balance_wizard');
    await close(page);
  }
  await close(page);

  // Tax
  await nav(page, 'Settings', 'Tax');
  await page.waitForTimeout(800);
  await ss(page, 'ch03_04_tax_configuration');
  await clickBtn(page, 'Add Tax');
  await page.waitForTimeout(600);
  await fill(page, ['name', 'tax name'], 'Standard VAT');
  await fill(page, ['rate', 'percentage'], '17');
  await ss(page, 'ch03_05_tax_form_filled');
  await close(page);

  // Ship Via
  await clickText(page, 'Ship Via');
  await page.waitForTimeout(800);
  await ss(page, 'ch03_06_ship_via_configuration');
  await clickBtn(page, 'Add');
  await page.waitForTimeout(500);
  await fill(page, ['name', 'carrier'], 'DHL Express');
  await ss(page, 'ch03_07_ship_via_form');
  await close(page);

  // ── CH04: Customers ──────────────────────────────────────────────────────
  await nav(page, 'Customers', 'Customer Center');
  await page.waitForTimeout(1200);
  await ss(page, 'ch04_01_customer_center_list');
  await clickBtn(page, 'Add Customer');
  await page.waitForTimeout(700);
  await fill(page, ['name', 'customer'], 'Aqua Solutions Ltd');
  await fill(page, ['email'], 'info@aquasolutions.com');
  await fill(page, ['phone'], '+92-300-1234567');
  await fill(page, ['address'], '123 Main Street, Karachi');
  await ss(page, 'ch04_02_customer_form_filled');
  const saveCust = page.getByRole('button', { name: /save|add|create/i }).last();
  if (await saveCust.isVisible().catch(() => false)) await saveCust.click();
  await page.waitForTimeout(1200);
  await ss(page, 'ch04_03_customer_saved');
  await close(page);

  // Vendors
  await nav(page, 'Vendors', 'Vendor Center');
  await page.waitForTimeout(1200);
  await ss(page, 'ch04_04_vendor_center_list');
  await clickBtn(page, 'Add Vendor');
  await page.waitForTimeout(700);
  await fill(page, ['name', 'vendor'], 'Global Supplies Inc');
  await fill(page, ['email'], 'sales@globalsupplies.com');
  await fill(page, ['phone'], '+92-21-9876543');
  await ss(page, 'ch04_05_vendor_form_filled');
  const saveVend = page.getByRole('button', { name: /save|add|create/i }).last();
  if (await saveVend.isVisible().catch(() => false)) await saveVend.click();
  await page.waitForTimeout(1200);
  await ss(page, 'ch04_06_vendor_saved');
  await close(page);

  // Products
  await nav(page, 'Product & Services', 'Product Center');
  await page.waitForTimeout(1200);
  await ss(page, 'ch04_07_product_center_list');
  await clickBtn(page, 'Add Product');
  await page.waitForTimeout(700);
  await fill(page, ['name', 'product'], 'Water Purifier X200');
  await fill(page, ['sku'], 'WPX200');
  await fill(page, ['selling', 'price', 'sale'], '25000');
  await fill(page, ['cost'], '18000');
  await ss(page, 'ch04_08_product_form_filled');
  const saveProd = page.getByRole('button', { name: /save|add|create/i }).last();
  if (await saveProd.isVisible().catch(() => false)) await saveProd.click();
  await page.waitForTimeout(1200);
  await ss(page, 'ch04_09_product_saved');
  await close(page);

  // ── CH05: Purchase Flow ──────────────────────────────────────────────────
  await nav(page, 'Purchases', 'Request for Quotation');
  await page.waitForTimeout(1000);
  await ss(page, 'ch05_01_rfq_list');
  await clickBtn(page, 'New RFQ');
  await page.waitForTimeout(800);
  await ss(page, 'ch05_02_rfq_form');
  await close(page);

  await clickText(page, 'Purchase Order');
  await page.waitForTimeout(1000);
  await ss(page, 'ch05_03_purchase_order_list');
  await clickBtn(page, 'New PO');
  await page.waitForTimeout(800);
  await ss(page, 'ch05_04_purchase_order_form');
  await close(page);

  await clickText(page, 'Goods Received Note');
  await page.waitForTimeout(1000);
  await ss(page, 'ch05_05_grn_list');
  await close(page);

  await clickText(page, 'Bills');
  await page.waitForTimeout(1000);
  await ss(page, 'ch05_06_bills_list');
  await clickBtn(page, 'New Bill');
  await page.waitForTimeout(800);
  await ss(page, 'ch05_07_bill_form');
  await close(page);

  await clickText(page, 'Bill Payments');
  await page.waitForTimeout(1000);
  await ss(page, 'ch05_08_bill_payments_list');
  await close(page);

  // ── CH06: Sales Flow ─────────────────────────────────────────────────────
  await nav(page, 'Sales', 'Estimates/Quotations');
  await page.waitForTimeout(1000);
  await ss(page, 'ch06_01_estimates_list');
  await clickBtn(page, 'New Estimate');
  await page.waitForTimeout(800);
  await ss(page, 'ch06_02_estimate_form');
  await close(page);

  await clickText(page, 'Sales Order');
  await page.waitForTimeout(1000);
  await ss(page, 'ch06_03_sales_order_list');
  await clickBtn(page, 'New Sales Order');
  await page.waitForTimeout(800);
  await ss(page, 'ch06_04_sales_order_form');
  await close(page);

  await clickText(page, 'Delivery Notes');
  await page.waitForTimeout(1000);
  await ss(page, 'ch06_05_delivery_note_list');
  await close(page);

  await clickText(page, 'Invoices');
  await page.waitForTimeout(1000);
  await ss(page, 'ch06_06_invoice_list');
  await clickBtn(page, 'New Invoice');
  await page.waitForTimeout(800);
  await ss(page, 'ch06_07_invoice_form');
  await close(page);

  await clickText(page, 'Sales Receipt');
  await page.waitForTimeout(1000);
  await ss(page, 'ch06_08_customer_payments_list');
  await close(page);

  // ── CH07: Expenses ────────────────────────────────────────────────────────
  await nav(page, 'Purchases', 'Expenses');
  await page.waitForTimeout(1000);
  await ss(page, 'ch07_01_expenses_list');
  await clickBtn(page, 'New Expense');
  await page.waitForTimeout(800);
  await fill(page, ['amount', 'total'], '5000');
  await fill(page, ['description', 'desc', 'notes'], 'Office supplies and stationery');
  await ss(page, 'ch07_02_expense_form');
  await close(page);

  // ── CH08: Banking ─────────────────────────────────────────────────────────
  await nav(page, 'Banking', 'Banking Center');
  await page.waitForTimeout(1200);
  await ss(page, 'ch08_01_banking_center');

  await clickText(page, 'Bank Reconciliation');
  await page.waitForTimeout(1200);
  await ss(page, 'ch08_02_bank_reconciliation');
  await close(page);

  // ── CH09: Accounting ──────────────────────────────────────────────────────
  await nav(page, 'Accounting', 'Journal Entries');
  await page.waitForTimeout(1200);
  await ss(page, 'ch09_01_journal_entries_list');
  await clickBtn(page, 'New Journal Entry');
  await page.waitForTimeout(800);
  await ss(page, 'ch09_02_journal_entry_form');
  await close(page);

  await clickText(page, 'General Ledger');
  await page.waitForTimeout(1200);
  await ss(page, 'ch09_03_general_ledger');
  await close(page);

  await clickText(page, 'Trial Balance');
  await page.waitForTimeout(1200);
  await ss(page, 'ch09_04_trial_balance');
  await close(page);

  // ── CH10: Reports ─────────────────────────────────────────────────────────
  await nav(page, 'Reports', 'Financial Statements');
  await page.waitForTimeout(1500);
  await ss(page, 'ch10_01_reports_panel');

  for (const [tab, file] of [
    ['Profit & Loss', 'ch10_02_profit_loss'],
    ['Balance Sheet', 'ch10_03_balance_sheet'],
    ['Cash Flow',     'ch10_04_cash_flow'],
    ['AR Aging',      'ch10_05_ar_aging'],
    ['AP Aging',      'ch10_06_ap_aging'],
    ['Inventory',     'ch10_07_inventory_valuation'],
    ['Tax Summary',   'ch10_08_tax_summary'],
  ]) {
    const tabEl = page.getByText(tab).first();
    if (await tabEl.isVisible().catch(() => false)) {
      await tabEl.click();
      await page.waitForTimeout(500);
      const runBtn = page.getByText(/run report/i).first();
      if (await runBtn.isVisible().catch(() => false)) await runBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, file);
    }
  }
  await close(page);

  // ── CH11: Settings & Admin ────────────────────────────────────────────────
  await nav(page, 'Settings', 'Users & Roles');
  await page.waitForTimeout(1200);
  await ss(page, 'ch11_01_user_management');
  await clickBtn(page, 'Add User');
  await page.waitForTimeout(700);
  await ss(page, 'ch11_02_add_user_form');
  await close(page);

  await clickText(page, 'Approval Workflows');
  await page.waitForTimeout(1200);
  await ss(page, 'ch11_03_approval_workflows');
  await clickBtn(page, 'Add Rule');
  await page.waitForTimeout(700);
  await ss(page, 'ch11_04_approval_rule_form');
  await close(page);

  await clickText(page, 'Recurring Documents');
  await page.waitForTimeout(1200);
  await ss(page, 'ch11_05_recurring_documents');
  await close(page);

  // ── CH12: Year-End Close ──────────────────────────────────────────────────
  await nav(page, 'Accounting', 'Chart of Accounts');
  await page.waitForTimeout(1200);
  const yecBtn = page.getByText(/year.end close/i).first();
  if (await yecBtn.isVisible().catch(() => false)) {
    await yecBtn.click();
    await page.waitForTimeout(1000);
    await ss(page, 'ch12_01_year_end_close_panel');
    const dateInput = page.locator('input[type="date"]').last();
    if (await dateInput.isVisible().catch(() => false)) await dateInput.fill('2025-12-31');
    const previewBtn = page.getByText(/preview close/i).first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click();
      await page.waitForTimeout(2000);
      await ss(page, 'ch12_02_year_end_preview');
    }
    await close(page);
  }
  await close(page);

  // Done
  const captured = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n✅ Done — ${captured.length} screenshots saved to user-guide-screenshots/`);
});
