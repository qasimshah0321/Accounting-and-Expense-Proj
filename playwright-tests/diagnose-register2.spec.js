// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'https://candydada.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

test('register test user - careful fill', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Register tab
  await page.click('button:has-text("Register")');
  await page.waitForTimeout(1500);

  const testEmail = `playwright${Date.now()}@testcompany.com`;
  const testPassword = 'TestPass123!';

  // Fill all fields explicitly
  await page.fill('input[name="first_name"]', 'Playwright');
  await page.fill('input[name="last_name"]', 'Tester');
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  // Confirm password has no name, fill by placeholder
  await page.fill('input[placeholder="Repeat password"]', testPassword);
  await page.fill('input[name="company_name"]', 'Playwright Test Inc');

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_reg2_filled.png'), fullPage: true });
  console.log('Filled registration form with:', testEmail);

  // Intercept API calls to see what happens
  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('auth') || response.url().includes('register')) {
      console.log(`API Response: ${response.status()} ${response.url()}`);
      response.text().then(body => console.log('  Body:', body.substring(0, 300))).catch(() => {});
    }
  });

  // Submit
  await page.click('button:has-text("Create Account")');
  await page.waitForTimeout(6000);

  const url = page.url();
  const bodyText = await page.$eval('body', el => el.innerText.substring(0, 600));
  console.log('URL after register:', url);
  console.log('Body after register:', bodyText.replace(/\n/g, ' | '));

  const hasLoginForm = bodyText.includes('you@company.com') || (bodyText.includes('Email') && bodyText.includes('Password') && bodyText.includes('Sign In'));
  const hasDashboard = !bodyText.includes('Create Account') && !bodyText.includes('Sign In');

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_reg2_after_submit.png'), fullPage: true });

  if (hasDashboard) {
    console.log('*** REGISTRATION & LOGIN SUCCESS ***');
    console.log('Credentials for future tests:', testEmail, '/', testPassword);
    const links = await page.$$eval('a, button, [class*="sidebar"] *', els =>
      [...new Set(els.map(e => e.innerText?.trim()).filter(t => t && t.length > 0 && t.length < 100))]);
    console.log('Navigation items:', links);
  } else {
    console.log('Still on login/register page after submit');
    // Try logging in with new credentials
    if (bodyText.includes('Sign In')) {
      await page.click('button:has-text("Sign In")').catch(() => {});
      await page.waitForTimeout(1000);
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[type="password"]', testPassword);
      await page.click('button.Login_submitBtn__NqJQm');
      await page.waitForTimeout(4000);

      const url3 = page.url();
      const body3 = await page.$eval('body', el => el.innerText.substring(0, 500));
      console.log('URL after login with new account:', url3);
      console.log('Body:', body3.replace(/\n/g, ' | '));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_reg2_login_attempt.png'), fullPage: true });
    }
  }

  expect(true).toBeTruthy();
});
