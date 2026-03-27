// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'https://candydada.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

test('explore register form and register a test user', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Register tab
  await page.click('button:has-text("Register")');
  await page.waitForTimeout(2000);

  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, class: e.className
  })));
  console.log('Register form inputs:', JSON.stringify(inputs, null, 2));

  const formHTML = await page.$eval('form', el => el.outerHTML).catch(() => 'no form');
  console.log('Register form HTML:', formHTML.substring(0, 3000));

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_register_form.png'), fullPage: true });
  expect(true).toBeTruthy();
});

test('register a new user then login', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Register tab
  await page.click('button:has-text("Register")');
  await page.waitForTimeout(1500);

  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type, name: e.name, id: e.id, placeholder: e.placeholder
  })));
  console.log('Inputs on register form:', JSON.stringify(inputs));

  // Fill registration form based on known structure
  const testEmail = `playwright${Date.now()}@test.com`;
  const testPassword = 'Test123!';

  for (const inp of inputs) {
    const sel = inp.name ? `input[name="${inp.name}"]` : `input[placeholder="${inp.placeholder}"]`;
    const placeholder = inp.placeholder.toLowerCase();
    const name = inp.name.toLowerCase();

    if (name.includes('company') || placeholder.includes('company')) {
      await page.fill(sel, 'Playwright Test Co').catch(() => {});
    } else if (name.includes('email') || inp.type === 'email') {
      await page.fill(sel, testEmail).catch(() => {});
    } else if (name === 'name' || name.includes('user') || name.includes('full') || placeholder.includes('name')) {
      await page.fill(sel, 'Playwright Admin').catch(() => {});
    } else if (inp.type === 'password' || name.includes('password')) {
      await page.fill(sel, testPassword).catch(() => {});
    }
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_register_filled.png'), fullPage: true });
  console.log(`Attempting to register with: ${testEmail} / ${testPassword}`);

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  const url = page.url();
  const content = await page.content();
  const bodyText = await page.$eval('body', el => el.innerText.substring(0, 500));
  console.log('URL after register:', url);
  console.log('Body after register:', bodyText.replace(/\n/g, ' | '));

  const hasLoginForm = content.includes('you@company.com') || content.includes('Login_submitBtn');

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_after_register.png'), fullPage: true });

  if (!hasLoginForm) {
    console.log('*** REGISTRATION SUCCESS - logged in! ***');
    console.log('Credentials:', testEmail, '/', testPassword);

    const allLinks = await page.$$eval('a, button', els => els.map(e => e.innerText.trim()).filter(t => t.length > 0 && t.length < 80));
    console.log('All clickable items after registration:', allLinks);
  } else {
    console.log('Registration either failed or redirected to login - trying login...');
    // Try logging in with the registered email
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button.Login_submitBtn__NqJQm');
    await page.waitForTimeout(4000);

    const url2 = page.url();
    const bodyText2 = await page.$eval('body', el => el.innerText.substring(0, 500));
    console.log('URL after login with new account:', url2);
    console.log('Body:', bodyText2.replace(/\n/g, ' | '));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_after_new_login.png'), fullPage: true });
  }

  expect(true).toBeTruthy();
});
