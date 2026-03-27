import urllib.request, urllib.error, json, ssl, datetime

BASE = 'https://candydada.com/api/v1'
ctx = ssl._create_unverified_context()

def api(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read()), e.code
        except: return {'error': str(e)}, e.code

def p(msg): print(msg, flush=True)

res, _ = api('POST', '/auth/login', {'email': 'm.bilal@gmail.com', 'password': 'Test123@'})
admin_token = res['data']['token']
p('Admin logged in')

dn_id = 'f156b0c9-23b8-11f1-89d7-a8a159c11b27'  # DN-007 (reset to ready_to_ship)
prod1_id = 'cc9cfbcf-238f-11f1-89d7-a8a159c11b27'  # Aqua kiss
prod2_id = 'cc9f9427-238f-11f1-89d7-a8a159c11b27'  # Atomik balls
today = datetime.date.today().isoformat()
due = str(datetime.date.today() + datetime.timedelta(days=30))

# Stock before
r1, _ = api('GET', f'/products/{prod1_id}', token=admin_token)
r2, _ = api('GET', f'/products/{prod2_id}', token=admin_token)
s1b = r1.get('data',{}).get('current_stock','?')
s2b = r2.get('data',{}).get('current_stock','?')
p(f'Stock BEFORE: Aqua kiss={s1b} | Atomik balls={s2b}')

# Step 10: Ship DN (deducts stock via ship endpoint)
p('\n[10] SHIP DELIVERY NOTE (stock deduction)')
ship_body = {
    'shipment_date': today,
    'line_items': [
        {'delivery_note_line_item_id': 'f156fcf2-23b8-11f1-89d7-a8a159c11b27', 'shipped_qty': 2},
        {'delivery_note_line_item_id': 'f15712d6-23b8-11f1-89d7-a8a159c11b27', 'shipped_qty': 2},
    ]
}
res, code = api('POST', f'/delivery-notes/{dn_id}/ship', ship_body, admin_token)
p(f'    Status:{code} | msg:{res.get("message","")}')
if code not in (200,201): p('    FAIL: '+json.dumps(res)[:300])

# Step 11: Stock after
p('\n[11] STOCK AFTER SHIPPING (stock should be deducted)')
r1, _ = api('GET', f'/products/{prod1_id}', token=admin_token)
r2, _ = api('GET', f'/products/{prod2_id}', token=admin_token)
s1a = r1.get('data',{}).get('current_stock','?')
s2a = r2.get('data',{}).get('current_stock','?')
p(f'    Aqua kiss:    {s1b} -> {s1a}  (shipped 2)')
p(f'    Atomik balls: {s2b} -> {s2a}  (shipped 2)')
try:
    reduced = float(s1a) < float(s1b) and float(s2a) < float(s2b)
    p(f'    STOCK REDUCED: {"YES - inventory deducted correctly" if reduced else "NO - check ship logic"}')
except: pass

# Step 12: Create invoice from DN
p('\n[12] CREATE INVOICE FROM DN-007')
res, code = api('POST', f'/delivery-notes/{dn_id}/convert-to-invoice',
                {'invoice_date': today, 'due_date': due}, admin_token)
p(f'    Status:{code}')
inv = res.get('data')
if code not in (200, 201) or not inv:
    p('    FAIL: '+json.dumps(res)[:300])
else:
    total = inv.get('grand_total') or inv.get('total_amount','?')
    p(f"    Invoice: {inv.get('invoice_no','?')} | id:{inv['id']} | status:{inv['status']} | total:{total}")

    # Step 13: Approve invoice
    p('\n[13] APPROVE INVOICE')
    res, code = api('PATCH', f"/invoices/{inv['id']}/status", {'status':'approved'}, admin_token)
    p(f'    Status:{code} | status:{res.get("data",{}).get("status","?")} | msg:{res.get("message","")}')
    if code != 200: p('    '+json.dumps(res)[:300])

p('\n'+'='*50)
p('COMPLETE FLOW DONE')
p('='*50)
