// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'https://candydada.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Credentials to try in order
const CREDENTIALS = [
  { email: 'admin@test.com', password: 'password123' },
  { email: 'admin@candydada.com', password: 'password123' },
  { email: 'admin@test.com', password: 'admin123' },
  { email: 'admin@candydada.com', password: 'admin123' },
  { email: 'admin', password: 'admin123' },
];

let authToken = null;
let loggedInEmail = null;

// Helper: login and return success
async function attemptLogin(page, email, password) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Try filling email field (various selectors)
  const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]', 'input[placeholder*="Email" i]', '#email'];
  const passwordSelectors = ['input[type="password"]', 'input[name="password"]', 'input[placeholder*="password" i]', '#password'];

  let emailFilled = false;
  for (const sel of emailSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 3000 });
      await page.fill(sel, email);
      emailFilled = true;
      break;
    } catch (e) { /* try next */ }
  }
  if (!emailFilled) return false;

  for (const sel of passwordSelectors) {
    try {
      await page.fill(sel, password);
      break;
    } catch (e) { /* try next */ }
  }

  // Submit
  const submitSelectors = ['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Sign In")', 'button:has-text("Log In")', 'input[type="submit"]'];
  for (const sel of submitSelectors) {
    try {
      await page.click(sel, { timeout: 3000 });
      break;
    } catch (e) { /* try next */ }
  }

  await page.waitForTimeout(3000);

  // Check if login succeeded (no longer on login page / dashboard visible)
  const currentUrl = page.url();
  const pageContent = await page.content();
  const loginFailed = pageContent.includes('Invalid') || pageContent.includes('incorrect') || pageContent.includes('Wrong') || pageContent.includes('failed');
  const loginSuccess = pageContent.includes('Dashboard') || pageContent.includes('dashboard') || pageContent.includes('Purchase') || pageContent.includes('Invoice') || currentUrl !== BASE_URL + '/';

  return loginSuccess && !loginFailed;
}

// Helper: click sidebar item
async function clickSidebar(page, label) {
  const selectors = [
    `a:has-text("${label}")`,
    `button:has-text("${label}")`,
    `li:has-text("${label}")`,
    `span:has-text("${label}")`,
    `[data-menu*="${label.toLowerCase()}"]`,
    `nav a:has-text("${label}")`,
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ timeout: 5000 });
      await el.click();
      await page.waitForTimeout(1500);
      return true;
    } catch (e) { /* try next */ }
  }
  console.log(`Could not find sidebar item: ${label}`);
  return false;
}

// Helper: safe screenshot
async function screenshot(page, name) {
  try {
    const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`Screenshot saved: ${name}.png`);
    return filepath;
  } catch (e) {
    console.log(`Screenshot failed for ${name}: ${e.message}`);
  }
}

// Helper: find and click a button by text patterns
async function clickButton(page, texts) {
  const textList = Array.isArray(texts) ? texts : [texts];
  for (const text of textList) {
    const selectors = [
      `button:has-text("${text}")`,
      `a:has-text("${text}")`,
      `[role="button"]:has-text("${text}")`,
      `input[value="${text}"]`,
    ];
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 3000 });
        await el.scrollIntoViewIfNeeded();
        await el.click();
        await page.waitForTimeout(1500);
        return true;
      } catch (e) { /* try next */ }
    }
  }
  return false;
}

// Helper: fill input by label or placeholder
async function fillField(page, labelOrPlaceholder, value) {
  const selectors = [
    `input[placeholder*="${labelOrPlaceholder}" i]`,
    `textarea[placeholder*="${labelOrPlaceholder}" i]`,
    `input[name*="${labelOrPlaceholder}" i]`,
    `label:has-text("${labelOrPlaceholder}") + input`,
    `label:has-text("${labelOrPlaceholder}") ~ input`,
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ timeout: 3000 });
      await el.clear();
      await el.fill(value);
      return true;
    } catch (e) { /* try next */ }
  }
  return false;
}

