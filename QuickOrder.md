# Quick Order / POS Feature

## What was implemented

### New files
| File | Purpose |
|---|---|
| `components/QuickOrder.js` | Main **Order Window** panel — customer, date, tax, order items table, totals, Create Order button |
| `components/QuickOrder.module.css` | Styles for the order window |
| `components/ProductSelectorPopup.js` | **Product browser popup** — searchable product list with +/− qty and Add buttons |
| `components/ProductSelectorPopup.module.css` | Styles for the popup |

### Modified files
- `app/page.js` — imported `QuickOrder`, added it to panel render, and added `'Quick Order'` / `'POS'` to the menu map

---

## User flow

1. User navigates to **Quick Order** (or POS) from the sidebar/menu
2. The **Order Window** opens — shows customer selector, date, tax, empty cart
3. User clicks **"Browse Products"** → the **Product Selector popup** appears (centered modal)
4. In the popup: search products, adjust qty with **−/+** buttons, click **"+ Add"** per product
   - Green flash confirms each add; existing items have their qty increased
5. Click **"Done"** to close the popup
6. Back in the Order Window: all added products appear in the order table with qty controls and totals
7. User adjusts quantities, picks a customer, then clicks **"Create Order"** → saves as a Sales Order

---

## Architecture

### QuickOrder.js (Order Window)
- Full-panel component matching Invoice/SalesOrder pattern
- Opens via `activePanel === 'QuickOrder'` in `page.js`
- State: `lineItems`, `customers`, `products`, `selectedTax`, `orderNo`
- Calls `api.createSalesOrder(payload)` on save
- Opens `ProductSelectorPopup` when "Browse Products" is clicked

### ProductSelectorPopup.js (Product Browser)
- Centered modal overlay (z-index: 5000)
- Props: `isOpen`, `onClose`, `products`, `onAdd(product, qty)`, `currencySymbol`
- Features: live search by name/SKU/category, +/− qty per row, Add button with green flash feedback
- Only shows active (`is_active !== false`) and sale-enabled (`is_for_sale !== false`) products
- Adding an already-added product increases its quantity in the order

### Menu Integration
```js
// MENU_PANEL_MAP entries added in page.js
'Quick Order':    'QuickOrder',
'POS':            'QuickOrder',
'Point of Sale':  'QuickOrder',
```

### Panel registration in page.js
```jsx
<QuickOrder
  isOpen={activePanel === 'QuickOrder'}
  onClose={closePanel}
  user={user}
  currencySymbol={currencySymbol}
  taxes={taxes}
/>
```

---

## API used
| Function | Endpoint | Purpose |
|---|---|---|
| `api.getProducts()` | `GET /api/v1/products?limit=200` | Load product catalog |
| `api.getCustomers()` | `GET /api/v1/customers?limit=200` | Customer autocomplete |
| `api.getNextSalesOrderNumber()` | `GET /api/v1/sales-orders/next-number` | Auto order number |
| `api.createSalesOrder(payload)` | `POST /api/v1/sales-orders` | Save the order |

### createSalesOrder payload shape
```js
{
  customer_id: Number,
  order_date: 'YYYY-MM-DD',
  tax_id: Number | null,
  tax_rate: Number,
  notes: String,
  line_items: [
    {
      sku: String,
      description: String,
      quantity: Number,
      rate: Number,
      amount: Number,
      tax_id: Number | null,
      tax_rate: Number,
      tax_amount: Number,
    }
  ]
}
```

---

## Build & deploy
After any changes, rebuild with:
```bash
# From backend/ folder
npm run build:full
```
This rebuilds both the Next.js frontend and TypeScript backend into `backend/dist/`.
