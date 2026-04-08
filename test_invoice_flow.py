import paramiko, json, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('176.9.63.151', port=22, username='candydada', password='Blista1214@@', timeout=20)

def run(cmd):
    _, stdout, _ = client.exec_command(cmd)
    return stdout.read().decode().strip()

BASE = 'http://localhost:3001/api/v1'

# 1. Find a valid admin user
print('=== STEP 1: Find admin user ===')
r = run("mysql -u root -e \"SELECT email FROM zeropoint.users WHERE role='admin' LIMIT 3;\" 2>/dev/null || echo 'no mysql'")
print('DB users:', r[:200])

# Try common credentials
token = ''
for creds in [
    {'email':'admin@zeropoint.com','password':'Admin@123'},
    {'email':'admin@zeropoint.com','password':'admin123'},
    {'email':'admin@test.com','password':'admin123'},
]:
    payload = json.dumps(creds).replace('"', '\\"')
    r = run(f'curl -s -X POST {BASE}/auth/login -H "Content-Type: application/json" -d "{payload}"')
    try:
        data = json.loads(r)
        t = data.get('data',{}).get('token','')
        if t:
            token = t
            print(f'Logged in as {creds["email"]}')
            break
    except:
        pass

if not token:
    # Try getting any company and its users from DB
    r = run("curl -s http://localhost:3001/api/v1/auth/me 2>/dev/null | head -c 200")
    print('No token. Try:', r)
    client.close()
    exit(1)

H = f'Authorization: Bearer {token}'

# 2. Get a customer
print('\n=== STEP 2: Get customer ===')
r = run(f'curl -s "{BASE}/customers?limit=5" -H "{H}"')
custs = json.loads(r).get('data',{}).get('customers',[])
if not custs:
    print('No customers - creating one')
    payload = json.dumps({'name':'Test Customer','billing_address':'123 Test St'}).replace('"','\\"')
    r = run(f'curl -s -X POST {BASE}/customers -H "Content-Type: application/json" -H "{H}" -d "{payload}"')
    cust = json.loads(r).get('data',{})
else:
    cust = custs[0]
print(f'Customer: {cust["name"]} | ID: {cust["id"]}')
cust_id = cust['id']

# 3. Create Sales Order
print('\n=== STEP 3: Create Sales Order ===')
so_payload = {
    'customer_id': cust_id,
    'order_date': '2026-04-01',
    'due_date': '2026-04-30',
    'bill_to': cust.get('billing_address',''),
    'ship_to': cust.get('shipping_address',''),
    'line_items': [
        {'sku':'TEST-001','description':'Widget A','ordered_qty':10,'rate':50.00},
        {'sku':'TEST-002','description':'Widget B','ordered_qty':5,'rate':100.00}
    ]
}
payload = json.dumps(so_payload).replace("'", "\\'")
r = run(f"curl -s -X POST {BASE}/sales-orders -H 'Content-Type: application/json' -H '{H}' -d '{json.dumps(so_payload)}'")
so = json.loads(r).get('data',{})
so_id = so.get('id','')
print(f'Created SO: {so.get("sales_order_no","")} | ID: {so_id} | Status: {so.get("status","")}')
if not so_id:
    print('FAILED:', r[:400])
    client.close()
    exit(1)

# 4. Confirm SO
print('\n=== STEP 4: Confirm SO ===')
r = run(f"curl -s -X PATCH {BASE}/sales-orders/{so_id}/status -H 'Content-Type: application/json' -H '{H}' -d '{{\"status\":\"confirmed\"}}'")
so_data = json.loads(r).get('data',{})
print(f'Status after confirm: {so_data.get("status",r[:100])}')

# 5. Get full SO (line item IDs)
print('\n=== STEP 5: Get SO line items ===')
r = run(f'curl -s "{BASE}/sales-orders/{so_id}" -H "{H}"')
so_full = json.loads(r).get('data',{})
line_items = so_full.get('line_items',[])
print(f'Line items:')
for li in line_items:
    print(f'  {li["description"]}: ordered={li["ordered_qty"]} invoiced={li.get("invoiced_qty",0)} id={li["id"]}')

# 6. Create Full Invoice
print('\n=== STEP 6: Create Full Invoice ===')
r = run(f'curl -s "{BASE}/invoices/next-number" -H "{H}"')
inv_no = json.loads(r).get('data',{}).get('invoice_no','INV-TEST')

inv_payload = {
    'customer_id': cust_id,
    'invoice_date': '2026-04-01',
    'due_date': '2026-04-30',
    'bill_to': cust.get('billing_address',''),
    'ship_to': cust.get('shipping_address',''),
    'line_items': []
}
for li in line_items:
    ordered = float(li.get('ordered_qty',0))
    inv_payload['line_items'].append({
        'sku': li.get('sku',''),
        'description': li['description'],
        'quantity': ordered,
        'rate': float(li.get('rate',0)),
        'discount_per_item': 0,
        'tax_rate': 0,
        'tax_amount': 0,
        'sales_order_line_item_id': li['id']
    })

r = run(f"curl -s -X POST {BASE}/invoices -H 'Content-Type: application/json' -H '{H}' -d '{json.dumps(inv_payload)}'")
inv = json.loads(r).get('data',{})
inv_id = inv.get('id','')
print(f'Invoice created: {inv.get("invoice_no","")} | ID: {inv_id}')
if not inv_id:
    print('FAILED:', r[:400])
    client.close()
    exit(1)

# 7. Check SO status
print('\n=== STEP 7: Verify SO status ===')
time.sleep(1)
r = run(f'curl -s "{BASE}/sales-orders/{so_id}" -H "{H}"')
so_check = json.loads(r).get('data',{})
print(f'SO status after full invoice: {so_check.get("status","")}')
for li in so_check.get('line_items',[]):
    print(f'  {li["description"]}: ordered={li["ordered_qty"]} invoiced={li.get("invoiced_qty","N/A")}')

# 8. Check SO picker (should NOT appear)
print('\n=== STEP 8: Check SO picker for customer ===')
r = run(f'curl -s "{BASE}/sales-orders?customer_id={cust_id}&limit=200" -H "{H}"')
orders = json.loads(r).get('data',{}).get('sales_orders',json.loads(r).get('data',{}).get('orders',[]))
active = [o for o in orders if o.get('status') in ('confirmed','in_progress')]
print(f'Confirmed/in_progress SOs for customer: {len(active)}')
for o in active:
    print(f'  {o["sales_order_no"]} status={o["status"]}')
if len(active) == 0:
    print('PASS: SO not in picker (status=completed or filtered out)')
else:
    print('FAIL: SO still showing in picker')

print('\n=== TEST COMPLETE ===')
client.close()