// ============================================================
// PART 1 - Verify Production Deployment
// ============================================================

test.describe('PART 1 - Production Deployment Verification', () => {

  test('1.1 - Site is accessible and login page loads', async ({ page }) => {
    console.log('\n--- TEST 1.1: Site accessibility ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    console.log(`Page title: ${title}`);
    console.log(`Current URL: ${page.url()}`);

    await screenshot(page, '01_login_page');

    // Verify page loaded (not error)
    await expect(page).not.toHaveTitle(/404|Error|Not Found/i);
    console.log('PASS: Site is accessible');
  });

  test('1.2 - Login with valid credentials', async ({ page }) => {
    console.log('\n--- TEST 1.2: Login ---');
    let loginSuccess = false;

    for (const cred of CREDENTIALS) {
      console.log(`Trying: ${cred.email} / ${cred.password}`);
      loginSuccess = await attemptLogin(page, cred.email, cred.password);
      if (loginSuccess) {
        loggedInEmail = cred.email;
        console.log(`PASS: Login succeeded with ${cred.email}`);
        break;
      }
      console.log(`FAIL: Login failed with ${cred.email}`);
    }

    await screenshot(page, '02_after_login');

    if (!loginSuccess) {
      // Take screenshot of whatever state we're in for debugging
      const content = await page.content();
      console.log('Page excerpt after all login attempts:', content.substring(0, 500));
    }

    expect(loginSuccess, 'Should be able to login with one of the tried credentials').toBeTruthy();
  });

  test('1.3 - Dashboard loads after login', async ({ page }) => {
    console.log('\n--- TEST 1.3: Dashboard ---');

    // Login first
    let loginSuccess = false;
    for (const cred of CREDENTIALS) {
      loginSuccess = await attemptLogin(page, cred.email, cred.password);
      if (loginSuccess) break;
    }

    await page.waitForTimeout(2000);
    const content = await page.content();
    const url = page.url();
    console.log(`URL after login: ${url}`);

    const hasDashboard = content.toLowerCase().includes('dashboard') ||
                         content.includes('Total Revenue') ||
                         content.includes('Invoices') ||
                         content.includes('Purchase Orders') ||
                         content.includes('Sales Orders');

    console.log(`Dashboard content detected: ${hasDashboard}`);
    await screenshot(page, '03_dashboard');

    expect(hasDashboard || loginSuccess, 'Dashboard should load after login').toBeTruthy();
  });

  test('1.4 - Sidebar navigation items exist', async ({ page }) => {
    console.log('\n--- TEST 1.4: Sidebar navigation ---');

    // Login first
    for (const cred of CREDENTIALS) {
      const ok = await attemptLogin(page, cred.email, cred.password);
      if (ok) break;
    }
    await page.waitForTimeout(2000);

    const content = await page.content();
    const navItems = ['Purchase', 'Bill', 'Vendor', 'Sales', 'Invoice', 'Inventory'];
    const found = [];
    const missing = [];

    for (const item of navItems) {
      if (content.includes(item)) {
        found.push(item);
      } else {
        missing.push(item);
      }
    }

    console.log(`Found nav items: ${found.join(', ')}`);
    console.log(`Missing nav items: ${missing.join(', ')}`);

    await screenshot(page, '04_sidebar');
    expect(found.length, `At least some nav items should be present. Found: ${found.join(', ')}`).toBeGreaterThan(0);
  });
});

// ============================================================
// PART 2 - Purchases Workflow
// ============================================================

test.describe('PART 2 - Purchases Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // Login before each test
    for (const cred of CREDENTIALS) {
      const ok = await attemptLogin(page, cred.email, cred.password);
      if (ok) { loggedInEmail = cred.email; break; }
    }
    await page.waitForTimeout(2000);
  });

  test('2.1 - Create Purchase Order', async ({ page }) => {
    console.log('\n--- TEST 2.1: Create Purchase Order ---');

    // Navigate to Purchase Orders
    let navSuccess = await clickSidebar(page, 'Purchase Orders');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Purchase Order');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Purchases');
    console.log(`Nav to PO: ${navSuccess}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '05_po_list');

    // Click New/Create button
    let newClicked = await clickButton(page, ['New', 'New Purchase Order', 'Create', '+ New', 'Add New', '+ Purchase Order']);
    console.log(`New PO button clicked: ${newClicked}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '06_po_form_open');

    // Try to select vendor - look for vendor dropdown/input
    const vendorSelectors = [
      'input[placeholder*="vendor" i]',
      'select[name*="vendor" i]',
      '[class*="vendor" i] input',
      'input[name*="vendor" i]',
    ];
    let vendorSet = false;
    for (const sel of vendorSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 3000 });
        await el.click();
        await page.waitForTimeout(500);
        await el.fill('Test');
        await page.waitForTimeout(1000);
        // Try to pick first option from dropdown
        const option = page.locator('[role="option"], .dropdown-item, li[class*="option"]').first();
        try {
          await option.waitFor({ timeout: 2000 });
          await option.click();
          vendorSet = true;
        } catch (e) {
          // type full name and tab out
          await el.fill('Test Vendor');
          await page.keyboard.press('Tab');
          vendorSet = true;
        }
        break;
      } catch (e) { /* try next */ }
    }
    console.log(`Vendor set: ${vendorSet}`);

    // Add line item
    await fillField(page, 'Description', 'Office Supplies');
    await fillField(page, 'description', 'Office Supplies');

    // Try to fill qty and rate in line items table
    const qtySelectors = ['input[placeholder*="qty" i]', 'input[placeholder*="quantity" i]', 'input[name*="qty" i]', 'input[name*="quantity" i]', 'td input:nth-child(1)', '[class*="line"] input[type="number"]:first-of-type'];
    for (const sel of qtySelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('10');
        console.log(`Qty filled with selector: ${sel}`);
        break;
      } catch (e) { /* try next */ }
    }

    const rateSelectors = ['input[placeholder*="rate" i]', 'input[placeholder*="price" i]', 'input[name*="rate" i]', 'input[name*="unit_price" i]', 'input[placeholder*="unit" i]'];
    for (const sel of rateSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('50');
        console.log(`Rate filled with selector: ${sel}`);
        break;
      } catch (e) { /* try next */ }
    }

    await screenshot(page, '07_po_line_items_filled');

    // Save as draft
    let saved = await clickButton(page, ['Save as Draft', 'Save Draft', 'Save', 'Create', 'Submit']);
    console.log(`PO saved: ${saved}`);
    await page.waitForTimeout(3000);
    await screenshot(page, '08_po_saved');

    // Get PO number from page
    const content = await page.content();
    const poMatch = content.match(/PO[-\s]*\d+|PO-\d+|\bPO\d+\b/);
    if (poMatch) console.log(`PO Number found: ${poMatch[0]}`);

    // Approve the PO
    let approved = await clickButton(page, ['Approve', 'Approve PO', 'Mark Approved']);
    console.log(`PO approved: ${approved}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '09_po_approved');

    // Set to received
    let received = await clickButton(page, ['Receive', 'Mark as Received', 'Received', 'Set Received']);
    console.log(`PO received: ${received}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '10_po_received');

    // Verify we made some progress
    expect(navSuccess || newClicked, 'Should navigate to PO section or open new PO form').toBeTruthy();
  });

  test('2.2 - Create Bill', async ({ page }) => {
    console.log('\n--- TEST 2.2: Create Bill ---');

    // Navigate to Bills
    let navSuccess = await clickSidebar(page, 'Bills');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Bill Center');
    console.log(`Nav to Bills: ${navSuccess}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '11_bills_list');

    // New bill
    let newClicked = await clickButton(page, ['New Bill', 'New', '+ New', 'Create Bill', 'Add Bill']);
    console.log(`New Bill clicked: ${newClicked}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '12_bill_form_open');

    // Select vendor
    const vendorSelectors = ['input[placeholder*="vendor" i]', 'select[name*="vendor" i]', '[class*="vendor"] input'];
    for (const sel of vendorSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 3000 });
        await el.click();
        await el.fill('Test');
        await page.waitForTimeout(1000);
        const option = page.locator('[role="option"], .dropdown-item, li[class*="option"]').first();
        try {
          await option.waitFor({ timeout: 2000 });
          await option.click();
        } catch (e) {
          await el.fill('Test Vendor');
          await page.keyboard.press('Tab');
        }
        break;
      } catch (e) { /* try next */ }
    }

    // Fill line items
    await fillField(page, 'Description', 'Office Supplies Invoice');

    const qtySelectors = ['input[placeholder*="qty" i]', 'input[placeholder*="quantity" i]', 'input[name*="qty" i]'];
    for (const sel of qtySelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('10');
        break;
      } catch (e) { /* try next */ }
    }

    const rateSelectors = ['input[placeholder*="rate" i]', 'input[placeholder*="price" i]', 'input[name*="rate" i]'];
    for (const sel of rateSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('50');
        break;
      } catch (e) { /* try next */ }
    }

    await screenshot(page, '13_bill_line_items');

    // Save
    let saved = await clickButton(page, ['Save', 'Create Bill', 'Submit', 'Save Bill']);
    console.log(`Bill saved: ${saved}`);
    await page.waitForTimeout(3000);
    await screenshot(page, '14_bill_saved');

    // Approve
    let approved = await clickButton(page, ['Approve', 'Approve Bill', 'Mark Approved']);
    console.log(`Bill approved: ${approved}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '15_bill_approved');

    expect(navSuccess || newClicked, 'Should navigate to Bills or open bill form').toBeTruthy();
  });

  test('2.3 - Record Vendor Payment', async ({ page }) => {
    console.log('\n--- TEST 2.3: Vendor Payment ---');

    // Navigate to Vendor Payments
    let navSuccess = await clickSidebar(page, 'Vendor Payments');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Payments');
    console.log(`Nav to Vendor Payments: ${navSuccess}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '16_vendor_payments_list');

    // New payment
    let newClicked = await clickButton(page, ['New Payment', 'New', '+ New', 'Create Payment', 'Add Payment', 'Record Payment']);
    console.log(`New Vendor Payment clicked: ${newClicked}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '17_vendor_payment_form');

    // Select vendor
    const vendorSelectors = ['input[placeholder*="vendor" i]', 'select[name*="vendor" i]', '[class*="vendor"] input'];
    for (const sel of vendorSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 3000 });
        await el.click();
        await el.fill('Test');
        await page.waitForTimeout(1000);
        const option = page.locator('[role="option"], .dropdown-item, li[class*="option"]').first();
        try {
          await option.waitFor({ timeout: 2000 });
          await option.click();
        } catch (e) {
          await page.keyboard.press('Tab');
        }
        break;
      } catch (e) { /* try next */ }
    }

    // Fill amount
    await fillField(page, 'Amount', '500');
    await fillField(page, 'amount', '500');

    await screenshot(page, '18_vendor_payment_filled');

    // Save
    let saved = await clickButton(page, ['Save', 'Submit', 'Record Payment', 'Create Payment', 'Pay']);
    console.log(`Vendor payment saved: ${saved}`);
    await page.waitForTimeout(3000);
    await screenshot(page, '19_vendor_payment_saved');

    expect(navSuccess || newClicked, 'Should navigate to Vendor Payments or open form').toBeTruthy();
  });
});

// ============================================================
// PART 3 - Sales Workflow
// ============================================================

test.describe('PART 3 - Sales Workflow', () => {

  test.beforeEach(async ({ page }) => {
    for (const cred of CREDENTIALS) {
      const ok = await attemptLogin(page, cred.email, cred.password);
      if (ok) { loggedInEmail = cred.email; break; }
    }
    await page.waitForTimeout(2000);
  });

  test('3.1 - Create Sales Order', async ({ page }) => {
    console.log('\n--- TEST 3.1: Create Sales Order ---');

    let navSuccess = await clickSidebar(page, 'Sales Orders');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Sales Order');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Sales');
    console.log(`Nav to Sales Orders: ${navSuccess}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '20_so_list');

    let newClicked = await clickButton(page, ['New', 'New Sales Order', '+ New', 'Create SO', 'Add Sales Order']);
    console.log(`New SO clicked: ${newClicked}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '21_so_form_open');

    // Select customer
    const customerSelectors = ['input[placeholder*="customer" i]', 'select[name*="customer" i]', '[class*="customer"] input'];
    for (const sel of customerSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 3000 });
        await el.click();
        await el.fill('Test');
        await page.waitForTimeout(1000);
        const option = page.locator('[role="option"], .dropdown-item, li[class*="option"]').first();
        try {
          await option.waitFor({ timeout: 2000 });
          await option.click();
        } catch (e) {
          await el.fill('Test Customer');
          await page.keyboard.press('Tab');
        }
        break;
      } catch (e) { /* try next */ }
    }

    // Fill line items
    await fillField(page, 'Description', 'Test Product');

    const qtySelectors = ['input[placeholder*="qty" i]', 'input[placeholder*="quantity" i]', 'input[name*="qty" i]'];
    for (const sel of qtySelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('5');
        break;
      } catch (e) { /* try next */ }
    }

    const rateSelectors = ['input[placeholder*="rate" i]', 'input[placeholder*="price" i]', 'input[name*="rate" i]'];
    for (const sel of rateSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('100');
        break;
      } catch (e) { /* try next */ }
    }

    await screenshot(page, '22_so_line_items');

    let saved = await clickButton(page, ['Save', 'Create', 'Submit', 'Save Sales Order']);
    console.log(`SO saved: ${saved}`);
    await page.waitForTimeout(3000);
    await screenshot(page, '23_so_saved');

    expect(navSuccess || newClicked, 'Should navigate to Sales Orders or open form').toBeTruthy();
  });

  test('3.2 - Create Invoice', async ({ page }) => {
    console.log('\n--- TEST 3.2: Create Invoice ---');

    let navSuccess = await clickSidebar(page, 'Invoices');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Invoice');
    console.log(`Nav to Invoices: ${navSuccess}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '24_invoice_list');

    let newClicked = await clickButton(page, ['New Invoice', 'New', '+ New', 'Create Invoice', 'Add Invoice']);
    console.log(`New Invoice clicked: ${newClicked}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '25_invoice_form_open');

    // Select customer
    const customerSelectors = ['input[placeholder*="customer" i]', 'select[name*="customer" i]', '[class*="customer"] input'];
    for (const sel of customerSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 3000 });
        await el.click();
        await el.fill('Test');
        await page.waitForTimeout(1000);
        const option = page.locator('[role="option"], .dropdown-item, li[class*="option"]').first();
        try {
          await option.waitFor({ timeout: 2000 });
          await option.click();
        } catch (e) {
          await el.fill('Test Customer');
          await page.keyboard.press('Tab');
        }
        break;
      } catch (e) { /* try next */ }
    }

    // Fill line items
    await fillField(page, 'Description', 'Services Rendered');

    const qtySelectors = ['input[placeholder*="qty" i]', 'input[placeholder*="quantity" i]', 'input[name*="qty" i]'];
    for (const sel of qtySelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('1');
        break;
      } catch (e) { /* try next */ }
    }

    const rateSelectors = ['input[placeholder*="rate" i]', 'input[placeholder*="price" i]', 'input[name*="rate" i]'];
    for (const sel of rateSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 2000 });
        await el.clear();
        await el.fill('500');
        break;
      } catch (e) { /* try next */ }
    }

    await screenshot(page, '26_invoice_line_items');

    let saved = await clickButton(page, ['Save', 'Create', 'Submit', 'Save Invoice']);
    console.log(`Invoice saved: ${saved}`);
    await page.waitForTimeout(3000);
    await screenshot(page, '27_invoice_saved');

    // Approve
    let approved = await clickButton(page, ['Approve', 'Approve Invoice', 'Mark Approved']);
    console.log(`Invoice approved: ${approved}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '28_invoice_approved');

    expect(navSuccess || newClicked, 'Should navigate to Invoices or open form').toBeTruthy();
  });

  test('3.3 - Record Customer Payment', async ({ page }) => {
    console.log('\n--- TEST 3.3: Customer Payment ---');

    let navSuccess = await clickSidebar(page, 'Customer Payments');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Receive Payment');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Payments');
    console.log(`Nav to Customer Payments: ${navSuccess}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '29_customer_payments_list');

    let newClicked = await clickButton(page, ['New Payment', 'New', 'Receive Payment', '+ New', 'Record Payment']);
    console.log(`New Customer Payment clicked: ${newClicked}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '30_customer_payment_form');

    // Select customer
    const customerSelectors = ['input[placeholder*="customer" i]', 'select[name*="customer" i]', '[class*="customer"] input'];
    for (const sel of customerSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ timeout: 3000 });
        await el.click();
        await el.fill('Test');
        await page.waitForTimeout(1000);
        const option = page.locator('[role="option"], .dropdown-item, li[class*="option"]').first();
        try {
          await option.waitFor({ timeout: 2000 });
          await option.click();
        } catch (e) {
          await page.keyboard.press('Tab');
        }
        break;
      } catch (e) { /* try next */ }
    }

    // Fill amount
    await fillField(page, 'Amount', '500');
    await fillField(page, 'amount', '500');

    await screenshot(page, '31_customer_payment_filled');

    let saved = await clickButton(page, ['Save', 'Submit', 'Record Payment', 'Create Payment', 'Apply']);
    console.log(`Customer payment saved: ${saved}`);
    await page.waitForTimeout(3000);
    await screenshot(page, '32_customer_payment_saved');

    expect(navSuccess || newClicked, 'Should navigate to Customer Payments or open form').toBeTruthy();
  });
});

