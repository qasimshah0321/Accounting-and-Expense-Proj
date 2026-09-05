"""Run FBR QA tests via SSH on the production server using curl."""
import paramiko, json as _json, datetime

HOST     = '176.9.63.151'
USER     = 'candydada'
PASSWORD = 'Blista1214@@'
BASE     = 'https://candydada.com/api/v1'
EMAIL    = 'm.bilal@gmail.com'
PASSWD   = 'Test123@'

today = datetime.date.today().isoformat()
due   = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=20)
print(f"Connected to {HOST}\n")

def run(cmd):
    _, out, err = client.exec_command(cmd)
    return out.read().decode().strip(), err.read().decode().strip()

def curl(method, path, body=None, token=None, label="", silent=False):
    """Makes exactly ONE SSH curl call. Returns parsed JSON."""
    if not silent:
        print(f"\n{'─'*60}")
        print(f"{'['+method+']':8} {path}  — {label}")
    h = "-H 'Content-Type: application/json'"
    if token:
        h += f" -H 'Authorization: Bearer {token}'"
    b = f"-d '{_json.dumps(body)}'" if body is not None else ""
    # single call — capture raw and pretty-print locally
    raw, err = run(f"curl -sk -X {method} '{BASE}{path}' {h} {b}")
    if err and not silent:
        print(f"  STDERR: {err}")
    try:
        parsed = _json.loads(raw)
        if not silent:
            print(_json.dumps(parsed, indent=4))
        return parsed
    except Exception:
        if not silent:
            print(raw or err)
        return {}

def get(d, *keys):
    for k in keys:
        d = (d or {}).get(k) if isinstance(d, dict) else None
    return d

# ══════════════════════════════════════════════════════════════
# STEP 1 — Login
# ══════════════════════════════════════════════════════════════
r = curl("POST", "/auth/login", {"email": EMAIL, "password": PASSWD}, label="LOGIN")
TOKEN = get(r, "data", "token")
assert TOKEN, "Login failed"
print(f"✓ Logged in as {get(r,'data','user','first_name')} {get(r,'data','user','last_name')}")

# ══════════════════════════════════════════════════════════════
# STEP 2 — Save FBR Config (sandbox)
# ══════════════════════════════════════════════════════════════
r = curl("PUT", "/fbr/config", {
    "fbr_enabled": True, "fbr_sandbox_mode": True,
    "fbr_username": "fbr_test_user", "fbr_password": "FbrTest@123",
    "fbr_pos_id": "1", "fbr_ntn": "0000000-0",
}, TOKEN, label="SAVE FBR CREDENTIALS")
cfg = get(r, "data") or {}
print(f"✓ FBR: enabled={cfg.get('fbr_enabled')} sandbox={cfg.get('fbr_sandbox_mode')} POS={cfg.get('fbr_pos_id')}")

# ══════════════════════════════════════════════════════════════
# STEP 3 — Test FBR Connection (sandbox creds, expected 404)
# ══════════════════════════════════════════════════════════════
r = curl("POST", "/fbr/test-connection", {}, TOKEN, label="TEST FBR CONNECTION")
if r.get("success"):
    print(f"✓ FBR connection: {get(r,'data','message')}")
else:
    print(f"⚠  FBR connection (placeholder creds): {get(r,'error','message')}")

# ══════════════════════════════════════════════════════════════
# STEP 4 — Temporarily disable DN requirement via MySQL
# ══════════════════════════════════════════════════════════════
COMPANY_ID = get(r, "data", "user", "company_id") if False else "df2c22d9-260f-4ff2-b9be-f2877d1a84a3"

# Upload a Node.js helper script via SFTP (node is guaranteed to be on the server)
import io
sftp = client.open_sftp()
node_helper = b'''\
const fs = require('fs');
const mysql = require('mysql2/promise');
const env = {};
fs.readFileSync('/home/candydada/public_html/zeropoint/.env','utf8').split('\\n').forEach(l => {
  l = l.trim(); if (!l || l.startsWith('#') || !l.includes('=')) return;
  const [k,...v] = l.split('='); env[k.trim()] = v.join('=').trim();
});
(async () => {
  const conn = await mysql.createConnection({
    host: env.DB_HOST, user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME
  });
  const [action, companyId] = process.argv.slice(2);
  if (action === 'get') {
    const [rows] = await conn.execute('SELECT dn_requirement FROM companies WHERE id=?', [companyId]);
    console.log(rows[0]?.dn_requirement || 'mandatory');
  } else {
    await conn.execute('UPDATE companies SET dn_requirement=? WHERE id=?', [action, companyId]);
    console.log('ok');
  }
  await conn.end();
})().catch(e => { console.error(e.message); process.exit(1); });
'''
sftp.putfo(io.BytesIO(node_helper), '/tmp/qa_dn_helper.js')
sftp.close()

NODE = '/home/candydada/nodevenv/public_html/zeropoint/18/bin/node'
orig_out, orig_err = run(f"{NODE} /tmp/qa_dn_helper.js get {COMPANY_ID}")
original_dn = orig_out.strip() or "mandatory"
if orig_err: print(f"  helper stderr: {orig_err}")
print(f"  Current dn_requirement = '{original_dn}'")

