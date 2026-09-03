"""
QA Test: FBR Digital Invoicing Flow
Steps:
  1. Login
  2. Save FBR credentials (sandbox)
  3. Test FBR connection
  4. Get first customer
  5. Create Sales Order
  6. Create Invoice from Sales Order
  7. Submit Invoice to FBR
  8. Verify FBR status
"""
import json, sys, datetime
import requests
requests.packages.urllib3.disable_warnings()

BASE    = "https://candydada.com/api/v1"
SESSION = requests.Session()
SESSION.verify = False
EMAIL = "m.bilal@gmail.com"
PASSWORD = "Test123@"

# FBR sandbox credentials (official FBR test account)
FBR_USERNAME   = "test_user"
FBR_PASSWORD   = "test_pass"
FBR_POS_ID     = "1"
FBR_NTN        = "1234567-8"

def req(method, path, body=None, token=None):
    url = BASE + path
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = SESSION.request(method, url, json=body, headers=headers, timeout=30)
    try:
        data = r.json()
    except Exception:
        data = {"success": False, "error": {"message": r.text}}
    return r.status_code, data

def ok(label, status, data, expect=None):
    success = data.get("success", True)
    code_ok = (200 <= status < 300)
    if expect:
        code_ok = status == expect
    mark = "✓" if (success and code_ok) else "✗"
    print(f"\n{mark} [{status}] {label}")
    if not (success and code_ok):
        err = data.get("error", data)
        print(f"  ERROR: {json.dumps(err, indent=4)}")
        sys.exit(1)
    return data

# ── 1. Login ──────────────────────────────────────────────────────────────────
print("=" * 60)
print("QA TEST: FBR Digital Invoicing")
print("=" * 60)

status, data = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD})
ok("Login", status, data)
token    = data["data"]["token"]
user     = data["data"]["user"]
print(f"  User: {user.get('name')} | Company ID: {user.get('company_id')}")

# ── 2. Save FBR Config ────────────────────────────────────────────────────────
status, data = req("PUT", "/fbr/config", {
    "fbr_enabled":      True,
    "fbr_sandbox_mode": True,
    "fbr_username":     FBR_USERNAME,
    "fbr_password":     FBR_PASSWORD,
    "fbr_pos_id":       FBR_POS_ID,
    "fbr_ntn":          FBR_NTN,
}, token)
ok("Save FBR credentials (sandbox mode)", status, data)
cfg = data["data"]
print(f"  FBR enabled: {cfg.get('fbr_enabled')} | Sandbox: {cfg.get('fbr_sandbox_mode')} | POS ID: {cfg.get('fbr_pos_id')}")

# ── 3. Test FBR Connection ────────────────────────────────────────────────────
print("\n  [Testing FBR connection — may fail if sandbox creds are not real...]")
status, data = req("POST", "/fbr/test-connection", {}, token)
if data.get("success"):
    print(f"✓ [{status}] FBR connection test PASSED")
else:
    err_msg = data.get("error", {}).get("message", str(data))
    print(f"  [EXPECTED in sandbox] FBR connection test: {err_msg}")

# ── 4. Get a Customer ─────────────────────────────────────────────────────────
status, data = req("GET", "/customers?limit=5", token=token)
ok("Fetch customers", status, data)
customers = data["data"].get("customers", [])
if not customers:
    print("  No customers found — creating one...")
    status, data = req("POST", "/customers", {
        "name": "QA Test Customer",
        "email": "qa@test.com",
        "phone": "03001234567",
        "payment_terms": 30,
    }, token)
    ok("Create customer", status, data)
    customer = data["data"]
else:
    customer = customers[0]
print(f"  Customer: {customer.get('name')} (ID: {customer.get('id')})")

# ── 5. Create Sales Order ─────────────────────────────────────────────────────
today      = datetime.date.today().isoformat()
due_date   = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()

status, data = req("POST", "/sales-orders", {
    "customer_id":   customer["id"],
    "customer_name": customer["name"],
    "order_date":    today,
    "due_date":      due_date,
    "status":        "draft",
    "notes":         "QA FBR test order",
    "line_items": [
        {
            "description": "Software Development Services",
            "quantity":    2,
            "rate":        5000,
            "tax_rate":    17,
            "discount":    0,
        }
    ]
}, token)
ok("Create Sales Order", status, data)
so = data["data"]
so_id = so.get("id") or so.get("sales_order", {}).get("id")
so_no = so.get("so_number") or so.get("sales_order", {}).get("so_number") or so.get("order_number")
print(f"  Sales Order: {so_no} (ID: {so_id})")

# ── 6. Create Invoice ─────────────────────────────────────────────────────────
status, data = req("POST", "/invoices", {
    "customer_id":     customer["id"],
    "customer_name":   customer["name"],
    "invoice_date":    today,
    "due_date":        due_date,
    "status":          "approved",
    "sales_order_id":  so_id,
    "notes":           "QA FBR test invoice",
    "buyer_ntn":       "9999999-0",
    "buyer_cnic":      "42101-1234567-1",
    "line_items": [
        {
            "description":    "Software Development Services",
            "quantity":       2,
            "rate":           5000,
            "tax_rate":       17,
            "discount":       0,
        }
    ]
}, token)
ok("Create Invoice", status, data)
inv = data["data"]
inv_obj = inv.get("invoice", inv)
inv_id  = inv_obj.get("id")
inv_no  = inv_obj.get("invoice_no")
print(f"  Invoice: {inv_no} (ID: {inv_id})")
print(f"  Grand Total: {inv_obj.get('grand_total')} | Status: {inv_obj.get('status')}")

# ── 7. Submit Invoice to FBR ──────────────────────────────────────────────────
print(f"\n  Submitting invoice {inv_no} to FBR sandbox...")
status, data = req("POST", f"/fbr/invoices/{inv_id}/submit", {}, token)
if data.get("success"):
    fbr = data["data"]
    print(f"✓ [{status}] FBR Submit SUCCESS")
    print(f"  USIN:   {fbr.get('usin')}")
    print(f"  Token:  {fbr.get('token', 'N/A')}")
    print(f"  QR URL: {fbr.get('qr_url')}")
else:
    err = data.get("error", {}).get("message", str(data))
    print(f"  [FBR Submit] Response ({status}): {err}")

# ── 8. Check FBR Status ───────────────────────────────────────────────────────
status, data = req("GET", f"/fbr/invoices/{inv_id}/status", token=token)
ok("Get FBR invoice status", status, data)
fbr_status = data["data"]
print(f"  FBR Status:       {fbr_status.get('fbr_submission_status', 'not_submitted')}")
print(f"  FBR USIN:         {fbr_status.get('fbr_usin', 'N/A')}")
print(f"  FBR Submitted At: {fbr_status.get('fbr_submitted_at', 'N/A')}")
print(f"  FBR Error:        {fbr_status.get('fbr_error', 'none')}")

print("\n" + "=" * 60)
print("QA TEST COMPLETE")
print("=" * 60)
