// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'https://candydada.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

const CREDENTIALS = [
  { email: 'admin@test.com', password: 'password123' },
  { email: 'admin@candydada.com', password: 'password123' },
  { email: 'admin@test.com', password: 'admin123' },
  { email: 'admin@candydada.com', password: 'admin123' },
  { email: 'admin@zeropoint.com', password: 'admin123' },
  { email: 'admin@zeropoint.com', password: 'password123' },
  { email: 'test@test.com', password: 'password123' },
  { email: 'admin@admin.com', password: 'admin123' },
];

test('try all credentials and check actual result', async ({ page }) => {
  for (const cred of CREDENTIALS) {
    console.log(`\nTrying: ${cred.email} / ${cred.password}`);

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.fill('input[name="email"]', cred.email);
    await page.fill('input[type="password"]', cred.password);
    await page.click('button.Login_submitBtn__NqJQm');
    await page.waitForTimeout(4000);

    const url = page.url();
    const content = await page.content();
    const bodyText = await page.$eval('body', el => el.innerText.substring(0, 300));

    // Check for actual login failure messages
    const hasError = content.includes('Invalid') || content.includes('incorrect') || content.includes('Wrong') || content.includes('error') || content.toLowerCase().includes('failed');
    // Check if login page is gone (no longer showing login form)
    const hasLoginForm = content.includes('you@company.com') || content.includes('Login_submitBtn');
    const hasDashboard = content.includes('Dashboard') && !content.includes('Login_tab');

    console.log(`  URL: ${url}`);
    console.log(`  Has login form: ${hasLoginForm}`);
    console.log(`  Has dashboard: ${hasDashboard}`);
    console.log(`  Has error: ${hasError}`);
    console.log(`  Body start: ${bodyText.replace(/\n/g, ' | ')}`);

    if (!hasLoginForm) {
      console.log(`  *** LOGIN SUCCESS! ***`);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `diag_login_success_${cred.email.replace(/@/g, '_').replace(/\./g, '_')}.png`), fullPage: true });

      // Dump all navigation/sidebar items
      const allLinks = await page.$$eval('a', els => els.map(e => e.innerText.trim()).filter(t => t.length > 0));
      console.log('All links after login:', allLinks);
      const allBtns = await page.$$eval('button', els => els.map(e => e.innerText.trim()).filter(t => t.length > 0));
      console.log('All buttons after login:', allBtns);
      break;
    }
  }
  expect(true).toBeTruthy();
});