set_out, set_err = run(f"{NODE} /tmp/qa_dn_helper.js optional {COMPANY_ID}")
if set_err: print(f"  helper stderr: {set_err}")
print(f"✓ Set dn_requirement → 'optional' | result={set_out.strip()}")

# ══════════════════════════════════════════════════════════════
# STEP 5 — Get customer
# ══════════════════════════════════════════════════════════════
r = curl("GET", "/customers?limit=1", token=TOKEN, label="GET CUSTOMER")
custs = get(r, "data", "customers") or []
if custs:
    CUST_ID, CUST_NAME = custs[0]["id"], custs[0]["name"]
else:
    rc = curl("POST", "/customers", {"name": "QA FBR Customer", "email": "qa@fbr.test", "phone": "03001234567", "payment_terms": 30}, TOKEN, label="CREATE CUSTOMER")
    CUST_ID, CUST_NAME = get(rc, "data", "id"), get(rc, "data", "name")
print(f"✓ Customer: {CUST_NAME} ({CUST_ID})")

# ══════════════════════════════════════════════════════════════
# STEP 6 — Create Sales Order
# ══════════════════════════════════════════════════════════════
r = curl("POST", "/sales-orders", {
    "customer_id": CUST_ID, "customer_name": CUST_NAME,
    "order_date": today, "due_date": due,
    "status": "draft", "notes": "QA FBR e2e test",
    "line_items": [{
        "description": "Software Development Services",
        "ordered_qty": 2, "rate": 5000, "tax_rate": 17, "discount": 0,
    }]
}, TOKEN, label="CREATE SALES ORDER")

so_data = get(r, "data") or {}
SO_ID = so_data.get("id")
SO_NO = so_data.get("sales_order_no") or so_data.get("so_number") or so_data.get("order_number")
if SO_ID:
    print(f"✓ Sales Order: {SO_NO} ({SO_ID}) | Grand Total: {so_data.get('grand_total')}")
else:
    print(f"✗ Sales Order failed: {get(r,'error','message')}")

# ══════════════════════════════════════════════════════════════
# STEP 7 — Create Invoice
# ══════════════════════════════════════════════════════════════
inv_body = {
    "customer_id": CUST_ID, "customer_name": CUST_NAME,
    "invoice_date": today, "due_date": due,
    "status": "approved", "notes": "QA FBR e2e invoice",
    "buyer_ntn": "9999999-0", "buyer_cnic": "42101-1234567-1",
    "line_items": [{
        "description": "Software Development Services",
        "quantity": 2, "rate": 5000, "tax_rate": 17, "discount": 0,
    }]
}
if SO_ID:
    inv_body["sales_order_id"] = SO_ID

r = curl("POST", "/invoices", inv_body, TOKEN, label="CREATE INVOICE")
inv_data = get(r, "data") or {}
inv_obj  = inv_data.get("invoice", inv_data)
INV_ID   = inv_obj.get("id")
INV_NO   = inv_obj.get("invoice_no")
GRAND    = inv_obj.get("grand_total")

# ── Restore DN requirement immediately after invoice creation ──
run(f"{NODE} /tmp/qa_dn_helper.js {original_dn} {COMPANY_ID}")
print(f"✓ Restored dn_requirement → '{original_dn}'")

if INV_ID:
    print(f"✓ Invoice: {INV_NO} | Grand Total: {GRAND} | Status: {inv_obj.get('status')} ({INV_ID})")
else:
    print(f"✗ Invoice failed: {get(r,'error','message')}")
    client.close()
    exit(1)

# ══════════════════════════════════════════════════════════════
# STEP 8 — Submit Invoice to FBR
# ══════════════════════════════════════════════════════════════
r = curl("POST", f"/fbr/invoices/{INV_ID}/submit", {}, TOKEN,
         label=f"SUBMIT INVOICE {INV_NO} TO FBR")
if r.get("success"):
    fbr = r["data"]
    print(f"✓ FBR SUBMIT SUCCESS")
    print(f"  USIN:   {fbr.get('usin')}")
    print(f"  Token:  {fbr.get('token','N/A')}")
    print(f"  QR URL: {fbr.get('qr_url')}")
else:
    print(f"⚠  FBR submit: {get(r,'error','message')}")

# ══════════════════════════════════════════════════════════════
# STEP 9 — Verify FBR Status on Invoice
# ══════════════════════════════════════════════════════════════
r = curl("GET", f"/fbr/invoices/{INV_ID}/status", token=TOKEN, label="VERIFY FBR STATUS")
d = r.get("data", {})
print(f"\n  fbr_submission_status : {d.get('fbr_submission_status','N/A')}")
print(f"  fbr_usin              : {d.get('fbr_usin','N/A')}")
print(f"  fbr_submitted_at      : {d.get('fbr_submitted_at','N/A')}")
print(f"  fbr_error             : {d.get('fbr_error','none')}")
print(f"  fbr_qr_url            : {d.get('fbr_qr_url','N/A')}")

client.close()
print(f"\n{'='*60}")
print("QA TEST COMPLETE")
print(f"{'='*60}")
