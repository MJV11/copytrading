#!/bin/bash

# Polymarket CLOB API Testing Script
echo "========================================"
echo "Polymarket CLOB API Tests"
echo "========================================"
echo ""

BASE_URL="https://clob.polymarket.com"
TEST_ADDRESS="0xf247584e41117bbbe4cc06e4d2c95741792a5216"

# Test 1: Health check
echo "✓ Test 1: API Health Check"
curl -k -s "$BASE_URL/" | head -1
echo ""

# Test 2: Get Markets (PUBLIC - WORKS!)
echo "✓ Test 2: Get Markets"
RESPONSE=$(curl -k -s "$BASE_URL/markets")
MARKET_COUNT=$(echo $RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin)['data']))" 2>/dev/null)
echo "Found $MARKET_COUNT markets"
echo ""

# Test 3: Get Trades for Address (REQUIRES AUTH - FAILS)
echo "✗ Test 3: Get Trades for Address"
curl -k -s "$BASE_URL/data/trades?maker=$TEST_ADDRESS" -w "\nStatus: %{http_code}\n" | head -3
echo ""

# Test 4: Get Trades endpoint without filters (REQUIRES AUTH - FAILS)
echo "✗ Test 4: Get All Trades"
curl -k -s "$BASE_URL/data/trades" -w "\nStatus: %{http_code}\n" | head -3
echo ""

# Test 5: Order Book (NO ORDER BOOKS AVAILABLE)
echo "✗ Test 5: Get Order Book"
curl -k -s "$BASE_URL/book?token_id=36161990524808999529099890841186860907449767867066339846328156147773282747583" | python3 -m json.tool 2>/dev/null | head -5
echo ""

echo "========================================"
echo "Summary:"
echo "========================================"
echo "✓ WORKING: GET /markets - Returns all markets (public)"
echo "✗ BLOCKED: GET /data/trades - Requires API key (401 Unauthorized)"
echo "✗ LIMITED: GET /book - No order books available for most markets"
echo ""
echo "CONCLUSION:"
echo "- The CLOB API requires authentication for trader-specific data"
echo "- Markets endpoint works but doesn't include trader trades"
echo "- Need to either:"
echo "  1. Get an API key from Polymarket"
echo "  2. Use their GraphQL Subgraph"
echo "  3. Monitor blockchain events directly"
echo ""
