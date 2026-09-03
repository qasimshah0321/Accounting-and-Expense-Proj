# FBR Digital Invoicing (DI) Integration

This ERP integrates with Pakistan's **FBR Digital Invoicing (DI) API** (PRAL Technical
Specification v1.12) to submit sales invoices for real-time validation. On success FBR
returns an official invoice number and the invoice is stamped with an FBR QR code.

> This replaces the earlier FBR POS ("imsp") integration, which used a username/password
> login and the `PostData` endpoint. That API is deprecated; the DI API below is current.

---

## 1. Prerequisites — what you must obtain from FBR/PRAL

Before invoices can be transmitted, the business must be enrolled and hold a security token:

1. **IRIS enrolment** — the business must be registered for Sales Tax on the FBR IRIS
   portal (https://iris.fbr.gov.pk) with a valid **NTN** (7 digits) or the owner's **CNIC**
   (13 digits).
2. **Register the ERP for Digital Invoicing** — in IRIS, enrol the system/ERP that will
   upload invoice data. FBR issues a **security token** (a Bearer token, valid **5 years**)
   bound to your seller NTN/CNIC.
3. **Declare business activity & sector** — your activity (Manufacturer / Importer /
   Distributor / Wholesaler / Exporter / Retailer / Service Provider) and sector determine
   which **scenarios** apply (see §4).
4. **Sandbox token first** — PRAL issues a sandbox token for testing. Only after successful
   sandbox testing do you switch to the production token.

The token is the only credential the software needs. Sandbox vs production is chosen by the
**Mode** toggle in settings (and by which token you paste).

---

## 2. Configure in the app

**Settings → Company Settings → FBR Integration (Pakistan):**

- **Enable FBR Integration**
- **Mode** — Sandbox (testing) or Production (live)
- **Seller NTN / CNIC** — 7-digit NTN or 13-digit CNIC (must match the token)
- **Security Token (Bearer)** — paste the PRAL 5-year token (write-only; stored AES-encrypted)
- **Seller Business Name / Province / Address** — printed on the DI payload; province must
  match FBR's province list
- **Business Activity / Sector** — drives applicable scenarios
- **Default Sandbox Scenario ID** — e.g. `SN001` (sandbox only)

Then click:
- **Test Connection** — validates the token against FBR's `provinces` reference API
- **Sync Reference Data** — pulls provinces, HS codes, UoM, doc types, SRO items and
  transaction types from FBR into the local `fbr_reference_data` cache

**Customers** carry FBR buyer defaults (NTN, CNIC, Province, Registration Type). When a
customer is selected on an invoice, these auto-fill the invoice's FBR buyer fields.

**Products** carry FBR defaults (HS Code, Sale Type, UoM) which pre-fill new invoice lines.

---

## 3. Submitting an invoice

1. Create an invoice, choose the customer (buyer NTN/registration type/province auto-fill),
   and set per-line **HS Code**, **UoM** and **Sale Type** (required by FBR).
2. **Approve** or **Send** the invoice (FBR submission requires a non-draft status).
3. **Validate with FBR** (clipboard icon) — a dry run against `validateinvoicedata`; reports
   any errors without submitting.
4. **Submit to FBR** (paper-plane icon) — posts to `postinvoicedata`. On success the invoice
   stores the FBR **invoice number** (`fbr_usin`), status flips to *Submitted* (green `FBR`
   badge), and printing the invoice renders the FBR QR block.

Failures store the FBR error message on the invoice (red `FBR!` badge, shown in the list).

---

## 4. Sandbox scenarios

In sandbox, every invoice must carry a **scenario ID** matching your business activity.
Common ones (full list in the PRAL spec §9–10):

| Scenario | Description |
|----------|-------------|
| SN001 | Goods at standard rate to **registered** buyers |
| SN002 | Goods at standard rate to **unregistered** buyers |
| SN005 | Reduced-rate sale |
| SN006 | Exempt goods sale |
| SN007 | Zero-rated sale |
| SN008 | Sale of 3rd-schedule goods |
| SN026–SN028 | Sale to end consumer by retailers (retailer profile only) |

Set a company-wide default (Company Settings) or override per invoice (FBR Scenario ID field,
shown only in sandbox mode). Scenario ID is **not** sent in production.

---

## 5. API endpoints used

Configurable via env (`FBR_DI_BASE`, `FBR_PDI_BASE`, `FBR_DIST_BASE`, `FBR_TIMEOUT_MS`);
defaults are the live PRAL hosts.

| Purpose | Method | Endpoint |
|---------|--------|----------|
| Submit invoice (prod / sandbox) | POST | `/di_data/v1/di/postinvoicedata` / `…_sb` |
| Validate invoice (prod / sandbox) | POST | `/di_data/v1/di/validateinvoicedata` / `…_sb` |
| Provinces | GET | `/pdi/v1/provinces` |
| Document types | GET | `/pdi/v1/doctypecode` |
| HS codes | GET | `/pdi/v1/itemdesccode` |
| Unit of Measure | GET | `/pdi/v1/uom` |
| SRO items | GET | `/pdi/v1/sroitemcode` |
| Transaction types | GET | `/pdi/v1/transtypecode` |
| Buyer registration type | POST | `/dist/v1/Get_Reg_Type` |

All requests carry `Authorization: Bearer <security token>`.

---

## 6. Going live

1. Complete sandbox testing for every scenario your business uses.
2. Obtain the **production** security token from PRAL.
3. In Company Settings, switch **Mode → Production**, paste the production token, save.
4. Re-run **Test Connection**. Invoices now post to the live `postinvoicedata` endpoint and
   the scenario ID is omitted automatically.

---

## 7. Data model (migration `052_fbr_digital_invoicing.sql`)

- `companies`: `fbr_security_token_enc`, `fbr_seller_business_name/province/address`,
  `fbr_business_activity`, `fbr_sector`, `fbr_default_scenario_id` (+ existing
  `fbr_enabled`, `fbr_sandbox_mode`, `fbr_ntn`).
- `invoices`: `buyer_ntn`, `buyer_cnic`, `buyer_business_name`, `buyer_province`,
  `buyer_registration_type`, `fbr_scenario_id`, `fbr_invoice_type`, `fbr_usin` (FBR invoice
  number), `fbr_qr_url`, `fbr_submission_status`, `fbr_submitted_at`, `fbr_error`,
  `fbr_response_json`.
- `invoice_line_items`: `hs_code`, `uom`, `sale_type`, `rate_desc`, `sro_schedule_no`,
  `sro_item_serial_no`, `fixed_notified_value`, `sales_tax_withheld`, `extra_tax`,
  `further_tax`, `fed_payable`.
- `products`: `hs_code`, `fbr_sale_type`, `fbr_uom`.
- `customers`: `ntn`, `cnic`, `province`, `registration_type`.
- `fbr_reference_data`: cached FBR reference lists per company.
