#!/bin/bash
set -e
BASE="https://candydada.com/api/v1"

api() {
  local METHOD=$1 PATH=$2 BODY=$3 TOKEN=$4
  local ARGS=(-sk -X "$METHOD" "$BASE$PATH" -H "Content-Type: application/json")
  [ -n "$TOKEN" ] && ARGS+=(-H "Authorization: Bearer $TOKEN")
  [ -n "$BODY" ] && ARGS+=(-d "$BODY")
  curl "${ARGS[@]}"
}

echo "========================================"
echo " COMPLETE ERP FLOW TEST"
echo "========================================"

# 1. Login admin
echo -e "\n[1] LOGIN ADMIN"
ADMIN_RESP=$(api POST /auth/login '{"email":"m.bilal@gmail.com","password":"Test123@"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'])")
ADMIN_NAME=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['user']['username'])")
echo "    Admin: $ADMIN_NAME | Token: ${ADMIN_TOKEN:0:20}..."

# 2. Login customer
echo -e "\n[2] LOGIN CUSTOMER"
CUST_RESP=$(api POST /auth/login '{"email":"cust1@gmail.com","password":"Test123@"}')
CUST_TOKEN=$(echo "$CUST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'])")
CUST_NAME=$(echo "$CUST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['user']['username'])")
LINKED_ID=$(echo "$CUST_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['user'].get('linked_customer_id') or 'NONE')")
echo "    Customer: $CUST_NAME | linked_customer_id: $LINKED_ID"

# 3. Get products
echo -e "\n[3] GET PRODUCTS"
PRODS_RESP=$(api GET "/products?limit=10" "" "$ADMIN_TOKEN")
PROD1_ID=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[0]['id'])")
PROD1_NAME=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[0]['name'])")
PROD1_SKU=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[0]['sku'])")
PROD1_PRICE=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[0].get('selling_price',0))")
PROD2_ID=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[1]['id'])")
PROD2_NAME=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[1]['name'])")
PROD2_SKU=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[1]['sku'])")
PROD2_PRICE=$(echo "$PRODS_RESP" | python3 -c "import sys,json; p=json.load(sys.stdin)['data']['products']; print(p[1].get('selling_price',0))")
echo "    Prod1: $PROD1_NAME ($PROD1_SKU) price=$PROD1_PRICE"
echo "    Prod2: $PROD2_NAME ($PROD2_SKU) price=$PROD2_PRICE"

# 4. Adjust inventory +10 for prod1
echo -e "\n[4] ADJUST INVENTORY +10 - $PROD1_NAME"
ADJ1=$(api POST "/products/$PROD1_ID/adjust-stock" '{"quantity":10,"reason":"Initial stock adjustment"}' "$ADMIN_TOKEN")
echo "    $(echo $ADJ1 | python3 -c \"import sys,json; d=json.load(sys.stdin); print('balance_after:', d.get('data',{}).get('balance_after','?'), '| msg:', d.get('message',''))\")"

# 5. Adjust inventory +10 for prod2
echo -e "\n[5] ADJUST INVENTORY +10 - $PROD2_NAME"
ADJ2=$(api POST "/products/$PROD2_ID/adjust-stock" '{"quantity":10,"reason":"Initial stock adjustment"}' "$ADMIN_TOKEN")
echo "    $(echo $ADJ2 | python3 -c \"import sys,json; d=json.load(sys.stdin); print('balance_after:', d.get('data',{}).get('balance_after','?'), '| msg:', d.get('message',''))\")"

# Check stock before order
STOCK1_BEFORE=$(api GET "/products/$PROD1_ID" "" "$ADMIN_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['current_stock'])")
STOCK2_BEFORE=$(api GET "/products/$PROD2_ID" "" "$ADMIN_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['current_stock'])")
echo "    Stock before order: $PROD1_NAME=$STOCK1_BEFORE | $PROD2_NAME=$STOCK2_BEFORE"

# 6. Get customer id
echo -e "\n[6] GET CUSTOMER"
CUSTS_RESP=$(api GET "/customers?limit=200" "" "$ADMIN_TOKEN")
if [ "$LINKED_ID" != "NONE" ]; then
  CUST_ID="$LINKED_ID"
else
  CUST_ID=$(echo "$CUSTS_RESP" | python3 -c "import sys,json; c=json.load(sys.stdin)['data']['customers']; print(c[0]['id'] if c else 'NONE')")
fi
CUST_DISPLAY=$(echo "$CUSTS_RESP" | python3 -c "import sys,json; c=json.load(sys.stdin)['data']['customers']; m=[x for x in c if x['id']=='$CUST_ID']; print(m[0]['name'] if m else 'unknown')" 2>/dev/null || echo "id=$CUST_ID")
echo "    Customer: $CUST_DISPLAY ($CUST_ID)"

