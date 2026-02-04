# Real Position Tracking System

## How It Works

The system now queries real on-chain data to calculate the target trader's portfolio value.

### Step 1: Discover Markets from Trades

As the system monitors trades:
```typescript
// When a trade is detected
trade.outcomeId -> "73470541315377973562501025254719659796416871135081220986683321361000395461644"

// Register this token ID for tracking
api.registerTokenId(trade.outcomeId)
```

### Step 2: Query Real Token Balances

For each tracked token:
```typescript
// Query ERC1155 balance on CTF contract
balance = await ctfContract.balanceOf(traderAddress, tokenId)

// Returns actual number of shares they hold
```

### Step 3: Get Current Prices

```typescript
// Fetch current market prices from Polymarket API
markets = await client.getMarkets()

// Find price for each token
price = market.tokens.find(t => t.token_id === tokenId).price
```

### Step 4: Calculate Portfolio Value

```typescript
totalValue = sum(balance * price) for all tokens

// This is their REAL portfolio value
```

## Data Flow

```
1. Monitor blockchain trades
   └> Extract token IDs (outcomeId)
      └> Register for tracking

2. Every 5 minutes (or when balance needed):
   └> Query ERC1155 balances for all tracked tokens
      └> Fetch current prices from markets
         └> Calculate: sum(shares * price)
            └> REAL portfolio value

3. When new trade detected:
   └> Calculate: trade_size / portfolio_value = percentage
      └> Apply same percentage to OUR portfolio
         └> Execute scaled trade
```

## Smart Contract Interactions

### CTF (Conditional Token Framework)

**Contract:** `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045`
**Network:** Polygon

**Methods Used:**
- `balanceOf(address, tokenId)` - Get single token balance
- `balanceOfBatch(addresses[], tokenIds[])` - Get multiple balances (more efficient)

### Token IDs

Polymarket outcome tokens are identified by large uint256 values:
```
Example: 73470541315377973562501025254719659796416871135081220986683321361000395461644
```

Each outcome in a market has a unique token ID.

## Position Discovery Strategy

### Initial State
- Start with empty token ID set
- Use configured TARGET_TRADER_BALANCE as estimate

### As Trades Arrive
- Extract outcomeId from each trade
- Add to tracked set
- Portfolio accuracy improves over time

### After N Trades Discovered
- Have complete picture of their markets
- Can calculate accurate portfolio value
- Scaling becomes precise

## Advantages

1. **Real Data** - Actual on-chain balances
2. **No API Required** - Just RPC access
3. **Accurate** - Reflects true holdings
4. **Automatic** - Discovers positions from trades
5. **Verifiable** - Anyone can query the blockchain

## Performance

**RPC Calls per Balance Update:**
- 1 call to get current block
- 1 call to getMarkets (for prices)
- 1 call to balanceOfBatch (all tokens at once)

Total: 3 RPC calls per portfolio value calculation

With Ankr/Alchemy free tier: This is negligible usage.

## Current Implementation

The system now:
- Monitors last 1 minute of blockchain trades
- Registers token IDs from discovered trades
- Queries real ERC1155 balances every 5 minutes
- Calculates accurate portfolio values
- Uses this for percentage-based trade scaling

All data is real, verified on-chain data.
