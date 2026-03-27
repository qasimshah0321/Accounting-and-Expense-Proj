const http = require('http');

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? {'Authorization': 'Bearer ' + token} : {})
      }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ json: JSON.parse(d), status: res.statusCode }); }
        catch(e) { resolve({ json: d, status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Login admin
  let r = await api('POST', '/auth/login', {email: 'm.bilal@gmail.com', password: 'Test123@'});
  if (r.status !== 200) { console.log('Admin login FAIL:', JSON.stringify(r.json)); process.exit(1); }
  const adminToken = r.json.data.token;
  const adminUser = r.json.data.user;
  console.log('[1] Admin login OK:', adminUser.username, '| role:', adminUser.role);

  // 2. Login customer
  r = await api('POST', '/auth/login', {email: 'cust1@gmail.com', password: 'Test123@'});
  if (r.status !== 200) { console.log('Customer login FAIL:', JSON.stringify(r.json)); process.exit(1); }
  const custToken = r.json.data.token;
  const custUser = r.json.data.user;
  console.log('[2] Customer login OK:', custUser.username, '| role:', custUser.role, '| linked_customer_id:', custUser.linked_customer_id || 'NONE');

  // 3. Get products
  r = await api('GET', '/products?limit=10', null, adminToken);
  const prods = r.json.data && r.json.data.products ? r.json.data.products : [];
  console.log('\n[3] Products found:', prods.length);
  prods.slice(0,5).forEach(p => console.log('   -', p.name, '| SKU:', p.sku, '| stock:', p.current_stock, '| sell:', p.selling_price, '| target:', p.target_price));

  const prod1 = prods[0];
  const prod2 = prods[1];
  if (!prod1 || !prod2) { console.log('Need at least 2 products'); process.exit(1); }

  // 4. Adjust inventory +10 for prod1
  console.log('\n[4] Adjust inventory +10 for:', prod1.name);
  r = await api('POST', '/products/' + prod1.id + '/adjust-stock', {quantity: 10, reason: 'Initial stock adjustment'}, adminToken);
  console.log('    Status:', r.status, '| balance_after:', r.json.data ? r.json.data.balance_after : r.json.message);

  // 5. Adjust inventory +10 for prod2
  console.log('[5] Adjust inventory +10 for:', prod2.name);
  r = await api('POST', '/products/' + prod2.id + '/adjust-stock', {quantity: 10, reason: 'Initial stock adjustment'}, adminToken);
  console.log('    Status:', r.status, '| balance_after:', r.json.data ? r.json.data.balance_after : r.json.message);

  // Check stock
  r = await api('GET', '/products/' + prod1.id, null, adminToken);
  const stock1Before = r.json.data ? r.json.data.current_stock : '?';
  r = await api('GET', '/products/' + prod2.id, null, adminToken);
  const stock2Before = r.json.data ? r.json.data.current_stock : '?';
  console.log('    Prod1 stock now:', stock1Before, '| Prod2 stock now:', stock2Before);

  // 6. Get customers
  r = await api('GET', '/customers?limit=200', null, adminToken);
  const customers = r.json.data && r.json.data.customers ? r.json.data.customers : [];
  let linkedCust = custUser.linked_customer_id ? customers.find(c => c.id === custUser.linked_customer_id) : null;
  if (!linkedCust) linkedCust = customers[0];
  if (!linkedCust) { console.log('No customer found'); process.exit(1); }
  console.log('\n[6] Using customer:', linkedCust.name, '| id:', linkedCust.id);

  // 7. Create sales order (customer token, 2 qty each)
  console.log('\n[7] Create Sales Order (customer) - 2x prod1, 2x prod2');
  r = await api('POST', '/sales-orders', {
    customer_id: linkedCust.id,
    order_date: today,
    line_items: [
      { sku: prod1.sku, description: prod1.name, ordered_qty: 2, rate: Number(prod1.selling_price) || 0, tax_rate: 0, tax_amount: 0 },
      { sku: prod2.sku, description: prod2.name, ordered_qty: 2, rate: Number(prod2.selling_price) || 0, tax_rate: 0, tax_amount: 0 }
    ]
  }, custToken);
  console.log('    Status:', r.status);
  if (r.status !== 201 && r.status !== 200) { console.log('    FAIL:', JSON.stringify(r.json)); process.exit(1); }
  const so = r.json.data;
  console.log('    SO created | id:', so.id, '| no:', so.sales_order_no || so.order_no || 'auto', '| status:', so.status);

  // 8. Confirm order (admin)
  console.log('\n[8] Confirm Sales Order (admin)');
  r = await api('PATCH', '/sales-orders/' + so.id + '/status', {status: 'confirmed'}, adminToken);
  console.log('    Status:', r.status, '| order status:', r.json.data ? r.json.data.status : r.json.message);

  // 9. Create delivery note from SO
  console.log('\n[9] Create Delivery Note from SO');
  r = await api('GET', '/sales-orders/' + so.id, null, adminToken);
  const fullSO = r.json.data || r.json;
  const dnLineItems = (fullSO.line_items || []).map(li => ({
    sales_order_line_item_id: li.id,
    shipped_qty: parseFloat(li.ordered_qty) - parseFloat(li.delivered_qty || 0)
  })).filter(li => li.shipped_qty > 0);
  console.log('    DN line items:', JSON.stringify(dnLineItems));

  r = await api('POST', '/sales-orders/' + so.id + '/convert-to-delivery-note', {
    delivery_date: today,
    line_items: dnLineItems
  }, adminToken);
  console.log('    Status:', r.status);
  if (r.status !== 201 && r.status !== 200) { console.log('    FAIL:', JSON.stringify(r.json)); process.exit(1); }
  const dn = r.json.data;
  console.log('    DN created | id:', dn.id, '| no:', dn.delivery_note_no, '| status:', dn.status);

  // 10. Approve delivery note
  console.log('\n[10] Approve Delivery Note');
  r = await api('PATCH', '/delivery-notes/' + dn.id + '/status', {status: 'accepted'}, adminToken);
  console.log('     Status:', r.status, '| DN status:', r.json.data ? r.json.data.status : r.json.message);
  if (r.status !== 200) console.log('     Detail:', JSON.stringify(r.json));

  // 11. Check stock AFTER delivery note approval
  console.log('\n[11] Stock after Delivery Note approval');
  r = await api('GET', '/products/' + prod1.id, null, adminToken);
  const stock1After = r.json.data ? r.json.data.current_stock : '?';
  r = await api('GET', '/products/' + prod2.id, null, adminToken);
  const stock2After = r.json.data ? r.json.data.current_stock : '?';
  console.log('     Prod1:', stock1Before, '->', stock1After, '(shipped 2, expected -2)');
  console.log('     Prod2:', stock2Before, '->', stock2After, '(shipped 2, expected -2)');
  const reduced = Number(stock1After) < Number(stock1Before) && Number(stock2After) < Number(stock2Before);
  console.log('     Stock reduced:', reduced ? 'YES' : 'NO - check delivery note approval logic');

  // 12. Create invoice from delivery note
  console.log('\n[12] Create Invoice from Delivery Note');
  r = await api('POST', '/delivery-notes/' + dn.id + '/convert-to-invoice', {invoice_date: today}, adminToken);
  console.log('     Status:', r.status);
  let inv = null;
  if (r.status === 201 || r.status === 200) {
    inv = r.json.data;
    console.log('     Invoice created | id:', inv.id, '| no:', inv.invoice_no, '| status:', inv.status, '| total:', inv.grand_total || inv.total_amount);
  } else {
    console.log('     FAIL:', JSON.stringify(r.json));
  }

  // 13. Approve invoice
  if (inv && inv.id) {
    console.log('\n[13] Approve Invoice');
    r = await api('PATCH', '/invoices/' + inv.id + '/status', {status: 'approved'}, adminToken);
    console.log('     Status:', r.status, '| Invoice status:', r.json.data ? r.json.data.status : r.json.message);
    if (r.status !== 200) console.log('     Detail:', JSON.stringify(r.json));
  }

  console.log('\n========================================');
  console.log('COMPLETE FLOW FINISHED');
  console.log('========================================');
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
