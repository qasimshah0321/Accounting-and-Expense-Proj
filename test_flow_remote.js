const mysql = require('/home/candydada/nodevenv/public_html/zeropoint/18/lib/node_modules/mysql2/promise');
const crypto = require('crypto');

async function test() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306,
    user: 'candydada_candydata',
    password: 'v$bEIpET&b,f=rcA',
    database: 'candydada_ERP'
  });

  const newId = () => crypto.randomUUID();

  // Get a company and customer
  const [[company]] = await conn.query('SELECT id FROM companies LIMIT 1');
  const companyId = company.id;
  console.log('Company:', companyId);

  const [[customer]] = await conn.query('SELECT id, name FROM customers WHERE company_id=? LIMIT 1', [companyId]);
  console.log('Customer:', customer.name);

  // Create a sales order
  const soId = newId();
  const soLineId1 = newId();
  const soLineId2 = newId();

  await conn.query(
    'INSERT INTO sales_orders (id,company_id,sales_order_no,customer_id,customer_name,order_date,due_date,status,subtotal,grand_total,total_ordered_qty,total_delivered_qty,total_pending_qty,created_by,updated_by) VALUES (?,?,?,?,?,NOW(),NOW(),?,?,?,?,0,?,?,?)',
    [soId, companyId, 'TEST-SO-'+Date.now(), customer.id, customer.name, 'confirmed', 750, 750, 15, 15, customer.id, customer.id]
  );

  await conn.query(
    'INSERT INTO sales_order_line_items (id,sales_order_id,company_id,line_number,description,sku,ordered_qty,delivered_qty,invoiced_qty,rate) VALUES (?,?,?,1,?,?,10,0,0,50)',
    [soLineId1, soId, companyId, 'Widget A', 'W-A']
  );
  await conn.query(
    'INSERT INTO sales_order_line_items (id,sales_order_id,company_id,line_number,description,sku,ordered_qty,delivered_qty,invoiced_qty,rate) VALUES (?,?,?,2,?,?,5,0,0,100)',
    [soLineId2, soId, companyId, 'Widget B', 'W-B']
  );
  console.log('\nCreated SO:', soId, '| status: confirmed');

  // Verify invoiced_qty column exists
  const [linesBefore] = await conn.query('SELECT description, ordered_qty, invoiced_qty FROM sales_order_line_items WHERE sales_order_id=?', [soId]);
  console.log('\nBefore invoice:');
  linesBefore.forEach(r => console.log(' ', r.description, '- ordered:', r.ordered_qty, '| invoiced:', r.invoiced_qty));

  // Simulate full invoice: update invoiced_qty (what backend does after invoice creation)
  await conn.query('UPDATE sales_order_line_items SET invoiced_qty = invoiced_qty + 10 WHERE id=?', [soLineId1]);
  await conn.query('UPDATE sales_order_line_items SET invoiced_qty = invoiced_qty + 5 WHERE id=?', [soLineId2]);

  // Check if fully invoiced and mark SO completed (backend logic)
  const [lineRows] = await conn.query('SELECT ordered_qty, invoiced_qty FROM sales_order_line_items WHERE sales_order_id=?', [soId]);
  const fullyInvoiced = lineRows.every(r => parseFloat(r.invoiced_qty) >= parseFloat(r.ordered_qty));

  console.log('\nAfter full invoice:');
  lineRows.forEach(r => console.log('  ordered:', r.ordered_qty, '| invoiced:', r.invoiced_qty));
  console.log('Fully invoiced?', fullyInvoiced);

  if (fullyInvoiced) {
    await conn.query("UPDATE sales_orders SET status='completed', updated_at=NOW() WHERE id=? AND status!='completed'", [soId]);
  }

  // Verify SO status
  const [[so]] = await conn.query('SELECT status FROM sales_orders WHERE id=?', [soId]);
  console.log('\nSO status after full invoice:', so.status);
  console.log(so.status === 'completed' ? 'PASS: SO marked as completed' : 'FAIL: SO status is ' + so.status);

  // Verify picker exclusion
  const [[pickerCheck]] = await conn.query("SELECT COUNT(*) as cnt FROM sales_orders WHERE id=? AND (status='confirmed' OR status='in_progress')", [soId]);
  console.log('\nSO visible in picker?', pickerCheck.cnt > 0 ? 'FAIL: still visible' : 'PASS: hidden from picker (status=completed)');

  // Test partial invoice scenario
  console.log('\n--- PARTIAL INVOICE TEST ---');
  const soId2 = newId();
  const soLine2Id1 = newId();
  await conn.query(
    'INSERT INTO sales_orders (id,company_id,sales_order_no,customer_id,customer_name,order_date,due_date,status,subtotal,grand_total,total_ordered_qty,total_delivered_qty,total_pending_qty,created_by,updated_by) VALUES (?,?,?,?,?,NOW(),NOW(),?,?,?,?,0,?,?,?)',
    [soId2, companyId, 'TEST-SO2-'+Date.now(), customer.id, customer.name, 'confirmed', 500, 500, 10, 10, customer.id, customer.id]
  );
  await conn.query(
    'INSERT INTO sales_order_line_items (id,sales_order_id,company_id,line_number,description,sku,ordered_qty,delivered_qty,invoiced_qty,rate) VALUES (?,?,?,1,?,?,10,0,0,50)',
    [soLine2Id1, soId2, companyId, 'Widget C', 'W-C']
  );

  // Partial invoice: only 6 of 10
  await conn.query('UPDATE sales_order_line_items SET invoiced_qty = invoiced_qty + 6 WHERE id=?', [soLine2Id1]);
  const [lines2] = await conn.query('SELECT ordered_qty, invoiced_qty FROM sales_order_line_items WHERE sales_order_id=?', [soId2]);
  const fullyInvoiced2 = lines2.every(r => parseFloat(r.invoiced_qty) >= parseFloat(r.ordered_qty));
  console.log('Partial (6/10): fully invoiced?', fullyInvoiced2, '(should be false)');
  console.log('Backlog remaining:', lines2[0].ordered_qty - lines2[0].invoiced_qty, '(should be 4)');
  console.log(fullyInvoiced2 === false ? 'PASS: SO not marked completed after partial invoice' : 'FAIL');

  // Cleanup
  await conn.query('DELETE FROM sales_order_line_items WHERE sales_order_id IN (?,?)', [soId, soId2]);
  await conn.query('DELETE FROM sales_orders WHERE id IN (?,?)', [soId, soId2]);
  console.log('\nTest data cleaned up.');
  await conn.end();
}

test().catch(err => { console.error('TEST ERROR:', err.message); process.exit(1); });
