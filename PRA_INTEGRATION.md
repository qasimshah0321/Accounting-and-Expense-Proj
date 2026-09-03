# PRA Fiscal Invoicing (eIMS) Integration

This ERP integrates with the **Punjab Revenue Authority (PRA)** fiscal invoicing system
(PRAL "Technical Specification for Data Sharing through Software Fiscal Device with PRA"
v1.2) to submit sales invoices in real time. On success PRA returns an official **PRA
Fiscal Invoice Number** and the invoice is stamped with a PRA QR code.

> Only one of **FBR** or **PRA** can be active for a company at a time — see §0. This
> mirrors [FBR_INTEGRATION.md](./FBR_INTEGRATION.md) for the parallel FBR integration.

Unlike the spec's Windows-only "Software Fiscal Device" (a local service consumed at
`http://localhost:8524/api/IMSFiscal/...`), this app posts directly to PRAL's cloud
endpoint documented in spec §7.2.2 (`https://ims.pral.com.pk/ims/{sandbox|production}/api/Live/PostData`)
from the backend server — no local Windows install is required.

---

## 0. FBR vs PRA — only one active at a time

Company Settings exposes a single **Active Tax Authority** selector: `None` / `FBR` /
`PRA`. Selecting one automatically disables the other (`companies.tax_authority`,
enforced both in the UI and again server-side in `fbr.service.ts` / `pra.service.ts`), so
invoices are never double-submitted to two authorities.

---

## 1. Prerequisites — what you must obtain from PRA

1. **PRA portal account** — register at https://reg.pra.punjab.gov.pk/ and complete
   **Registration → POS Client Registration** (Business Information, Contact Information,
   Branch Information, POS Details) to obtain a **POS ID** (POSID) and its **Access Code**.
2. **Generate a Test POS ID** — for sandbox testing, use the portal's "Generate Test POS"
   action to get a separate Test POS ID. PRA also publishes a shared Sandbox Bearer token
   (used automatically by this app if you don't paste your own — see §2).
3. **Production Bearer token** — after going live, the Production access token is shown on
   the **POS Details** tab of the registration screen, against your POS ID ("Token" column).
4. **IP whitelisting (production)** — PRA only accepts posts from a whitelisted server IP.
   Email `eims@pra.punjab.gov.pk` with your PNTN, Business Name, POS ID, Server IP and
   Server Location before going live.
5. **PCT/HS codes** — each invoice line needs a PCT (HS/Classification) code from PRA's
   2nd Schedule (https://pra.punjab.gov.pk/Downloads/Updated-2nd-Schedule-of-PSTS-Act-2012.pdf).
   This reuses the same `hs_code` field already used for FBR (Products → HS Code).

---

## 2. Configure in the app

**Settings → Company Settings → Tax Authority Integration (Pakistan):**

- **Active Tax Authority** → select **PRA**
- **Mode** — Sandbox (testing) or Production (live)
- **PNTN** — Punjab National Tax Number
- **Sandbox (Test) POS ID** + **Sandbox Access Token** — leave the token blank to use
  PRA's published shared sandbox token automatically
- **Production (Live) POS ID** + **Production Access Token** — from the POS Details screen

Then click **Test Connection**. In sandbox mode this posts a minimal, clearly-marked test
invoice (`USIN: TESTCONN-<timestamp>`) to confirm the POS ID/token pair is accepted. PRA's
spec provides no side-effect-free endpoint for production, so in production mode this only
confirms your credentials are saved — verify connectivity via a real submission or sandbox.

**Customers** carry the same buyer NTN/CNIC fields used by FBR (`customers.ntn`, `.cnic`) —
these auto-fill an invoice's `BuyerPNTN`/`BuyerCNIC`. Buyer phone is pulled from the
customer's `phone` field at submission time.

---

## 3. Submitting an invoice

1. Create an invoice and set it to `sent` / `approved` (submission requires one of
   `approved`, `sent`, `paid`, `partially_paid`).
2. On the invoice form, the **PRA Buyer Details** section lets you set:
   - **PRA Invoice Type** — `New` (default), `Debit`, or `Credit` (use `Credit` for a
     return/cancellation, referencing the original invoice's own number as `RefUSIN`)
   - **PRA Payment Mode** — Cash / Card / Gift Voucher / Loyalty Card / Mixed / Cheque
3. Click **Submit to PRA** from the invoice list. On success, the returned PRA Fiscal
   Invoice Number and a verification QR code are stored (`pra_invoice_number`,
   `pra_qr_url`) and printed on the invoice.
4. Verification URL (also encoded in the QR):
   `https://reg.pra.punjab.gov.pk/IMSFiscalReport/SearchPOSInvoice_Report.aspx?PRAInvNo=<InvoiceNumber>`

---

## 4. Data mapping (spec §7 Invoice Model)

| PRA field | Source |
|---|---|
| `POSID` | Active mode's configured POS ID |
| `USIN` | `invoices.invoice_no` |
| `RefUSIN` | `invoices.pra_ref_usin` (Debit/Credit only) |
| `DateTime` | `invoices.invoice_date` |
| `BuyerPNTN` / `BuyerCNIC` | `invoices.buyer_ntn` / `buyer_cnic` (defaulted from customer) |
| `BuyerPhoneNumber` | linked customer's `phone` |
| `TotalSaleValue` / `TotalTaxCharged` / `Discount` | `invoices.subtotal` / `tax_amount` / `discount_amount` |
| `TotalBillAmount` | `invoices.grand_total` |
| `PaymentMode` | `invoices.pra_payment_mode` |
| `InvoiceType` | `invoices.pra_invoice_type` mapped New=1 / Debit=2 / Credit=3 |
| `Items[].PCTCode` | line item `hs_code` (shared with FBR) |
| `Items[].SaleValue` / `TaxCharged` / `TotalAmount` | derived from line quantity/rate/discount/tax |

---

## 5. API endpoints used

| Purpose | Endpoint |
|---|---|
| Sandbox submit | `https://ims.pral.com.pk/ims/sandbox/api/Live/PostData` |
| Production submit | `https://ims.pral.com.pk/ims/production/api/Live/PostData` |
| Verification (QR target) | `https://reg.pra.punjab.gov.pk/IMSFiscalReport/SearchPOSInvoice_Report.aspx?PRAInvNo=...` |

Both submit endpoints take `Authorization: Bearer <token>` and a JSON body; overridable via
`PRA_SANDBOX_URL` / `PRA_PRODUCTION_URL` / `PRA_VERIFY_BASE` / `PRA_TIMEOUT_MS` env vars.

## 6. Support

Email `eims@pra.punjab.gov.pk` / Phone `042-99205710` — include PNTN, POS ID, and a
screenshot of any error.