# 7. Create sales order (customer) - 2 each
TODAY=$(date +%Y-%m-%d)
echo -e "\n[7] CREATE SALES ORDER (customer) - 2x $PROD1_NAME, 2x $PROD2_NAME"
SO_BODY="{\"customer_id\":\"$CUST_ID\",\"order_date\":\"$TODAY\",\"line_items\":[{\"sku\":\"$PROD1_SKU\",\"description\":\"$PROD1_NAME\",\"ordered_qty\":2,\"rate\":$PROD1_PRICE,\"tax_rate\":0,\"tax_amount\":0},{\"sku\":\"$PROD2_SKU\",\"description\":\"$PROD2_NAME\",\"ordered_qty\":2,\"rate\":$PROD2_PRICE,\"tax_rate\":0,\"tax_amount\":0}]}"
SO_RESP=$(api POST /sales-orders "$SO_BODY" "$CUST_TOKEN")
SO_ID=$(echo "$SO_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['id'])")
SO_NO=$(echo "$SO_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d.get('sales_order_no') or d.get('order_no') or 'auto')")
SO_STATUS=$(echo "$SO_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['status'])")
echo "    SO created: $SO_NO | id: $SO_ID | status: $SO_STATUS"

# 8. Confirm order (admin)
echo -e "\n[8] CONFIRM ORDER (admin)"
CONF_RESP=$(api PATCH "/sales-orders/$SO_ID/status" '{"status":"confirmed"}' "$ADMIN_TOKEN")
echo "    $(echo $CONF_RESP | python3 -c \"import sys,json; d=json.load(sys.stdin); print('status:', d.get('data',{}).get('status','?'), '| msg:', d.get('message',''))\")"

# 9. Create delivery note
echo -e "\n[9] CREATE DELIVERY NOTE"
SO_FULL=$(api GET "/sales-orders/$SO_ID" "" "$ADMIN_TOKEN")
DN_LINES=$(echo "$SO_FULL" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
items = d.get('line_items') or []
result = []
for li in items:
    qty = float(li.get('ordered_qty',0)) - float(li.get('delivered_qty',0) or 0)
    if qty > 0:
        result.append({'sales_order_line_item_id': li['id'], 'shipped_qty': qty})
print(json.dumps(result))
")
echo "    DN lines: $DN_LINES"
DN_BODY="{\"delivery_date\":\"$TODAY\",\"line_items\":$DN_LINES}"
DN_RESP=$(api POST "/sales-orders/$SO_ID/convert-to-delivery-note" "$DN_BODY" "$ADMIN_TOKEN")
DN_ID=$(echo "$DN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['id'])")
DN_NO=$(echo "$DN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d.get('delivery_note_no','?'))")
DN_STATUS=$(echo "$DN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['status'])")
echo "    DN created: $DN_NO | id: $DN_ID | status: $DN_STATUS"

# 10. Approve delivery note
echo -e "\n[10] APPROVE DELIVERY NOTE"
APP_DN=$(api PATCH "/delivery-notes/$DN_ID/status" '{"status":"accepted"}' "$ADMIN_TOKEN")
echo "    $(echo $APP_DN | python3 -c \"import sys,json; d=json.load(sys.stdin); print('status:', d.get('data',{}).get('status','?'), '| msg:', d.get('message',''))\")"

# 11. Stock check after DN approval
echo -e "\n[11] STOCK AFTER DELIVERY NOTE APPROVAL"
STOCK1_AFTER=$(api GET "/products/$PROD1_ID" "" "$ADMIN_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['current_stock'])")
STOCK2_AFTER=$(api GET "/products/$PROD2_ID" "" "$ADMIN_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['current_stock'])")
echo "    $PROD1_NAME: $STOCK1_BEFORE -> $STOCK1_AFTER (shipped 2)"
echo "    $PROD2_NAME: $STOCK2_BEFORE -> $STOCK2_AFTER (shipped 2)"
python3 -c "
a1,b1,a2,b2 = $STOCK1_AFTER,$STOCK1_BEFORE,$STOCK2_AFTER,$STOCK2_BEFORE
if float(a1) < float(b1) and float(a2) < float(b2):
    print('    STOCK REDUCED: YES - inventory deducted correctly')
else:
    print('    STOCK REDUCED: NO - check DN approval stock deduction logic')
"

# 12. Create invoice from DN
echo -e "\n[12] CREATE INVOICE FROM DELIVERY NOTE"
INV_RESP=$(api POST "/delivery-notes/$DN_ID/convert-to-invoice" "{\"invoice_date\":\"$TODAY\"}" "$ADMIN_TOKEN")
INV_ID=$(echo "$INV_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or {}).get('id','FAIL'))" 2>/dev/null || echo "FAIL")
INV_NO=$(echo "$INV_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or {}).get('invoice_no','?'))" 2>/dev/null || echo "?")
INV_STATUS=$(echo "$INV_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or {}).get('status','?'))" 2>/dev/null || echo "?")
INV_TOTAL=$(echo "$INV_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); dd=d.get('data') or {}; print(dd.get('grand_total') or dd.get('total_amount','?'))" 2>/dev/null || echo "?")
if [ "$INV_ID" = "FAIL" ]; then
  echo "    FAIL: $(echo $INV_RESP | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get(\"message\",d))')"
else
  echo "    Invoice: $INV_NO | id: $INV_ID | status: $INV_STATUS | total: $INV_TOTAL"
fi

# 13. Approve invoice
if [ "$INV_ID" != "FAIL" ]; then
  echo -e "\n[13] APPROVE INVOICE"
  APP_INV=$(api PATCH "/invoices/$INV_ID/status" '{"status":"approved"}' "$ADMIN_TOKEN")
  echo "    $(echo $APP_INV | python3 -c \"import sys,json; d=json.load(sys.stdin); print('status:', d.get('data',{}).get('status','?'), '| msg:', d.get('message',''))\")"
fi

echo -e "\n========================================"
echo " FLOW COMPLETE"
echo "========================================"
