#!/usr/bin/env bash
# Test: PO → received → inventory update
# Run this with server running: bash test_po_inventory.sh

BASE="http://localhost:3001/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC}: $1"; }
fail() { echo -e "${RED}FAIL${NC}: $1"; exit 1; }
step() { echo -e "\n--- $1 ---"; }

# ── 1. Login ───────────────────────────────────────────────────────────────
step "1. Login"
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}')
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "Login response: $LOGIN"
  fail "Could not get token — check email/password"
fi
pass "Got auth token"
AUTH="Authorization: Bearer $TOKEN"

# ── 2. Pick a vendor ───────────────────────────────────────────────────────
step "2. Get first vendor"
VENDOR_ID=$(curl -s "$BASE/vendors?limit=1" -H "$AUTH" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$VENDOR_ID" ] && fail "No vendors found — create one first"
pass "Vendor ID: $VENDOR_ID"

# ── 3. Pick a product (inventory type) and record its current stock ────────
step "3. Get first inventory product and its current stock"
PRODUCTS=$(curl -s "$BASE/products?product_type=inventory&limit=1" -H "$AUTH")
PRODUCT_ID=$(echo "$PRODUCTS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$PRODUCT_ID" ] && fail "No inventory products found — create a product with type=inventory first"

STOCK_BEFORE=$(curl -s "$BASE/products/$PRODUCT_ID" -H "$AUTH" | grep -o '"current_stock":"[^"]*"\|"current_stock":[0-9.]*' | grep -o '[0-9.]*' | head -1)
pass "Product ID: $PRODUCT_ID | Stock before: ${STOCK_BEFORE:-0}"

# ── 4. Create PO with that product (qty=5) ─────────────────────────────────
step "4. Create Purchase Order (qty=5 of that product)"
PO_RESP=$(curl -s -X POST "$BASE/purchase-orders" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d "{
    \"vendor_id\": \"$VENDOR_ID\",
    \"order_date\": \"$(date +%Y-%m-%d)\",
    \"line_items\": [{
      \"product_id\": \"$PRODUCT_ID\",
      \"description\": \"Test item\",
      \"ordered_qty\": 5,
      \"rate\": 10
    }]
  }")
PO_ID=$(echo "$PO_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PO_NO=$(echo "$PO_RESP" | grep -o '"purchase_order_no":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$PO_ID" ] && { echo "$PO_RESP"; fail "Failed to create PO"; }
pass "Created PO: $PO_NO (id: $PO_ID)"

# ── 5. Approve PO ─────────────────────────────────────────────────────────
step "5. Approve PO (draft → approved)"
APPROVE=$(curl -s -X PATCH "$BASE/purchase-orders/$PO_ID/status" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"approved"}')
STATUS=$(echo "$APPROVE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
[ "$STATUS" != "approved" ] && { echo "$APPROVE"; fail "Approve failed (status=$STATUS)"; }
pass "PO status: approved"

# ── 6. Receive PO ─────────────────────────────────────────────────────────
step "6. Receive PO (approved → received) — this should update inventory"
RECEIVE=$(curl -s -X PATCH "$BASE/purchase-orders/$PO_ID/status" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"status":"received"}')
STATUS=$(echo "$RECEIVE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
[ "$STATUS" != "received" ] && { echo "$RECEIVE"; fail "Receive failed (status=$STATUS)"; }
pass "PO status: received"

# ── 7. Check product stock increased by 5 ─────────────────────────────────
step "7. Verify product stock updated"
STOCK_AFTER=$(curl -s "$BASE/products/$PRODUCT_ID" -H "$AUTH" | grep -o '"current_stock":"[^"]*"\|"current_stock":[0-9.]*' | grep -o '[0-9.]*' | head -1)
EXPECTED=$(echo "${STOCK_BEFORE:-0} + 5" | bc 2>/dev/null || echo "manual check needed")
echo "   Stock before : ${STOCK_BEFORE:-0}"
echo "   Stock after  : ${STOCK_AFTER:-?}"
echo "   Expected     : $EXPECTED"
if [ "$STOCK_AFTER" = "$EXPECTED" ]; then
  pass "Stock correctly increased by 5"
else
  fail "Stock mismatch! Expected $EXPECTED, got $STOCK_AFTER"
fi

# ── 8. Check inventory_transactions record ─────────────────────────────────
step "8. Verify inventory_transactions record created"
TX=$(curl -s "$BASE/inventory/transactions?product_id=$PRODUCT_ID&limit=1" -H "$AUTH")
TX_TYPE=$(echo "$TX" | grep -o '"transaction_type":"[^"]*"' | head -1 | cut -d'"' -f4)
TX_QTY=$(echo "$TX" | grep -o '"quantity":"[^"]*"\|"quantity":[0-9.]*' | head -1 | grep -o '[0-9.]*')
TX_REF=$(echo "$TX" | grep -o '"reference_no":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "   Type      : $TX_TYPE"
echo "   Quantity  : $TX_QTY"
echo "   Reference : $TX_REF"
[ "$TX_TYPE" = "purchase_receipt" ] && pass "Inventory transaction type: purchase_receipt" || fail "Wrong/missing transaction type: $TX_TYPE"
[ "$TX_QTY" = "5" ] && pass "Inventory transaction quantity: 5" || fail "Wrong quantity: $TX_QTY"

echo -e "\n${GREEN}ALL TESTS PASSED${NC}"
