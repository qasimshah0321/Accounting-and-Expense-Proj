import urllib.request, urllib.error, json, ssl, sys

BASE = 'https://candydada.com/api/v1'
ctx = ssl._create_unverified_context()

def api(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=20) as resp:
            return json.loads(resp.read()), resp.status
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read()), e.code
        except: return {'error': str(e)}, e.code

def p(msg): print(msg, flush=True)

p('='*50)
p('COMPLETE ERP FLOW TEST')
p('='*50)

# 1. Login admin
p('\n[1] LOGIN ADMIN')
res, code = api('POST', '/auth/login', {'email': 'm.bilal@gmail.com', 'password': 'Test123@'})
if code != 200: p('FAIL: ' + json.dumps(res)); sys.exit(1)
admin_token = res['data']['token']
admin_user = res['data']['user']
p(f"    {admin_user['username']} | role: {admin_user['role']} | OK")

# 2. Login customer
p('\n[2] LOGIN CUSTOMER')
res, code = api('POST', '/auth/login', {'email': 'cust1@gmail.com', 'password': 'Test123@'})
if code != 200: p('FAIL: ' + json.dumps(res)); sys.exit(1)
cust_token = res['data']['token']
cust_user = res['data']['user']
linked_id = cust_user.get('linked_customer_id')
p(f"    {cust_user['username']} | role: {cust_user['role']} | linked_customer_id: {linked_id or 'NONE'}")

# 3. Get products
p('\n[3] GET PRODUCTS')
res, code = api('GET', '/products?limit=10', token=admin_token)
prods = res.get('data', {}).get('products', [])
p(f'    Found {len(prods)} products')
for p_ in prods[:3]:
    p(f"    - {p_['name']} | SKU:{p_['sku']} | stock:{p_.get('current_stock',0)} | sell:{p_.get('selling_price',0)} | target:{p_.get('target_price',0)}")
if len(prods) < 2: p('Need at least 2 products'); sys.exit(1)
prod1, prod2 = prods[0], prods[1]

# 4. Adjust inventory +10 for prod1
p(f"\n[4] ADJUST INVENTORY +10 for {prod1['name']}")
res, code = api('POST', f"/products/{prod1['id']}/adjust-stock",
                {'quantity': 10, 'reason': 'Initial stock adjustment'}, admin_token)
bal = res.get('data', {}).get('balance_after', '?')
p(f'    Status:{code} | balance_after:{bal} | msg:{res.get("message","")}')

# 5. Adjust inventory +10 for prod2
p(f"\n[5] ADJUST INVENTORY +10 for {prod2['name']}")
res, code = api('POST', f"/products/{prod2['id']}/adjust-stock",
                {'quantity': 10, 'reason': 'Initial stock adjustment'}, admin_token)
bal2 = res.get('data', {}).get('balance_after', '?')
p(f'    Status:{code} | balance_after:{bal2} | msg:{res.get("message","")}')

# Get stock before order
res1, _ = api('GET', f"/products/{prod1['id']}", token=admin_token)
res2, _ = api('GET', f"/products/{prod2['id']}", token=admin_token)
stock1_before = res1.get('data', {}).get('current_stock', '?')
stock2_before = res2.get('data', {}).get('current_stock', '?')
p(f"    Stock now: {prod1['name']}={stock1_before} | {prod2['name']}={stock2_before}")

# 6. Get customer
p('\n[6] GET CUSTOMER')
res, code = api('GET', '/customers?limit=200', token=admin_token)
customers = res.get('data', {}).get('customers', [])
if linked_id:
    cust = next((c for c in customers if c['id'] == linked_id), None)
    if not cust: cust = customers[0] if customers else None
else:
    cust = customers[0] if customers else None
if not cust: p('No customer found'); sys.exit(1)
p(f"    Using: {cust['name']} | id: {cust['id']}")

