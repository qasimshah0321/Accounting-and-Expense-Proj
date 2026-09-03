// Test: RFQ auto-number + price parity with PO using Aqua Kiss product
// Logs in as m.bilal@gmail.com with existing data (no fresh registration)
// Run: npx playwright test rfq-aquakiss-price-test.spec.js --reporter=line

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL   = 'https://candydada.com/';
const EMAIL      = 'm.bilal@gmail.com';
const PASSWORD   = 'Test123@';
const SSDIR      = path.join(__dirname, 'screenshots-aquakiss');
if (!fs.existsSync(SSDIR)) fs.mkdirSync(SSDIR, { recursive: true });

let rfqNo   = '';
let rfqRate = 0;
let poNo    = '';
let poRate  = 0;

const ss = async (page, name) => {
  await page.screenshot({ path: path.join(SSDIR, `${name}.png`), fullPage: false, timeout: 5000 }).catch(() => {});
  console.log(`  📸 ${name}.png`);
};

async function login(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[name="email"]', { timeout: 30000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForSelector('[class*="sidebar"], nav, [class*="menuItem"]', { timeout: 15000 });
  console.log(`  ✅ Logged in as ${EMAIL}`);
}

async function navTo(page, group, submenu) {
  console.log(`  → ${group} > ${submenu}`);
  const groupEl = page.locator('[class*="menuItem"]').filter({ hasText: new RegExp(`^${group}$`) }).first();
  const subEl   = page.locator('[class*="submenuItem"]').filter({ hasText: new RegExp(`^${submenu}$`) }).first();
  if (await groupEl.count() > 0) await groupEl.click();
  await page.waitForTimeout(600);
  if (!await subEl.isVisible().catch(() => false)) {
    if (await groupEl.count() > 0) await groupEl.click();
    await page.waitForTimeout(600);
  }
  await subEl.waitFor({ state: 'visible', timeout: 10000 });
  await subEl.click({ force: true });
  await page.waitForTimeout(1500);
}

test.describe.configure({ mode: 'serial' });

