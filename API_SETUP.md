# Polymarket API Setup Guide

## Current API Status

The Polymarket CLOB (Central Limit Order Book) API has authentication requirements that may prevent direct access to trader data. Here's what you need to know:

## Issue: 401 Unauthorized Errors

If you're seeing `401 (Unauthorized)` errors, this means:
- The Polymarket API requires authentication for trader-specific endpoints
- You may need an API key from Polymarket
- Some endpoints may not be publicly accessible

## Solutions

### Option 1: Get a Polymarket API Key (Recommended for Production)

1. **Sign up for Polymarket API access**
   - Visit [https://polymarket.com](https://polymarket.com)
   - Contact Polymarket support or check their developer docs
   - Request API credentials

2. **Add your API key to `.env`**
   ```bash
   POLYMARKET_API_KEY=your_api_key_here
   ```

### Option 2: Use Alternative Data Sources

Since the public API is limited, you can:

#### A. Use Polymarket's Subgraph (GraphQL)

Polymarket has a subgraph for querying historical data:
- Endpoint: `https://api.thegraph.com/subgraphs/name/polymarket/...`
- Requires GraphQL queries instead of REST
- More reliable for historical data

#### B. Query Blockchain Directly

Use Polygon blockchain RPC to get on-chain data:
- Polymarket contracts on Polygon
- Use `ethers.js` to query events
- More complex but most reliable

### Option 3: Mock Data Mode (For Testing)

The app now includes mock data for testing. It will:
- Return empty trades array if API fails
- Use mock order books for slippage simulation
- Allow you to test the logic without real data

## Current API Implementation Status

Our implementation now:
✅ Handles 401/404 errors gracefully  
✅ Returns mock order books when real data unavailable  
✅ Continues running even if API calls fail  
✅ Logs detailed error messages  

## Testing the Simulator

### With Mock Data

1. Run the app as normal:
   ```bash
   npm run dev
   ```

2. The app will:
   - Show warnings about API errors
   - Fall back to configured TARGET_TRADER_BALANCE
   - Continue polling but won't find trades
   - Allow you to test the infrastructure

### With Real Data

To test with real data, you need to:

1. **Find working API endpoints**
   - Check Polymarket's latest documentation
   - Look at their official SDK
   - Or use their subgraph

2. **Update the API client** (`src/services/polymarket-api.ts`)
   - Modify endpoint URLs
   - Add proper authentication
   - Update response parsing

## Recommended Next Steps

### For Development/Testing
```bash
# Use mock data mode - app is now configured for this
npm run dev

# The simulator will run but won't fetch real trades
# Perfect for testing the execution logic
```

### For Production
1. Get API credentials from Polymarket
2. Or implement blockchain event listening
3. Or use their GraphQL subgraph

## Example: Adding Test Trades Manually

You can manually insert test trades into the database to see the full system work:

```typescript
// In src/index.ts, add after initialization:
const testTrade: Trade = {
  id: 'test_1',
  timestamp: new Date(),
  traderAddress: config.targetTraderAddress,
  marketId: 'test_market',
  marketQuestion: 'Will test succeed?',
  outcomeId: 'yes',
  side: 'BUY',
  shares: 1000,
  price: 0.50,
  totalCost: 500,
  fee: 5,
  source: 'api',
};

// Then execute it through your trade executor
await this.tradeExecutor.executeTrade(
  testTrade,
  this.portfolio,
  this.targetBalance
);
```

## API Endpoint Reference (Unverified)

Based on common Polymarket integrations:

```
Base URL: https://clob.polymarket.com

Possible endpoints:
- GET /trades/{address}      - User trades
- GET /markets               - All markets
- GET /markets/{id}          - Market details
- GET /book?token_id={id}    - Order book
- GET /positions/{address}   - User positions (may require auth)
```

**Note:** These endpoints may require authentication or be structured differently. Check official docs.

## Resources

- [Polymarket Developer Docs](https://docs.polymarket.com)
- [Polymarket GitHub](https://github.com/Polymarket)
- Polygon RPC: `https://polygon-rpc.com`

## Questions?

The simulator is built to handle API failures gracefully. Even without live data, you can:
- Test the database layer
- Verify the slippage calculations
- Check the reporting functionality
- Validate the percentage-based scaling logic

Once you have proper API access, the system will automatically start fetching and processing real trades!
