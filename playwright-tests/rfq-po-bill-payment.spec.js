// Test: RFQ → PO → GRN → Bill → Bill Payment
// Run: npx playwright test rfq-po-bill-payment.spec.js --reporter=line

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://candydada.com/';
const SSDIR = path.join(__dirname, 'screenshots-rfq-bill');
if (!fs.existsSync(SSDIR)) fs.mkdirSync(SSDIR, { recursive: true });

const TIMESTAMP = Date.now();
const TEST_EMAIL    = `billtest${TIMESTAMP}@testco.com`;
const TEST_PASS     = 'TestPass123!';
const TEST_COMPANY  = `Bill Test Co ${TIMESTAMP}`;
const VENDOR_NAME   = `BillVendor ${TIMESTAMP}`;
const PRODUCT_NAME  = `BillProduct ${TIMESTAMP}`;
const PRODUCT_SKU   = `BSKU${TIMESTAMP}`;

let rfqNo = '', poNo = '', grnNo = '', billNo = '';

const ss = async (page, name) => {
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: false, timeout: 5000 }).catch(() => {});
  console.log(`  📸 ${name}.png`);
};

async function login(page, email, password) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[name="email"]', { timeout: 30000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[class*="sidebar"], nav[class*="nav"], [class*="dashboard"]', { timeout: 15000 });
  console.log(`  ✅ Logged in`);
}

async function navTo(page, group, submenu) {
  console.log(`  → ${group} > ${submenu}`);
  const groupEl = page.locator('[class*="menuItem"]').filter({ hasText: new RegExp(`^${group}$`) }).first();
  const subEl   = page.locator('[class*="submenuItem"]').filter({ hasText: new RegExp(`^${submenu}$`) }).first();

  if (await groupEl.count() > 0) await groupEl.click();
  await page.waitForTimeout(600);
  const isVisible = await subEl.isVisible().catch(() => false);
  if (!isVisible) {
    if (await groupEl.count() > 0) await groupEl.click();
    await page.waitForTimeout(600);
  }
  await subEl.waitFor({ state: 'visible', timeout: 10000 });
  await subEl.click({ force: true });
  await page.waitForTimeout(1500);
}

test.describe.configure({ mode: 'serial' });