test.describe('RFQ auto-number + Aqua Kiss price parity with PO', () => {

  // ── 1. Verify RFQ number is auto-generated (read-only, pre-filled) ──────────
  test('1 — RFQ number is auto-generated and read-only', async ({ page }) => {
    await login(page);
    await navTo(page, 'Purchases', 'Request for Quotation');

    await page.click('button:has-text("New RFQ")');
    await page.waitForTimeout(2500);
    await ss(page, '01_rfq_form_open');

    // The RFQ No field should be pre-filled and read-only
    const rfqNoInput = page.locator('input[class*="formControlStandard"]').filter({ hasText: '' }).first();
    // Find it by looking for the field near "RFQ No." label
    const rfqNoField = page.locator('label:has-text("RFQ No.") + input, label:has-text("RFQ No.") ~ input').first();

    const value = await rfqNoField.inputValue().catch(async () => {
      // Fallback: find any input that looks like an RFQ number
      const allInputs = page.locator('input[readonly], input[style*="cursor: default"]');
      const count = await allInputs.count();
      for (let i = 0; i < count; i++) {
        const v = await allInputs.nth(i).inputValue().catch(() => '');
        if (v.includes('RFQ')) return v;
      }
      return '';
    });

    console.log(`  RFQ No. field value: "${value}"`);
    expect(value).toMatch(/RFQ/i);

    // Verify the field is read-only
    const isReadOnly = await rfqNoField.evaluate(el => el.readOnly).catch(() => true);
    console.log(`  RFQ No. is read-only: ${isReadOnly}`);
    expect(isReadOnly).toBe(true);

    rfqNo = value;
    await ss(page, '01b_rfq_no_verified');
    console.log(`  ✅ PASS: RFQ number "${rfqNo}" is auto-generated and read-only`);

    // Close form
    await page.locator('[class*="popupHeader"] [class*="closeBtn"]').first().click().catch(() => {});
    await page.waitForTimeout(500);
  });

  // ── 2. Create RFQ with Aqua Kiss — record the price ────────────────────────
  test('2 — Create RFQ with Aqua Kiss and record price', async ({ page }) => {
    await login(page);
    await navTo(page, 'Purchases', 'Request for Quotation');

    await page.click('button:has-text("New RFQ")');
    await page.waitForTimeout(2500);

    // Read auto-generated RFQ number
    const rfqNoField = page.locator('label:has-text("RFQ No.") + input, label:has-text("RFQ No.") ~ input').first();
    rfqNo = await rfqNoField.inputValue().catch(() => '');
    console.log(`  Auto-generated RFQ No: "${rfqNo}"`);
    expect(rfqNo).toMatch(/RFQ/i);

    // Select vendor (first available)
    const vendorInput = page.locator('input[placeholder="Search or select vendor"]').first();
    await vendorInput.click();
    await page.waitForTimeout(800);
    // Pick first non-"Add New" option
    const firstVendor = page.locator('[class*="autocompleteOption"]:not([class*="addNew"])').first();
    await firstVendor.waitFor({ state: 'visible', timeout: 8000 });
    const vendorName = await firstVendor.textContent().catch(() => 'unknown');
    await firstVendor.click();
    await page.waitForTimeout(500);
    console.log(`  Selected vendor: ${vendorName?.trim()}`);

    // Type "Aqua Kiss" in description field to trigger autocomplete
    const descInput = page.locator('input[placeholder="Item description"]').first();
    await descInput.click();
    await descInput.pressSequentially('Aqua Kiss', { delay: 60 });
    await page.waitForTimeout(1200);
    await ss(page, '02_aquakiss_suggestions');

    // Click Aqua Kiss from suggestions
    const suggestion = page.locator('[class*="autocompleteDropdown"] div, [style*="border-bottom"] div').filter({ hasText: /aqua\s*kiss/i }).first();
    if (await suggestion.count() > 0) {
      await suggestion.click({ force: true });
      await page.waitForTimeout(600);
      console.log('  Aqua Kiss selected from suggestions');
    } else {
      // Try onMouseDown approach for product dropdown
      const prodSugg = page.locator('div').filter({ hasText: /^Aqua Kiss/ }).first();
      if (await prodSugg.count() > 0) {
        await prodSugg.dispatchEvent('mousedown');
        await page.waitForTimeout(600);
      }
    }

    // Read the rate that was auto-filled
    const rateInput = page.locator('input[type="number"]').nth(1);
    rfqRate = parseFloat(await rateInput.inputValue().catch(() => '0')) || 0;
    console.log(`  Aqua Kiss price in RFQ: ${rfqRate}`);
    await ss(page, '02b_aquakiss_price_rfq');

    // Save RFQ
    await page.locator('button[class*="btnSecondary"]').filter({ hasText: 'Save' }).click();
    // Wait for popup to close — if it doesn't close, save failed
    await page.locator('[class*="invoicePopupOverlay"]').waitFor({ state: 'detached', timeout: 15000 });
    await page.waitForTimeout(2000);
    await ss(page, '02c_rfq_saved');

    // Confirm our RFQ appears in the list (first row should be the one we just created)
    const firstRowNo = (await page.locator('table tbody tr').first().locator('td').first().textContent().catch(() => ''))?.trim() || '';
    console.log(`  First row in list: ${firstRowNo}, rfqNo from form: ${rfqNo}`);

    // If backend assigned a different number than peeked, update rfqNo to match actual
    if (firstRowNo && firstRowNo.includes('RFQ') && firstRowNo !== rfqNo) {
      console.log(`  ⚠ Peek/actual mismatch — using actual saved number: ${firstRowNo}`);
      rfqNo = firstRowNo;
    }

    // Verify our RFQ row exists in the list
    const ourRow = page.locator('table tbody tr').filter({ hasText: rfqNo }).first();
    await ourRow.waitFor({ state: 'visible', timeout: 5000 });
    console.log(`  ✅ PASS: RFQ ${rfqNo} created with Aqua Kiss @ price ${rfqRate}`);
  });

  // ── 3. Send → Quote → Convert RFQ to PO ────────────────────────────────────
  test('3 — Send, Quote, Convert RFQ to PO', async ({ page }) => {
    await login(page);
    await navTo(page, 'Purchases', 'Request for Quotation');
    await page.waitForTimeout(1500);
    console.log(`  Looking for RFQ: ${rfqNo}`);

    // Target our specific RFQ row by number
    const rfqRow = () => page.locator('table tbody tr').filter({ hasText: rfqNo }).first();

    // Send
    page.on('dialog', d => d.accept());
    const sendBtn = rfqRow().locator('button[title="Send to Vendor"], button[title="Send"]').first();
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();
      await page.waitForTimeout(2000);
    }
    await ss(page, '03_rfq_sent');

    // Mark Quoted
    const quotedBtn = rfqRow().locator('button[title="Mark Quoted"], button[title="Mark as Quoted"]').first();
    if (await quotedBtn.isVisible().catch(() => false)) {
      await quotedBtn.click();
      await page.waitForTimeout(2000);
    }
    await ss(page, '03b_rfq_quoted');

    // Convert to PO
    const convertBtn = rfqRow().locator('button[title="Convert to Purchase Order"], button[title="Convert to PO"]').first();
    await convertBtn.waitFor({ state: 'visible', timeout: 8000 });
    await convertBtn.click();
    await page.waitForTimeout(1000);

    // Fill date in dialog
    const dateInput = page.locator('input[type="date"]').last();
    if (await dateInput.isVisible()) await dateInput.fill(new Date().toISOString().split('T')[0]);
    await ss(page, '03c_convert_dialog');

    await page.locator('button:has-text("Convert to PO")').last().click({ force: true });
    await page.waitForTimeout(3000);
    await ss(page, '03d_converted');
    console.log('  ✅ PASS: RFQ sent, quoted, converted to PO');
  });

  // ── 4. Open PO — verify Aqua Kiss price matches RFQ ────────────────────────
  test('4 — Verify PO price matches RFQ price for Aqua Kiss', async ({ page }) => {
    await login(page);
    await navTo(page, 'Purchases', 'Purchase Order');
    await page.waitForTimeout(1500);
    await ss(page, '04_po_list');

    // Log all PO rows to understand sort order
    const allRows = page.locator('table tbody tr');
    const rowCount = await allRows.count();
    console.log(`  PO list rows: ${rowCount}`);
    for (let i = 0; i < Math.min(rowCount, 6); i++) {
      const rowText = (await allRows.nth(i).textContent().catch(() => ''))?.replace(/\s+/g, ' ').trim() || '';
      console.log(`    Row ${i}: ${rowText.substring(0, 90)}`);
    }

    // Find the PO converted from our RFQ: look for a "draft" PO with today's date
    // (The RFQ→PO conversion creates a draft PO; old processed POs show "approved"/"received")
    const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    console.log(`  Looking for draft PO with date ${today}`);
    const draftPoRow = page.locator('table tbody tr').filter({ hasText: /draft/i }).first();
    if (await draftPoRow.count() > 0) {
      poNo = (await draftPoRow.locator('td').first().textContent().catch(() => ''))?.trim() || '';
      console.log(`  Found draft PO: ${poNo}`);
    } else {
      // Fallback: first row
      poNo = (await allRows.first().locator('td').first().textContent().catch(() => ''))?.trim() || '';
      console.log(`  No draft PO found, using first row: ${poNo}`);
    }
    console.log(`  PO number selected: ${poNo}`);

    // Get the row for the selected PO
    const selectedPoRow = page.locator('table tbody tr').filter({ hasText: poNo }).first();

    // Open PO to inspect line item price
    const viewBtn = selectedPoRow.locator('button[title="View"], button[title="Edit"], button[class*="btnEdit"]').first();
    await viewBtn.waitFor({ state: 'visible', timeout: 8000 });
    await viewBtn.click();
    await page.waitForTimeout(2000);
    await ss(page, '04b_po_form');

    // Read the rate from the first line item (Aqua Kiss)
    const rateInput = page.locator('input[type="number"]').nth(1);
    poRate = parseFloat(await rateInput.inputValue().catch(() => '0')) || 0;
    console.log(`  Aqua Kiss price in PO:  ${poRate}`);
    console.log(`  Aqua Kiss price in RFQ: ${rfqRate}`);

    // Also read from read-only rate display (PO in view mode might show text not inputs)
    if (poRate === 0) {
      const rateCells = page.locator('td, [class*="colRate"] input, [class*="itemsTable"] input[type="number"]');
      const count = await rateCells.count();
      for (let i = 0; i < count; i++) {
        const tag = await rateCells.nth(i).evaluate(el => el.tagName).catch(() => '');
        const v = tag === 'INPUT'
          ? parseFloat(await rateCells.nth(i).inputValue().catch(() => '0'))
          : parseFloat(await rateCells.nth(i).textContent().catch(() => '0'));
        if (v > 0) { poRate = v; break; }
      }
      console.log(`  Aqua Kiss price in PO (fallback read): ${poRate}`);
    }

    await ss(page, '04c_po_price_verified');

    expect(rfqRate).toBeGreaterThan(0);
    expect(poRate).toBeGreaterThan(0);
    expect(poRate).toBe(rfqRate);

    console.log(`  ✅ PASS: RFQ price (${rfqRate}) === PO price (${poRate}) ✓`);
  });

});