# 7. Create sales order (customer) - 2 each
today = __import__('datetime').date.today().isoformat()
p(f"\n[7] CREATE SALES ORDER (customer token) - 2x {prod1['name']}, 2x {prod2['name']}")
so_body = {
    'customer_id': cust['id'],
    'order_date': today,
    'line_items': [
        {'sku': prod1['sku'], 'description': prod1['name'], 'ordered_qty': 2,
         'rate': float(prod1.get('selling_price', 0)), 'tax_rate': 0, 'tax_amount': 0},
        {'sku': prod2['sku'], 'description': prod2['name'], 'ordered_qty': 2,
         'rate': float(prod2.get('selling_price', 0)), 'tax_rate': 0, 'tax_amount': 0}
    ]
}
res, code = api('POST', '/sales-orders', so_body, cust_token)
if code not in (200, 201): p(f'FAIL ({code}): ' + json.dumps(res)); sys.exit(1)
so = res['data']
p(f"    Created: {so.get('sales_order_no') or so.get('order_no','auto')} | id:{so['id']} | status:{so['status']}")

# 8. Confirm order (admin)
p('\n[8] CONFIRM ORDER (admin)')
res, code = api('PATCH', f"/sales-orders/{so['id']}/status", {'status': 'confirmed'}, admin_token)
p(f"    Status:{code} | order status:{res.get('data',{}).get('status','?')} | msg:{res.get('message','')}")

# 9. Create delivery note
p('\n[9] CREATE DELIVERY NOTE')
res, code = api('GET', f"/sales-orders/{so['id']}", token=admin_token)
full_so = res.get('data') or res
line_items = full_so.get('line_items') or []
dn_lines = []
for li in line_items:
    qty = float(li.get('ordered_qty', 0)) - float(li.get('delivered_qty', 0) or 0)
    if qty > 0:
        dn_lines.append({'sales_order_line_item_id': li['id'], 'shipped_qty': qty})
p(f'    DN lines: {dn_lines}')
res, code = api('POST', f"/sales-orders/{so['id']}/convert-to-delivery-note",
                {'delivery_date': today, 'line_items': dn_lines}, admin_token)
if code not in (200, 201): p(f'FAIL ({code}): ' + json.dumps(res)); sys.exit(1)
dn = res['data']
p(f"    DN: {dn.get('delivery_note_no','?')} | id:{dn['id']} | status:{dn['status']}")

# 10. Approve delivery note
p('\n[10] APPROVE DELIVERY NOTE')
res, code = api('PATCH', f"/delivery-notes/{dn['id']}/status", {'status': 'accepted'}, admin_token)
p(f"    Status:{code} | DN status:{res.get('data',{}).get('status','?')} | msg:{res.get('message','')}")
if code != 200: p('    Response: ' + json.dumps(res)[:300])

# 11. Stock check after DN approval
p('\n[11] STOCK AFTER DELIVERY NOTE APPROVAL')
res1, _ = api('GET', f"/products/{prod1['id']}", token=admin_token)
res2, _ = api('GET', f"/products/{prod2['id']}", token=admin_token)
stock1_after = res1.get('data', {}).get('current_stock', '?')
stock2_after = res2.get('data', {}).get('current_stock', '?')
p(f"    {prod1['name']}: {stock1_before} -> {stock1_after}  (shipped 2)")
p(f"    {prod2['name']}: {stock2_before} -> {stock2_after}  (shipped 2)")
try:
    if float(stock1_after) < float(stock1_before) and float(stock2_after) < float(stock2_before):
        p('    STOCK REDUCED: YES - inventory deducted correctly')
    else:
        p('    STOCK REDUCED: NO - DN approval may not be deducting stock')
except: p('    Could not compare stock values')

# 12. Create invoice from DN
p('\n[12] CREATE INVOICE FROM DELIVERY NOTE')
res, code = api('POST', f"/delivery-notes/{dn['id']}/convert-to-invoice",
                {'invoice_date': today}, admin_token)
inv = res.get('data')
if code not in (200, 201) or not inv:
    p(f'    FAIL ({code}): ' + json.dumps(res)[:300])
    inv = None
else:
    total = inv.get('grand_total') or inv.get('total_amount', '?')
    p(f"    Invoice: {inv.get('invoice_no','?')} | id:{inv['id']} | status:{inv['status']} | total:{total}")

# 13. Approve invoice
if inv:
    p('\n[13] APPROVE INVOICE')
    res, code = api('PATCH', f"/invoices/{inv['id']}/status", {'status': 'approved'}, admin_token)
    p(f"    Status:{code} | Invoice status:{res.get('data',{}).get('status','?')} | msg:{res.get('message','')}")
    if code != 200: p('    Response: ' + json.dumps(res)[:300])

p('\n' + '='*50)
p('FLOW COMPLETE')
p('='*50)