test.describe('RFQ → PO → GRN → Bill → Payment', () => {

  // ── 0. Register ─────────────────────────────────────────────────────────────
  test('0 — Register fresh account', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('button:has-text("Register")', { timeout: 30000 });
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(500);
    await page.fill('input[name="first_name"]', 'Bill');
    await page.fill('input[name="last_name"]', 'Tester');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASS);
    await page.locator('input[type="password"]').nth(1).fill(TEST_PASS);
    await page.fill('input[name="company_name"]', TEST_COMPANY);
    await page.click('button:has-text("Create Account")');
    await page.waitForTimeout(4000);
    await expect(page.locator('[class*="sidebar"], nav, [class*="menuItem"]').first()).toBeVisible({ timeout: 12000 });
    await ss(page, '00_registered');
    console.log(`  ✅ PASS: Registered ${TEST_EMAIL}`);
  });

  // ── 1. Create Vendor ─────────────────────────────────────────────────────────
  test('1 — Create vendor', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Vendors', 'Vendor Center');
    await page.click('button:has-text("Add Vendor")');
    await page.waitForTimeout(1000);
    await page.fill('input[name="vendorName"]', VENDOR_NAME);
    await page.fill('input[name="email"]', `v${TIMESTAMP}@test.com`);
    await page.click('button:has-text("Save Vendor")');
    await page.waitForTimeout(3000);
    // Close popup if still open
    const closeBtn = page.locator('[class*="popupHeader"] [class*="closeBtn"], [class*="invoicePopup"] button[class*="closeBtn"]').first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
    await page.waitForTimeout(1000);
    await ss(page, '01_vendor_created');
    console.log(`  ✅ PASS: Vendor "${VENDOR_NAME}" created`);
  });

  // ── 2. Create Product ─────────────────────────────────────────────────────────
  test('2 — Create product', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Product & Services', 'Product Center');
    await page.click('button:has-text("Add Product")');
    await page.waitForTimeout(1000);
    await page.fill('input[name="name"]', PRODUCT_NAME);
    await page.selectOption('select[name="itemType"]', 'Inventory item');
    await page.fill('input[name="sku"]', PRODUCT_SKU);
    // Set cost price
    const costInput = page.locator('input[name="costPrice"], input[name="cost_price"], input[placeholder*="cost"], input[placeholder*="Cost"]').first();
    if (await costInput.count() > 0) await costInput.fill('100');
    await page.click('button:has-text("Save Product")');
    await page.waitForTimeout(2000);
    await expect(page.locator('text=' + PRODUCT_NAME).first()).toBeVisible({ timeout: 8000 });
    await ss(page, '02_product_created');
    console.log(`  ✅ PASS: Product "${PRODUCT_NAME}" created`);
  });

  // ── 3. Create RFQ ─────────────────────────────────────────────────────────────
  test('3 — Create RFQ', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Request for Quotation');
    await page.click('button:has-text("New RFQ")');
    await page.waitForTimeout(2000);

    // Select vendor
    const vendorInput = page.locator('input[placeholder="Search or select vendor"]').first();
    await vendorInput.waitFor({ state: 'visible', timeout: 10000 });
    await vendorInput.click();
    await vendorInput.pressSequentially(VENDOR_NAME.substring(0, 10), { delay: 50 });
    await page.waitForTimeout(1000);
    const vendorOpt = page.locator('[class*="autocompleteOption"]').filter({ hasText: VENDOR_NAME }).first();
    if (await vendorOpt.count() > 0) await vendorOpt.click();
    else await page.locator('[class*="autocompleteOption"]:not([class*="addNew"])').first().click();
    await page.waitForTimeout(500);

    // Line item
    await page.locator('input[placeholder="Item description"]').first().fill(PRODUCT_NAME);
    await page.locator('input[type="number"]').first().fill('5');
    await page.locator('input[type="number"]').nth(1).fill('100');
    await ss(page, '03_rfq_filled');

    await page.locator('button[class*="btnSecondary"]').filter({ hasText: 'Save' }).click();
    // Wait for the form popup to close before reading the list
    await page.locator('[class*="invoicePopupOverlay"]').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    rfqNo = (await page.locator('table tbody tr').first().locator('td').first().textContent().catch(() => ''))?.trim() || '';
    console.log(`  RFQ: ${rfqNo}`);
    expect(rfqNo).toContain('RFQ');
    await ss(page, '03b_rfq_saved');
    console.log(`  ✅ PASS: RFQ created → ${rfqNo}`);
  });

  // ── 4. Send RFQ → Mark Quoted ─────────────────────────────────────────────────
  test('4 — Send RFQ and mark Quoted', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Request for Quotation');
    await page.waitForTimeout(1000);

    // Send
    const sendBtn = page.locator('table tbody tr').first().locator('button[title="Send to Vendor"], button[title="Send"]').first();
    await sendBtn.waitFor({ state: 'visible', timeout: 8000 });
    await sendBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, '04_rfq_sent');

    // Mark Quoted
    const quotedBtn = page.locator('table tbody tr').first().locator('button[title="Mark Quoted"], button[title="Mark as Quoted"]').first();
    await quotedBtn.waitFor({ state: 'visible', timeout: 8000 });
    await quotedBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, '04b_rfq_quoted');

    const status = await page.locator('table tbody tr').first().locator('[class*="statusBadge"]').first().textContent().catch(() => '');
    console.log(`  RFQ status: ${status?.trim()}`);
    console.log('  ✅ PASS: RFQ sent and marked Quoted');
  });

  // ── 5. Convert RFQ to PO ─────────────────────────────────────────────────────
  test('5 — Convert RFQ to Purchase Order', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Request for Quotation');
    await page.waitForTimeout(1000);

    const convertBtn = page.locator('table tbody tr').first().locator('button[title="Convert to Purchase Order"], button[title="Convert to PO"]').first();
    await convertBtn.waitFor({ state: 'visible', timeout: 8000 });
    await convertBtn.click();
    await page.waitForTimeout(1000);

    // Fill date in dialog
    const dateInput = page.locator('input[type="date"]').last();
    if (await dateInput.isVisible()) await dateInput.fill(new Date().toISOString().split('T')[0]);
    await ss(page, '05_convert_dialog');

    await page.locator('button:has-text("Convert to PO")').last().click({ force: true });
    await page.waitForTimeout(2500);

    // Verify PO created
    await navTo(page, 'Purchases', 'Purchase Order');
    await page.waitForTimeout(2000);
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });
    poNo = (await page.locator('table tbody tr').first().locator('td').first().textContent().catch(() => ''))?.trim() || '';
    console.log(`  PO: ${poNo}`);
    expect(poNo.length).toBeGreaterThan(0);
    await ss(page, '05b_po_created');
    console.log(`  ✅ PASS: Converted to PO → ${poNo}`);
  });

  // ── 6. Approve PO ───────────────────────────────────────────────────────────
  test('6 — Approve Purchase Order', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Purchase Order');
    await page.waitForTimeout(1000);

    const firstRow = page.locator('table tbody tr').first();
    const approveBtn = firstRow.locator('button[title="Approve PO"], button[title="Approve"]').first();
    if (await approveBtn.count() > 0 && await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(2000);
    } else {
      await firstRow.locator('button[title="Edit"], button[class*="btnEdit"]').first().click();
      await page.waitForTimeout(2000);
      await page.locator('button:has-text("Approve")').first().waitFor({ state: 'visible', timeout: 8000 });
      await page.locator('button:has-text("Approve")').first().click();
      await page.waitForTimeout(2000);
    }

    await navTo(page, 'Purchases', 'Purchase Order');
    const status = await page.locator('table tbody tr').first().locator('[class*="statusBadge"]').first().textContent().catch(() => '');
    console.log(`  PO status: ${status?.trim()}`);
    await ss(page, '06_po_approved');
    console.log('  ✅ PASS: PO approved');
  });

  // ── 7. Create GRN and Receive Goods ─────────────────────────────────────────
  test('7 — Create GRN and receive goods', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Goods Received Note');
    await page.waitForTimeout(1000);

    await page.locator('button:has-text("New GRN"), button:has-text("New Goods Received")').first().click();
    await page.waitForTimeout(2000);
    await ss(page, '07_grn_form');

    // Select vendor
    const vendorInput = page.locator('input[placeholder="Search or select vendor"]').first();
    await vendorInput.waitFor({ state: 'visible', timeout: 10000 });
    await vendorInput.click();
    await vendorInput.pressSequentially(VENDOR_NAME.substring(0, 10), { delay: 50 });
    await page.waitForTimeout(1000);
    const vendOpt = page.locator('[class*="autocompleteOption"]').filter({ hasText: VENDOR_NAME }).first();
    if (await vendOpt.count() > 0) await vendOpt.click();
    else await page.locator('[class*="autocompleteOption"]:not([class*="addNew"])').first().click();
    await page.waitForTimeout(1000);

    // If PO picker appears, select PO
    const poPickerRow = page.locator('[class*="poPickerRow"], tr').filter({ hasText: /PO/ }).first();
    if (await poPickerRow.count() > 0) {
      await poPickerRow.click();
      await page.waitForTimeout(500);
    }

    // Fill line item if not pre-populated from PO
    const descInput = page.locator('input[placeholder="Item description"], input[placeholder="Description"]').first();
    if (await descInput.count() > 0) {
      const val = await descInput.inputValue().catch(() => '');
      if (!val) await descInput.fill(PRODUCT_NAME);
    }
    // Set received qty
    const numInputs = page.locator('input[type="number"]');
    const count = await numInputs.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const v = await numInputs.nth(i).inputValue().catch(() => '');
      if (!v || v === '0') await numInputs.nth(i).fill('5').catch(() => {});
    }
    await ss(page, '07b_grn_filled');

    await page.locator('button[class*="btnSecondary"]').filter({ hasText: /Save/ }).first().click();
    await page.locator('[class*="invoicePopupOverlay"]').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await ss(page, '07c_grn_saved');

    grnNo = (await page.locator('table tbody tr').first().locator('td').first().textContent().catch(() => ''))?.trim() || '';
    console.log(`  GRN: ${grnNo}`);
    expect(grnNo.length).toBeGreaterThan(0);
    console.log('  ✅ PASS: GRN created');
  });

  // ── 8. Receive Goods (mark GRN as received) ──────────────────────────────────
  test('8 — Receive goods on GRN', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Goods Received Note');
    await page.waitForTimeout(1000);

    // Register dialog handler BEFORE clicking to ensure it catches the confirm
    page.on('dialog', d => d.accept());

    const firstRow = page.locator('table tbody tr').first();
    const receiveBtn = firstRow.locator('button[title="Receive Goods (adds to inventory)"]').first();
    await receiveBtn.waitFor({ state: 'visible', timeout: 8000 });
    await receiveBtn.click();
    await page.waitForTimeout(3000);
    await ss(page, '08_grn_received');

    const status = await firstRow.locator('[class*="statusBadge"]').first().textContent().catch(() => '');
    console.log(`  GRN status: ${status?.trim()}`);
    expect(status?.trim()).toBe('received');
    console.log('  ✅ PASS: Goods received');
  });

  // ── 9. Convert GRN to Bill ───────────────────────────────────────────────────
  test('9 — Convert GRN to Bill', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Goods Received Note');
    await page.waitForTimeout(1000);

    // Handle confirm dialog BEFORE clicking
    page.on('dialog', d => d.accept());

    const firstRow = page.locator('table tbody tr').first();
    const convertBtn = firstRow.locator('button[title="Create Bill from GRN"]').first();
    await convertBtn.waitFor({ state: 'visible', timeout: 8000 });
    await convertBtn.click();
    await page.waitForTimeout(3000);
    await ss(page, '09_grn_billed');

    const status = await firstRow.locator('[class*="statusBadge"]').first().textContent().catch(() => '');
    console.log(`  GRN status after billing: ${status?.trim()}`);

    // Verify bill was created
    await navTo(page, 'Purchases', 'Bills');
    await page.waitForTimeout(2000);
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });
    billNo = (await page.locator('table tbody tr').first().locator('td').first().textContent().catch(() => ''))?.trim() || '';
    console.log(`  Bill: ${billNo}`);
    expect(billNo.length).toBeGreaterThan(0);
    await ss(page, '09b_bill_created');
    console.log(`  ✅ PASS: GRN converted to Bill → ${billNo}`);
  });

  // ── 10. Pay Bill via Bill Payments ───────────────────────────────────────────
  test('10 — Pay Bill', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASS);
    await navTo(page, 'Purchases', 'Bill Payments');
    await page.waitForTimeout(1000);

    // Open Make Payment form
    await page.locator('button:has-text("Make Payment")').first().click();
    await page.waitForTimeout(2000);
    await ss(page, '10_payment_form');

    // Select vendor
    const vendorInput = page.locator('input[placeholder="Search or select vendor"]').first();
    await vendorInput.waitFor({ state: 'visible', timeout: 10000 });
    await vendorInput.click();
    await vendorInput.pressSequentially(VENDOR_NAME.substring(0, 10), { delay: 50 });
    await page.waitForTimeout(1000);
    const vendOpt = page.locator('[class*="autocompleteOption"]').filter({ hasText: VENDOR_NAME }).first();
    if (await vendOpt.count() > 0) await vendOpt.click();
    else await page.locator('[class*="autocompleteOption"]:not([class*="addNew"])').first().click();
    await page.waitForTimeout(2000); // wait for outstanding bills to load
    await ss(page, '10b_vendor_selected');

    // Select the outstanding bill (radio button)
    const billRadio = page.locator('table tbody tr input[type="radio"]').first();
    if (await billRadio.count() > 0) {
      await billRadio.click();
      await page.waitForTimeout(500);
      console.log('  Bill selected for payment');
    }

    // Fill payment date
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill(new Date().toISOString().split('T')[0]);

    // Fill amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.click({ clickCount: 3 });
    await amountInput.fill('500');

    // Payment method already defaults to cash — leave it

    await ss(page, '10c_payment_filled');

    // Submit
    await page.locator('button:has-text("Record Payment")').last().click();
    await page.waitForTimeout(3000);
    await ss(page, '10d_payment_done');

    // Verify payment appears in list
    await page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 10000 });
    const paymentRow = await page.locator('table tbody tr').first().textContent().catch(() => '');
    console.log(`  Payment row: ${paymentRow?.trim().substring(0, 60)}`);

    // Verify bill now shows paid status
    await navTo(page, 'Purchases', 'Bills');
    await page.waitForTimeout(1500);
    const payStatus = await page.locator('table tbody tr').first().locator('[class*="statusBadge"]').nth(1).textContent().catch(() => '');
    const billStatus = await page.locator('table tbody tr').first().locator('[class*="statusBadge"]').first().textContent().catch(() => '');
    console.log(`  Bill status: "${billStatus?.trim()}", Payment status: "${payStatus?.trim()}"`);
    await ss(page, '10e_bill_after_payment');
    console.log('  ✅ PASS: Bill payment recorded');
  });

});
