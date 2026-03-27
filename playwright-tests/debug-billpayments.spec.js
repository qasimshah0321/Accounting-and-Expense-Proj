const { test, expect } = require('@playwright/test');
const BASE_URL = 'https://candydada.com/';
const TS = Date.now();
const EMAIL = `debug${TS}@test.com`;
const PASS = 'TestPass123!';

test('debug bill payments crash', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

  await page.goto(BASE_URL);
  await page.waitForSelector('button:has-text("Register")', { timeout: 30000 });
  await page.click('button:has-text("Register")');
  await page.waitForTimeout(300);
  await page.fill('input[name="first_name"]', 'Debug');
  await page.fill('input[name="last_name"]', 'User');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  const pwFields = page.locator('input[type="password"]');
  await pwFields.nth(1).fill(PASS);
  await page.fill('input[name="company_name"]', `Debug Co ${TS}`);
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(4000);

  console.log('Errors after login:', errors);
  errors.length = 0;

  // Expand Purchases
  const parent = page.locator('[class*="menuItem"]').filter({ hasText: /^Purchases$/ }).first();
  await expect(parent).toBeVisible({ timeout: 10000 });
  await parent.click();
  await page.waitForTimeout(600);

  // Click Bill Payments
  const item = page.locator('[class*="submenuItem"], [class*="submenu"] li').filter({ hasText: /^Bill Payments$/ }).first();
  await item.waitFor({ state: 'visible', timeout: 8000 });
  await item.click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'screenshots/debug_billpayments.png', fullPage: false });

  console.log('Console errors after navigation:', errors);
  const bodyText = await page.textContent('body');
  const hasError = bodyText.includes('Application error');
  console.log('Has application error:', hasError);
  console.log('Page title:', await page.title());
});