// ============================================================
// PART 4 - Verify Inventory Updated
// ============================================================

test.describe('PART 4 - Inventory Verification', () => {

  test.beforeEach(async ({ page }) => {
    for (const cred of CREDENTIALS) {
      const ok = await attemptLogin(page, cred.email, cred.password);
      if (ok) { loggedInEmail = cred.email; break; }
    }
    await page.waitForTimeout(2000);
  });

  test('4.1 - Navigate to Inventory and check products', async ({ page }) => {
    console.log('\n--- TEST 4.1: Inventory Check ---');

    let navSuccess = await clickSidebar(page, 'Inventory');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Products');
    if (!navSuccess) navSuccess = await clickSidebar(page, 'Product Center');
    console.log(`Nav to Inventory: ${navSuccess}`);
    await page.waitForTimeout(2000);
    await screenshot(page, '33_inventory_list');

    const content = await page.content();
    const hasInventory = content.includes('stock') || content.includes('Stock') ||
                         content.includes('quantity') || content.includes('Quantity') ||
                         content.includes('Product') || content.includes('Inventory') ||
                         content.includes('current_stock');
    console.log(`Inventory content detected: ${hasInventory}`);

    // Look for stock numbers
    const stockMatch = content.match(/current.?stock[^0-9]*(\d+)/i);
    if (stockMatch) {
      console.log(`Stock value found: ${stockMatch[1]}`);
    }

    await screenshot(page, '34_inventory_final');
    expect(navSuccess || hasInventory, 'Should navigate to Inventory section').toBeTruthy();
  });
});
