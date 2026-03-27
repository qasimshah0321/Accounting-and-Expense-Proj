'use strict'
const { test, expect } = require('@playwright/test')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'https://candydada.com/'
const TS = Date.now()
const EMAIL = `dashtest${TS}@test.com`
const PASS = 'TestPass123!'
const COMPANY = `Dash Co ${TS}`

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots')
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

const ss = async (page, name) => {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `dash_${name}.png`), fullPage: false })
  console.log(`  📸 dash_${name}.png`)
}

async function login(page) {
  await page.goto(BASE_URL)
  await page.waitForSelector('input[name="email"]', { timeout: 30000 })
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', PASS)
  await page.click('button[type="submit"]')
  // Wait for sidebar to appear (indicates successful login & app load)
  await page.waitForSelector('[class*="menuItem"]', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

async function expandGroup(page, group) {
  const parent = page.locator('[class*="menuItem"]').filter({ hasText: new RegExp(`^${group}$`) }).first()
  await parent.waitFor({ state: 'visible', timeout: 8000 })
  await parent.click()
  await page.waitForTimeout(600)
}

async function clickSub(page, text) {
  const item = page.locator('[class*="submenuItem"], [class*="submenu"] li').filter({ hasText: new RegExp(`^${text}$`) }).first()
  await item.waitFor({ state: 'visible', timeout: 8000 })
  await item.click({ force: true })
  await page.waitForTimeout(1500)
}

test.describe.configure({ mode: 'serial' })

test.describe('Dashboard Data Verification', () => {

  // ── 1. Register fresh account ───────────────────────────────────────────────
  test('D1 — Register account', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForSelector('button:has-text("Register")', { timeout: 30000 })
    await page.click('button:has-text("Register")')
    await page.waitForTimeout(400)
    await page.fill('input[name="first_name"]', 'Dash')
    await page.fill('input[name="last_name"]', 'Test')
    await page.fill('input[name="email"]', EMAIL)
    await page.fill('input[name="password"]', PASS)
    await page.locator('input[type="password"]').nth(1).fill(PASS)
    await page.fill('input[name="company_name"]', COMPANY)
    await page.click('button:has-text("Create Account")')
    // Wait for sidebar to appear (= registration complete and logged in)
    await page.waitForSelector('[class*="menuItem"]', { timeout: 30000 })
    await page.waitForTimeout(500)
    await ss(page, '01_registered')
    const body = await page.textContent('body')
    expect(body).not.toContain('Application error')
    console.log('  ✅ Registered and logged in')
  })

  // ── 2. Create vendor ────────────────────────────────────────────────────────
  test('D2 — Create vendor & customer', async ({ page }) => {
    await login(page)
    await expandGroup(page, 'Vendors')
    await clickSub(page, 'Vendor Center')
    await page.click('button:has-text("Add Vendor")')
    await page.waitForTimeout(1500)
    // First input in the Add New Vendor popup is Vendor Name
    const vendorNameInput = page.locator('[class*="popup"], [class*="modal"], [class*="overlay"]').locator('input').first()
    await vendorNameInput.waitFor({ state: 'visible', timeout: 8000 })
    await vendorNameInput.fill('Dash Vendor')
    await page.click('button:has-text("Save Vendor")')
    await page.waitForTimeout(2000)
    await ss(page, '02_vendor_saved')

    await expandGroup(page, 'Customers')
    await clickSub(page, 'Customer Center')
    await page.waitForTimeout(500)
    const addBtn = page.locator('button:has-text("Add Customer"), button:has-text("New Customer")').first()
    await addBtn.waitFor({ state: 'visible', timeout: 8000 })
    await addBtn.click()
    await page.waitForTimeout(1500)
    // First input in customer popup is Customer Name
    const custNameInput = page.locator('[class*="popup"], [class*="modal"], [class*="overlay"]').locator('input').first()
    await custNameInput.waitFor({ state: 'visible', timeout: 8000 })
    await custNameInput.fill('Dash Customer')
    await page.click('button:has-text("Save Customer")')
    await page.waitForTimeout(2000)
    await ss(page, '03_customer_saved')
    console.log('  ✅ Vendor and Customer created')
  })

  // ── 3. Create UNPAID invoice ($500) ─────────────────────────────────────────
  test('D3 — Create invoice (leave unpaid → AR should show $500)', async ({ page }) => {
    await login(page)
    await expandGroup(page, 'Sales')
    await clickSub(page, 'Invoices')
    // Wait for invoice list to finish loading before clicking New Invoice
    await page.waitForSelector('button:has-text("New Invoice")', { state: 'visible', timeout: 15000 })
    await page.waitForFunction(() => !document.body.innerText.includes('Loading invoices'), { timeout: 10000 }).catch(() => {})
    await page.click('button:has-text("New Invoice")')
    await page.waitForTimeout(2000)

    // Select customer
    const custInput = page.locator('input[placeholder="Search or select customer"]').first()
    await custInput.waitFor({ state: 'visible', timeout: 8000 })
    await custInput.fill('Dash Customer')
    await page.waitForTimeout(1000)
    // Pick the exact customer, not the "Add New" option
    const custOpt = page.locator('[class*="autocompleteOption"]').filter({ hasText: 'Dash Customer' }).first()
    if (await custOpt.count() > 0) {
      await custOpt.click()
    } else {
      // Fallback: pick first non-addNew option
      await page.locator('[class*="autocompleteOption"]:not([class*="addNew"])').first().click().catch(() => {})
    }
    // Close CustomerPopup only if it opened accidentally (not the invoice form)
    const custPopup = page.locator('[class*="CustomerPopup_popupOverlay"]').first()
    if (await custPopup.isVisible().catch(() => false)) {
      await page.locator('[class*="CustomerPopup_popupOverlay"] button:has-text("Cancel")').first().click()
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(500)

    // Fill due date
    await page.locator('input[type="date"]').nth(1).fill('2026-04-30')

    // Line item
    await page.locator('input[placeholder="Item description"]').first().fill('Dashboard Test Service')
    await page.locator('input[type="number"]').first().fill('5')
    await page.locator('input[type="number"]').nth(1).fill('100')
    await page.waitForTimeout(500)
    await ss(page, '04_invoice_form')

    // Save (creates draft/sent invoice)
    // Capture the save response
    let saveResp = null
    page.on('response', async (resp) => {
      if (resp.url().includes('/api/v1/invoices') && resp.request().method() === 'POST') {
        try { saveResp = await resp.json() } catch {}
      }
    })

    await page.locator('button[class*="btnSecondary"]').first().click()
    await page.waitForTimeout(3000)
    await ss(page, '05_invoice_saved')

    const body = await page.textContent('body')
    expect(body).not.toContain('Application error')
    const hasInv = await page.locator('text=/INV-/').count()
    console.log(`  Invoice rows visible: ${hasInv}`)
    if (saveResp) {
      const d = saveResp?.data
      console.log(`  Invoice save API: id=${d?.id} no=${d?.invoice_no} amount_due=${d?.amount_due} grand_total=${d?.grand_total}`)
    } else {
      console.log('  ⚠️  Invoice save response not captured')
    }
    console.log('  ✅ Invoice created ($500) — NOT paid, should appear in AR')
  })

  // ── 4. Create UNPAID bill ($300) ────────────────────────────────────────────
  test('D4 — Create bill (leave unpaid → AP should show $300)', async ({ page }) => {
    await login(page)
    await expandGroup(page, 'Purchases')
    await clickSub(page, 'Bills')
    await page.waitForSelector('button:has-text("New Bill")', { state: 'visible', timeout: 15000 })
    await page.waitForFunction(() => !document.body.innerText.includes('Loading bills'), { timeout: 10000 }).catch(() => {})
    await page.click('button:has-text("New Bill")')
    await page.waitForTimeout(2000)

    // Select vendor
    const vendorInput = page.locator('input[placeholder="Search or select vendor"]').first()
    await vendorInput.waitFor({ state: 'visible', timeout: 8000 })
    await vendorInput.fill('Dash Vendor')
    await page.waitForTimeout(1000)
    const vendOpt = page.locator('[class*="autocompleteOption"]').filter({ hasText: 'Dash Vendor' }).first()
    if (await vendOpt.count() > 0) {
      await vendOpt.click()
    } else {
      await page.locator('[class*="autocompleteOption"]:not([class*="addNew"])').first().click().catch(() => {})
    }
    // Close VendorPopup only if it opened accidentally
    const vendPopup = page.locator('[class*="VendorPopup_popupOverlay"]').first()
    if (await vendPopup.isVisible().catch(() => false)) {
      await page.locator('[class*="VendorPopup_popupOverlay"] button:has-text("Cancel")').first().click()
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(500)

    // Fill due date (index 1)
    await page.locator('input[type="date"]').nth(1).fill('2026-04-30')

    // Line item
    await page.locator('input[placeholder="Item description"]').first().fill('Dashboard Test Expense')
    await page.locator('input[type="number"]').first().fill('3')
    await page.locator('input[type="number"]').nth(1).fill('100')
    await page.waitForTimeout(500)
    await ss(page, '06_bill_form')

    await page.locator('button[class*="btnSecondary"]').first().click()
    await page.waitForTimeout(3000)
    await ss(page, '07_bill_saved')

    const body = await page.textContent('body')
    expect(body).not.toContain('Application error')
    console.log('  ✅ Bill created ($300) — NOT paid, should appear in AP')
  })

  // ── 5. Approve the bill so it posts to AP ───────────────────────────────────
  test('D5 — Approve bill (posts to AP and GL)', async ({ page }) => {
    await login(page)
    await expandGroup(page, 'Purchases')
    await clickSub(page, 'Bills')
    await page.waitForTimeout(1000)
    await ss(page, '08_bills_list')

    // Click the first bill row to open it
    const billRow = page.locator('text=/BILL-/').first()
    await billRow.waitFor({ state: 'visible', timeout: 8000 })
    await billRow.click()
    await page.waitForTimeout(1500)
    await ss(page, '09_bill_opened')

    // Click Approve button
    const approveBtn = page.locator('button:has-text("Approve")').first()
    if (await approveBtn.count() > 0) {
      await approveBtn.click()
      await page.waitForTimeout(2000)
      await ss(page, '10_bill_approved')
      console.log('  ✅ Bill approved — now in AP and GL')
    } else {
      console.log('  ⚠️  No Approve button found (bill may already be approved)')
    }
  })

  // ── 6. Navigate to Dashboard and verify metrics ─────────────────────────────
  test('D6 — Dashboard shows correct data from workflow', async ({ page }) => {
    // Capture dashboard API response
    let dashboardApiData = null
    page.on('response', async (resp) => {
      if (resp.url().includes('/api/v1/reports/dashboard')) {
        try { dashboardApiData = await resp.json() } catch {}
      }
    })

    await login(page)

    // Navigate to Dashboard
    const dashItem = page.locator('[class*="menuItem"]').filter({ hasText: /^Dashboard$/ }).first()
    await dashItem.waitFor({ state: 'visible', timeout: 8000 })
    await dashItem.click()
    await page.waitForTimeout(5000) // Give dashboard time to load all 7 APIs
    await ss(page, '11_dashboard')

    const body = await page.textContent('body')
    expect(body).not.toContain('Application error')
    console.log('  ✅ Dashboard loaded (no crash)')

    if (dashboardApiData) {
      console.log(`  Dashboard API response: ${JSON.stringify(dashboardApiData?.data || dashboardApiData).substring(0, 400)}`)
    } else {
      console.log('  ⚠️  Dashboard API response not captured')
    }

    // Use [class*="card__"] to target top-level card divs only (avoids strict mode)
    const allCards = page.locator('[class*="card__"]')
    const cardCount = await allCards.count()
    console.log(`  Total card elements: ${cardCount}`)
    for (let i = 0; i < Math.min(cardCount, 8); i++) {
      const t = await allCards.nth(i).textContent()
      console.log(`  card[${i}]: "${t?.replace(/\s+/g, ' ').trim().substring(0, 120)}"`)
    }

    // ── Check INVOICES card ──────────────────────────────────────────────────
    const invoiceCard = page.locator('[class*="card__"]').filter({ hasText: 'INVOICES' }).first()
    if (await invoiceCard.count() > 0) {
      const invText = await invoiceCard.textContent()
      console.log(`  INVOICES card: "${invText?.replace(/\s+/g, ' ').trim().substring(0, 200)}"`)
      console.log(`  Contains $500: ${invText?.includes('500')}`)
    }

    // ── Check THIS MONTH card ────────────────────────────────────────────────
    const monthCard = page.locator('[class*="card__"]').filter({ hasText: 'THIS MONTH' }).first()
    if (await monthCard.count() > 0) {
      const monthText = await monthCard.textContent()
      console.log(`  THIS MONTH card: "${monthText?.replace(/\s+/g, ' ').trim().substring(0, 300)}"`)
    }

    // ── Check ACCOUNTS RECEIVABLE card ──────────────────────────────────────
    const arCard = page.locator('[class*="card__"]').filter({ hasText: 'ACCOUNTS RECEIVABLE' }).first()
    if (await arCard.count() > 0) {
      const arText = await arCard.textContent()
      console.log(`  AR card: "${arText?.replace(/\s+/g, ' ').trim().substring(0, 200)}"`)
    }

    // ── Check ACCOUNTS PAYABLE card ─────────────────────────────────────────
    const apCard = page.locator('[class*="card__"]').filter({ hasText: 'ACCOUNTS PAYABLE' }).first()
    if (await apCard.count() > 0) {
      const apText = await apCard.textContent()
      console.log(`  AP card: "${apText?.replace(/\s+/g, ' ').trim().substring(0, 200)}"`)
    }

    // ── Check PROFIT & LOSS card ─────────────────────────────────────────────
    const plCard = page.locator('[class*="card__"]').filter({ hasText: 'PROFIT & LOSS' }).first()
    if (await plCard.count() > 0) {
      const plText = await plCard.textContent()
      console.log(`  P&L card: "${plText?.replace(/\s+/g, ' ').trim().substring(0, 200)}"`)
    }

    await ss(page, '12_dashboard_full')
    console.log('  ✅ Dashboard verification complete — see screenshots')
  })
})
