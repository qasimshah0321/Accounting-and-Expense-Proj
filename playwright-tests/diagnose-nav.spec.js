// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const BASE_URL = 'https://candydada.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function loginAdmin(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  // We know admin/admin123 works
  try {
    await page.fill('input[type="email"]', 'admin');
  } catch(e) {
    try { await page.fill('input[name="email"]', 'admin'); } catch(e2) {}
  }
  try {
    await page.fill('input[type="password"]', 'admin123');
  } catch(e) {}
  try {
    await page.click('button[type="submit"]');
  } catch(e) {
    try { await page.click('button:has-text("Login")'); } catch(e2) {}
  }
  await page.waitForTimeout(4000);
}

test('diagnose - dump page structure after login', async ({ page }) => {
  await loginAdmin(page);

  const url = page.url();
  console.log('URL:', url);

  // Get all links
  const links = await page.$$eval('a', els => els.map(e => ({
    text: e.innerText.trim().substring(0, 60),
    href: e.href,
    class: e.className.substring(0, 80)
  })).filter(l => l.text.length > 0));
  console.log('\n=== ALL LINKS ===');
  links.forEach(l => console.log(`  [${l.text}] href="${l.href}" class="${l.class}"`));

  // Get all buttons
  const buttons = await page.$$eval('button', els => els.map(e => ({
    text: e.innerText.trim().substring(0, 60),
    class: e.className.substring(0, 80),
    id: e.id
  })).filter(b => b.text.length > 0));
  console.log('\n=== ALL BUTTONS ===');
  buttons.forEach(b => console.log(`  [${b.text}] class="${b.class}" id="${b.id}"`));

  // Get nav/sidebar HTML
  const navHTML = await page.$eval('nav, [class*="sidebar"], [class*="nav"], [class*="menu"]', el => el.outerHTML.substring(0, 3000)).catch(() => 'no nav found');
  console.log('\n=== NAV/SIDEBAR HTML (first 3000 chars) ===');
  console.log(navHTML);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_01_dashboard.png'), fullPage: true });

  // Try clicking Purchase Orders area
  console.log('\n=== Trying to find PO section ===');
  const allText = await page.$$eval('[class*="sidebar"] *', els => [...new Set(els.map(e => e.innerText?.trim()).filter(t => t && t.length > 0 && t.length < 100))]);
  console.log('Sidebar text items:', allText);

  expect(true).toBeTruthy();
});

test('diagnose - explore page after PO nav', async ({ page }) => {
  await loginAdmin(page);

  // Try clicking anything that mentions Purchase
  const purchaseEl = page.locator('text=Purchase').first();
  try {
    await purchaseEl.waitFor({ timeout: 5000 });
    console.log('Found Purchase element, clicking...');
    await purchaseEl.click();
    await page.waitForTimeout(2000);

    const url2 = page.url();
    console.log('URL after clicking Purchase:', url2);

    const content = await page.content();
    // Look for any "New" button patterns
    const newBtns = await page.$$eval('button, a', els => els.map(e => ({
      text: e.innerText.trim(),
      tag: e.tagName,
      class: e.className.substring(0, 50)
    })).filter(e => e.text.length > 0 && e.text.length < 50));
    console.log('\nAll clickable elements after PO nav:');
    newBtns.forEach(b => console.log(`  [${b.tag}] "${b.text}" class="${b.class}"`));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'diag_02_po_page.png'), fullPage: true });
  } catch(e) {
    console.log('Could not find Purchase element:', e.message);
  }

  expect(true).toBeTruthy();
});
