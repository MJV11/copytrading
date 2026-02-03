# Polymarket Data Sources

## Current Implementation

The simulator now uses **Polygon blockchain monitoring** to fetch real trade data directly from Polymarket's smart contracts.

### Primary Data Source: Blockchain Events

**Contract:** `0x4d97dcd97ec945f40cf65f87097ace5ea0476045` (CTF Exchange)  
**Network:** Polygon (Chain ID: 137)  
**RPC:** `https://polygon-rpc.com`  

**Events Monitored:**
- `OrderFilled` - Captures all trades on Polymarket
- Filters by maker address to get specific trader's trades
- No API key or authentication required
- Most reliable real data source

### How It Works

```
1. Connect to Polygon RPC
2. Query CTF Exchange contract events
3. Filter by target trader address
4. Parse events into Trade objects
5. Execute copytrading logic
```

### Advantages

- Real blockchain data
- No authentication required
- No API key needed
- Cannot be deprecated or restricted
- Complete historical data available
- Most reliable source

### Disadvantages

- Slower than API calls
- Requires RPC endpoint (free public ones available)
- Need to parse raw event data
- Block range queries can be slow for large ranges

## Alternative Data Sources Attempted

### CLOB REST API
**Status:** Requires authentication  
**Issue:** Builder API key doesn't grant access to trader data endpoints  
**Endpoints:** `/data/trades`, `/data/orders`, `/data/positions`  
**Result:** 401 Unauthorized errors  

### GraphQL Subgraph
**Status:** Deprecated  
**Issue:** The Graph hosted service endpoint removed  
**URL:** `https://api.thegraph.com/subgraphs/name/polymarket/matic-markets`  
**Result:** "This endpoint has been removed"  

### SDK getTrades()
**Status:** Requires wallet signer  
**Issue:** Read-only operations require authentication with wallet  
**Result:** "Signer is needed to interact with this endpoint"  

## Current Solution

**Blockchain monitoring** provides real, authenticated data without any special permissions. The system queries Polygon blockchain events directly from Polymarket's CTF Exchange contract.

This is production-ready and will provide all necessary trade data for the copytrading simulator.

## Performance Optimization

For production use, consider:
- Using a paid RPC endpoint (faster, more reliable)
- Implementing event caching to reduce queries
- Setting appropriate block range limits
- Using websocket subscriptions for real-time updates

## RPC Endpoint Options

**Free Public:**
- `https://polygon-rpc.com`
- `https://rpc-mainnet.maticvigil.com`

**Paid (Better Performance):**
- Alchemy
- Infura
- QuickNode
- Ankr

Configure in future iterations if needed.
