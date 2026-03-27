// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'https://candydada.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

test('diagnose login form structure', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Get all inputs
  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type,
    name: e.name,
    id: e.id,
    placeholder: e.placeholder,
    class: e.className.substring(0, 80),
    value: e.value
  })));
  console.log('\n=== ALL INPUTS ===');
  inputs.forEach(i => console.log(`  type="${i.type}" name="${i.name}" id="${i.id}" placeholder="${i.placeholder}" class="${i.class}"`));

  // Get all buttons
  const buttons = await page.$$eval('button', els => els.map(e => ({
    text: e.innerText.trim(),
    type: e.type,
    class: e.className.substring(0, 80),
    id: e.id
  })));
  console.log('\n=== ALL BUTTONS ===');
  buttons.forEach(b => console.log(`  text="${b.text}" type="${b.type}" class="${b.class}"`));

  // Get form HTML
  const formHTML = await page.$eval('form', el => el.outerHTML).catch(() => 'no form');
  console.log('\n=== FORM HTML ===');
  console.log(formHTML.substring(0, 2000));

  // Get full body text
  const bodyText = await page.$eval('body', el => el.innerText.substring(0, 1000));
  console.log('\n=== BODY TEXT ===');
  console.log(bodyText);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_login_form.png'), fullPage: true });
  expect(true).toBeTruthy();
});

test('diagnose - try actual login and dump post-login DOM', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Get all input selectors
  const inputs = await page.$$eval('input', els => els.map(e => ({
    type: e.type, name: e.name, id: e.id, placeholder: e.placeholder, class: e.className
  })));
  console.log('Inputs found:', JSON.stringify(inputs));

  // Try to fill first text/email input
  let emailInput = null;
  for (const inp of inputs) {
    if (inp.type === 'email' || inp.type === 'text' || inp.name?.includes('email') || inp.placeholder?.toLowerCase().includes('email') || inp.placeholder?.toLowerCase().includes('username')) {
      emailInput = inp;
      break;
    }
  }
  console.log('Email input identified:', emailInput);

  if (emailInput) {
    const sel = emailInput.id ? `#${emailInput.id}` : (emailInput.name ? `input[name="${emailInput.name}"]` : `input[type="${emailInput.type}"]`);
    console.log('Using selector:', sel);
    await page.fill(sel, 'admin');
  }

  // Fill password
  const passwordInput = inputs.find(i => i.type === 'password');
  if (passwordInput) {
    const sel = passwordInput.id ? `#${passwordInput.id}` : (passwordInput.name ? `input[name="${passwordInput.name}"]` : 'input[type="password"]');
    await page.fill(sel, 'admin123');
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_before_submit.png'), fullPage: true });

  // Submit
  try {
    await page.click('button[type="submit"]');
  } catch(e) {
    console.log('No submit button, trying enter key');
    await page.keyboard.press('Enter');
  }

  await page.waitForTimeout(5000);

  console.log('\nURL after submit:', page.url());
  const allText = await page.$eval('body', el => el.innerText.substring(0, 2000));
  console.log('Body text after submit:', allText);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_after_login.png'), fullPage: true });
  expect(true).toBeTruthy();
});
