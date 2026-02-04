# Polymarket Copytrading Bot - Design Document

## 1. Overview

### 1.1 Purpose
Build a simulation system that monitors a target Polymarket trader's account and replicates their trades in a virtual portfolio to analyze their profitability and trading strategy effectiveness.

### 1.2 Goals
- Track a target trader's positions and trades in real-time
- Simulate identical trades with the same timing and amounts
- Calculate accurate profit/loss metrics
- Provide detailed logs and analytics
- Validate strategy before live trading

### 1.3 Non-Goals (for MVP)
- Actual automated trading with real money
- Multiple trader tracking simultaneously
- Advanced risk management features
- Web UI/dashboard

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Polymarket API/Events                    │
└───────────────────────────────┬─────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Data Fetcher       │
                    │   - Monitor trades   │
                    │   - Fetch positions  │
                    │   - Get market data  │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Trade Processor    │
                    │   - Detect new trades│
                    │   - Validate data    │
                    │   - Queue trades     │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │  Simulation Engine   │
                    │  - Execute virtual   │
                    │    trades            │
                    │  - Track portfolio   │
                    │  - Calculate P&L     │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Data Store         │
                    │   - Trades history   │
                    │   - Portfolio state  │
                    │   - P&L records      │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   Logger & Analytics │
                    │   - Trade logs       │
                    │   - P&L reports      │
                    │   - Performance stats│
                    └──────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 Data Fetcher
**Responsibilities:**
- Connect to Polymarket API or blockchain events
- Monitor target trader's wallet address
- **Track target trader's total portfolio balance** (critical for percentage scaling)
- Fetch historical trades
- Get current market prices and positions
- Poll for new trades at regular intervals
- Update balance periodically or before each trade batch

**Technologies:**
- Polymarket CLOB API
- Polygon blockchain RPC (optional, for on-chain verification)
- ethers.js or viem for blockchain interactions

#### 2.2.2 Trade Processor
**Responsibilities:**
- Normalize trade data into standard format
- Detect new trades since last check
- Validate trade data integrity
- Handle duplicate detection
- Enqueue trades for simulation

#### 2.2.3 Simulation Engine
**Responsibilities:**
- Maintain virtual portfolio state
- Execute simulated trades
- Track positions (long/short, shares, entry prices)
- Calculate realized and unrealized P&L
- Handle position closing and partial fills
- Account for fees (matching Polymarket's fee structure)

#### 2.2.4 Data Store
**Responsibilities:**
- Persist all trades
- Store portfolio snapshots
- Maintain P&L history
- Enable historical analysis

**Storage Options:**
- SQLite (for MVP - simple, file-based)
- PostgreSQL (for production)
- JSON files (for quick prototyping)

#### 2.2.5 Logger & Analytics
**Responsibilities:**
- Log all activities with timestamps
- Generate P&L reports
- Calculate performance metrics (ROI, win rate, Sharpe ratio)
- Export data for analysis

---

## 3. Data Models

### 3.1 Trade Schema

```typescript
interface Trade {
  id: string;                    // Unique trade identifier
  timestamp: Date;               // When trade occurred
  traderAddress: string;         // Trader's wallet address
  marketId: string;              // Polymarket market ID
  marketQuestion: string;        // Human-readable market question
  outcomeId: string;             // Which outcome (YES/NO, or specific option)
  side: 'BUY' | 'SELL';         // Trade direction
  shares: number;                // Number of shares
  price: number;                 // Price per share (0-1 range)
  totalCost: number;             // Total amount (shares * price)
  fee: number;                   // Trading fee paid
  transactionHash?: string;      // On-chain tx hash if applicable
  source: 'api' | 'blockchain';  // Data source
  metadata?: {                   // Additional tracking for scaled trades
    originalTradeId?: string;    // ID of the target trader's trade we're copying
    targetTradePercent?: number; // % of target's portfolio this trade represented
    targetTraderBalance?: number; // Target's balance at time of trade
    ourPortfolioValue?: number;  // Our portfolio value at time of trade
    scalingRatio?: number;       // Our trade size / target's trade size
    // Slippage tracking
    targetPrice?: number;        // Price the target trader got
    ourAveragePrice?: number;    // Avg price we got (after slippage)
    priceImpact?: number;        // % price impact from our trade
    slippageCost?: number;       // Dollar cost of slippage
    fills?: Fill[];              // Individual fills at each price level
  };
}
```

### 3.2 Position Schema

```typescript
interface Position {
  id: string;
  marketId: string;
  marketQuestion: string;
  outcomeId: string;
  shares: number;                // Current shares held
  averageEntryPrice: number;     // Average price paid
  totalInvested: number;         // Total capital invested
  currentPrice: number;          // Latest market price
  unrealizedPnL: number;         // Current profit/loss
  realizedPnL: number;           // Locked-in profit/loss from partial closes
  isOpen: boolean;               // Position status
  openedAt: Date;
  closedAt?: Date;
}
```

### 3.3 Portfolio Schema

```typescript
interface Portfolio {
  id: string;
  timestamp: Date;
  totalInvested: number;         // Total capital deployed
  totalValue: number;            // Current portfolio value
  availableCash: number;         // Uninvested cash
  totalPnL: number;              // Total profit/loss
  totalPnLPercent: number;       // P&L percentage
  positions: Position[];         // Current open positions
  closedPositions: number;       // Count of closed positions
  winRate: number;               // % of profitable closed positions
}
```

### 3.4 Configuration Schema

```typescript
interface Config {
  targetTraderAddress: string;   // Wallet to copy
  initialCapital: number;        // Starting virtual capital
  targetTraderBalance: number;   // Target trader's current balance for ratio calculation
  startDate?: Date;              // When to start tracking (historical)
  pollingIntervalMs: number;     // How often to check for new trades
  updateBalanceIntervalMs: number; // How often to refresh target trader's balance
  copyRatio: number;             // Multiplier (1.0 = exact percentage copy, 0.5 = half percentage)
  maxPositionSizePercent?: number; // Max position as % of portfolio
  enabledMarkets?: string[];     // Optional: only copy specific markets
  excludedMarkets?: string[];    // Optional: markets to ignore
}
```

### 3.5 Trader Balance Tracking Schema

```typescript
interface TraderBalanceSnapshot {
  timestamp: Date;
  address: string;
  totalBalance: number;          // Total portfolio value
  availableCash: number;         // Uninvested cash
  positionsValue: number;        // Value locked in positions
  source: 'api' | 'calculated';  // How balance was determined
}
```

### 3.6 Order Book Schema

```typescript
interface OrderBook {
  marketId: string;
  outcomeId: string;
  timestamp: Date;
  bids: OrderLevel[];            // Buy orders (descending price)
  asks: OrderLevel[];            // Sell orders (ascending price)
  spread: number;                // Ask price - Bid price
}

interface OrderLevel {
  price: number;                 // Price per share (0-1)
  size: number;                  // Shares available at this price
  cumulativeSize: number;        // Total shares up to this level
}

interface SlippageResult {
  requestedShares: number;       // Shares we wanted to buy/sell
  executedShares: number;        // Shares we actually got
  averagePrice: number;          // Volume-weighted average price
  priceImpact: number;           // % price moved from mid-price
  totalCost: number;             // Total cost including slippage
  fills: Fill[];                 // Individual fills at each price level
}

interface Fill {
  price: number;
  shares: number;
  cost: number;
}
```

---

## 4. API Integration

### 4.1 Polymarket CLOB API

**Key Endpoints:**

1. **Get Trades by Trader**
   - `GET /trades?trader={address}`
   - Returns historical and recent trades
   - Supports pagination and filtering by timestamp

2. **Get Current Positions**
   - `GET /positions?trader={address}`
   - Returns active positions

3. **Get Market Data**
   - `GET /markets/{marketId}`
   - Get market details, current prices, volume

4. **Get Order Book**
   - `GET /book?market={marketId}`
   - Current bid/ask prices with depth
   - Returns array of price levels with liquidity at each level
   - Essential for slippage simulation

**Authentication:**
- Most read endpoints are public
- May need API key for higher rate limits

**Rate Limits:**
- Implement exponential backoff
- Respect rate limit headers
- Cache market data when possible

### 4.2 Alternative: Blockchain Events

If API is insufficient, monitor on-chain events:
- Use Polygon RPC endpoint
- Listen to Polymarket contract events
- Filter by trader address
- More reliable but slower and more complex

---

## 5. Simulation Logic

### 5.1 Order Book Slippage Simulation

```typescript
async function simulateOrderExecution(
  side: 'BUY' | 'SELL',
  desiredShares: number,
  orderBook: OrderBook,
  afterTargetTrade?: Trade  // If provided, simulate target's impact first
): Promise<SlippageResult> {
  // 1. Get the relevant side of the book
  const levels = side === 'BUY' ? orderBook.asks : orderBook.bids;
  let availableLevels = [...levels]; // Clone to modify
  
  // 2. If target trader already executed, remove their consumed liquidity
  if (afterTargetTrade) {
    availableLevels = removeConsumedLiquidity(
      availableLevels, 
      afterTargetTrade.shares
    );
  }
  
  // 3. Walk through order book levels to fill our order
  const fills: Fill[] = [];
  let remainingShares = desiredShares;
  let totalCost = 0;
  
  for (const level of availableLevels) {
    if (remainingShares <= 0) break;
    
    const sharesToFill = Math.min(remainingShares, level.size);
    const cost = sharesToFill * level.price;
    
    fills.push({
      price: level.price,
      shares: sharesToFill,
      cost: cost
    });
    
    totalCost += cost;
    remainingShares -= sharesToFill;
  }
  
  // 4. Check if we could fill the entire order
  const executedShares = desiredShares - remainingShares;
  if (remainingShares > 0) {
    logWarning('Insufficient liquidity', {
      requested: desiredShares,
      executed: executedShares,
      unfilled: remainingShares
    });
  }
  
  // 5. Calculate metrics
  const averagePrice = executedShares > 0 ? totalCost / executedShares : 0;
  const midPrice = (orderBook.asks[0].price + orderBook.bids[0].price) / 2;
  const priceImpact = ((averagePrice - midPrice) / midPrice) * 100;
  
  return {
    requestedShares: desiredShares,
    executedShares,
    averagePrice,
    priceImpact,
    totalCost,
    fills
  };
}

function removeConsumedLiquidity(
  levels: OrderLevel[], 
  sharesConsumed: number
): OrderLevel[] {
  const newLevels: OrderLevel[] = [];
  let remaining = sharesConsumed;
  
  for (const level of levels) {
    if (remaining <= 0) {
      newLevels.push(level);
    } else if (level.size > remaining) {
      // Partial consumption of this level
      newLevels.push({
        ...level,
        size: level.size - remaining,
        cumulativeSize: level.cumulativeSize - remaining
      });
      remaining = 0;
    } else {
      // Entire level consumed
      remaining -= level.size;
      // Don't add this level (it's gone)
    }
  }
  
  return newLevels;
}
```

### 5.2 Trade Execution Flow with Slippage

```typescript
async function executeTrade(
  targetTraderTrade: Trade, 
  portfolio: Portfolio,
  targetTraderBalance: number
): Promise<void> {
  // 1. Calculate the percentage of target trader's portfolio
  const tradePercentOfTarget = targetTraderTrade.totalCost / targetTraderBalance;
  
  // 2. Calculate our scaled trade size (in dollars, before slippage)
  const ourPortfolioValue = portfolio.totalValue;
  const scaledTradeCost = ourPortfolioValue * tradePercentOfTarget * config.copyRatio;
  
  // 3. Fetch current order book for this market
  const orderBook = await fetchOrderBook(
    targetTraderTrade.marketId, 
    targetTraderTrade.outcomeId
  );
  
  // 4. Estimate desired shares based on mid-price (pre-slippage)
  const midPrice = (orderBook.asks[0].price + orderBook.bids[0].price) / 2;
  const estimatedShares = scaledTradeCost / midPrice;
  
  // 5. Simulate our order execution AFTER target's trade impact
  const slippageResult = await simulateOrderExecution(
    targetTraderTrade.side,
    estimatedShares,
    orderBook,
    targetTraderTrade  // Simulate after their trade
  );
  
  // 6. Calculate actual cost with slippage and fees
  const actualCost = slippageResult.totalCost;
  const fee = actualCost * getFeeRate(targetTraderTrade);
  const totalRequired = actualCost + fee;
  
  // 7. Validate sufficient capital
  if (targetTraderTrade.side === 'BUY') {
    if (portfolio.availableCash < totalRequired) {
      logWarning('Insufficient capital for trade', {
        required: totalRequired,
        available: portfolio.availableCash,
        originalTrade: targetTraderTrade
      });
      return; // Skip trade
    }
  }
  
  // 8. Create our executed trade with actual slippage
  const ourTrade: Trade = {
    ...targetTraderTrade,
    shares: slippageResult.executedShares,
    price: slippageResult.averagePrice,  // Actual price we got
    totalCost: actualCost,
    fee: fee,
    id: generateTradeId(),
    metadata: {
      originalTradeId: targetTraderTrade.id,
      targetTradePercent: tradePercentOfTarget,
      targetTraderBalance: targetTraderBalance,
      ourPortfolioValue: ourPortfolioValue,
      scalingRatio: actualCost / targetTraderTrade.totalCost,
      // Slippage tracking
      targetPrice: targetTraderTrade.price,
      ourAveragePrice: slippageResult.averagePrice,
      priceImpact: slippageResult.priceImpact,
      slippageCost: (slippageResult.averagePrice - targetTraderTrade.price) * slippageResult.executedShares,
      fills: slippageResult.fills
    }
  };

  // 9. Update or create position
  const position = findOrCreatePosition(ourTrade);
  
  if (ourTrade.side === 'BUY') {
    position.shares += ourTrade.shares;
    position.totalInvested += ourTrade.totalCost + ourTrade.fee;
    position.averageEntryPrice = position.totalInvested / position.shares;
    portfolio.availableCash -= (ourTrade.totalCost + ourTrade.fee);
  } else {
    const pnlFromSale = calculateRealizedPnL(position, ourTrade);
    position.realizedPnL += pnlFromSale;
    position.shares -= ourTrade.shares;
    portfolio.availableCash += ourTrade.totalCost - ourTrade.fee;
    
    if (position.shares <= 0.001) {
      position.isOpen = false;
      position.closedAt = new Date();
    }
  }

  // 10. Update portfolio totals
  updatePortfolioMetrics(portfolio);

  // 11. Persist changes
  await savePosition(position);
  await savePortfolio(portfolio);
  await saveTrade(ourTrade);

  // 12. Log execution with slippage details
  logTrade(ourTrade, portfolio, {
    targetTradePercent: tradePercentOfTarget,
    scalingRatio: ourTrade.metadata.scalingRatio,
    priceImpact: slippageResult.priceImpact,
    slippageCost: ourTrade.metadata.slippageCost
  });
}
```

### 5.3 Percentage-Based Scaling Strategy

**Core Concept:**
Instead of copying absolute dollar amounts, calculate what percentage of the target trader's portfolio each trade represents, then apply that same percentage to your own portfolio.

**Example:**
```
Target Trader:
- Portfolio Value: $100,000
- Makes trade: $5,000
- Trade as % of portfolio: 5%

Your Portfolio:
- Portfolio Value: $10,000
- Your trade: $10,000 × 5% = $500
- Scaling ratio: 1:10 (you have 10x less capital)
```

**Benefits:**
- Proper risk management regardless of capital size
- Maintains same portfolio allocation strategy as target
- Automatically adjusts as both portfolios grow/shrink
- More realistic simulation of the strategy's effectiveness

**Key Considerations:**
- Need to track target trader's total portfolio value
- Must update balance periodically (positions change value)
- Handle edge cases where target is over-leveraged
- Your portfolio value includes unrealized P&L

### 5.4 Balance Tracking

```typescript
async function updateTargetTraderBalance(
  address: string
): Promise<number> {
  // Fetch current positions and cash
  const positions = await fetchPositions(address);
  const positionsValue = positions.reduce((sum, pos) => 
    sum + (pos.shares * pos.currentPrice), 0
  );
  
  // Try to get cash balance from API
  const cashBalance = await fetchCashBalance(address);
  
  const totalBalance = cashBalance + positionsValue;
  
  // Store snapshot
  await saveBalanceSnapshot({
    timestamp: new Date(),
    address,
    totalBalance,
    availableCash: cashBalance,
    positionsValue,
    source: 'api'
  });
  
  return totalBalance;
}
```

### 5.5 P&L Calculation

**Unrealized P&L (Open Positions):**
```typescript
unrealizedPnL = (currentPrice - averageEntryPrice) * shares - feesAccrued
```

**Realized P&L (Closed Positions):**
```typescript
realizedPnL = (exitPrice - entryPrice) * sharesSold - totalFees
```

**Total P&L:**
```typescript
totalPnL = sum(realizedPnL) + sum(unrealizedPnL)
totalPnLPercent = (totalPnL / initialCapital) * 100
```

**Performance Comparison:**
Since we're copying percentage-based positions, our P&L percentage should closely match the target trader's performance:
```typescript
// Both portfolios should see similar % returns
ourROI = (totalPnL / initialCapital) * 100
targetROI = (targetPnL / targetInitialCapital) * 100
// These should be approximately equal (within timing/fee differences)
```

### 5.6 Slippage Impact Analysis

**Why Slippage Matters:**
When you copy a trader, you can NEVER get the same price they got because:
1. **Sequential Execution:** Your order comes after theirs
2. **Market Impact:** Their trade consumes liquidity and moves the price
3. **Your Impact:** Your own trade causes additional slippage
4. **Timing Delay:** Real-world delay between detection and execution

**Slippage Calculation:**
```typescript
// Example: Target buys 10,000 shares
// Order book before:
// Ask: 100,000 @ $0.65
// Ask: 50,000 @ $0.66
// Ask: 25,000 @ $0.67

// After target's 10,000 share buy:
// Ask: 90,000 @ $0.65  <- Consumed 10k shares
// Ask: 50,000 @ $0.66
// Ask: 25,000 @ $0.67

// Your 1,000 share buy (if you have 10% of their capital):
// Fill: 1,000 @ $0.65 (avg price: $0.65)
// Slippage: $0.65 - $0.65 = $0.00 (minimal in this case)

// But if target bought 100,000 shares:
// After target's buy, ask level moves to $0.66+
// Your 1,000 shares might fill at average $0.66
// Slippage: $0.66 - $0.65 = $0.01 per share = $10 total
```

**Expected Impact:**
- Small trades (<1% of book depth): Minimal slippage
- Medium trades (1-5% of depth): Moderate slippage (0.1-0.5%)
- Large trades (>10% of depth): Significant slippage (1-5%+)
- Your performance will be WORSE than target's due to slippage costs

**Slippage vs Trade Size:**
```
Target's Trade Size → Your Slippage Cost
     Small          →      ~0-0.2%
     Medium         →      ~0.2-1%
     Large          →      ~1-5%
     Whale          →      May not be able to fill!
```

### 5.7 Fallback Strategies for Missing Order Book Data

If order book data is unavailable (historical mode, API issues):

**Option 1: Estimate from Trade Price**
```typescript
// Assume target's price includes their own slippage
// Add conservative additional slippage for our trade
const estimatedSlippage = calculateConservativeSlippage(
  tradeSize: ourTradeSize,
  marketVolume: recentMarketVolume,
  side: trade.side
);
// Conservative assumption: 0.5% base + size-based
```

**Option 2: Use Historical Average Slippage**
```typescript
// Calculate average slippage for similar-sized trades
const historicalSlippage = getAverageSlippage({
  marketId: trade.marketId,
  tradeSize: ourTradeSize,
  timeWindow: '7days'
});
```

**Option 3: Conservative Fixed Percentage**
```typescript
// Apply fixed slippage penalty
const fixedSlippage = 0.01; // 1% worse than target
const ourPrice = trade.price * (1 + fixedSlippage);
```

**Recommendation:** Use Option 1 for backtesting, actual order book for live simulation.

### 5.8 Fee Handling

Polymarket fees (as of 2024):
- Maker fee: ~0% (no fee for limit orders)
- Taker fee: ~1-2% (for market orders)

For simulation, assume taker fees unless order book data suggests otherwise.

**Total Execution Cost:**
```typescript
totalCost = baseCost + slippageCost + fees
// Example: $1000 trade
// Base: $1000
// Slippage: $5 (0.5%)
// Fees: $10 (1%)
// Total: $1015 (1.5% total cost)
```

---

## 6. Initial Setup & Synchronization

### 6.1 First Run Setup

When starting the simulation, you need to establish the baseline:

1. **Get Target Trader's Current Balance**
   - Fetch all current positions
   - Calculate total value (positions + cash)
   - Store as initial balance snapshot

2. **Set Your Initial Capital**
   - Configure in .env file
   - This is your virtual starting capital

3. **Choose Starting Point**
   - **Option A - Real-time Only:** Start monitoring from now, ignore history
   - **Option B - Historical Backtest:** Fetch all trades from a past date
     - Calculate target's balance at that historical point
     - Replay all trades chronologically

4. **Calculate Initial Scaling Ratio**
   ```typescript
   initialScalingRatio = yourCapital / targetTraderBalance
   // Example: $10,000 / $100,000 = 0.1 (you're 10% of their size)
   ```

### 6.2 Ongoing Synchronization

**Balance Updates:**
- Update target balance every 5 minutes (configurable)
- Before processing each new trade batch
- After significant market movements

**Trade Polling:**
- Check for new trades every 60 seconds (configurable)
- Process trades in chronological order
- Detect and skip duplicates

**Position Syncing:**
- Verify your positions match target's (by percentage)
- Detect any drift or missed trades
- Log discrepancies for investigation

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up TypeScript project structure
- [ ] Implement configuration management
- [ ] Create data models and types
- [ ] Set up logging infrastructure
- [ ] Initialize data store (SQLite)

### Phase 2: Data Fetching (Week 1-2)
- [ ] Implement Polymarket API client
- [ ] Build trader monitoring service
- [ ] **Implement target balance tracking**
- [ ] **Create balance snapshot storage**
- [ ] **Implement order book fetching**
- [ ] **Build order book parser and validator**
- [ ] Fetch historical trades
- [ ] Implement polling mechanism
- [ ] Add duplicate detection

### Phase 3: Simulation Engine (Week 2)
- [ ] Implement portfolio management
- [ ] **Build percentage-based scaling logic**
- [ ] **Implement order book slippage simulation**
- [ ] **Build liquidity consumption algorithm**
- [ ] Build trade execution logic with slippage
- [ ] Create position tracking
- [ ] Implement P&L calculations (including slippage costs)
- [ ] **Add scaling accuracy validation**
- [ ] **Add slippage impact tracking**
- [ ] Add error handling

### Phase 4: Analytics & Reporting (Week 2-3)
- [ ] Generate P&L reports
- [ ] Calculate performance metrics
- [ ] **Build slippage analytics and reports**
- [ ] **Compare your ROI vs target's ROI**
- [ ] Create trade logs (with slippage details)
- [ ] Build export functionality
- [ ] Add visualization (charts/graphs)
- [ ] **Visualize slippage impact over time**

### Phase 5: Testing & Refinement (Week 3)
- [ ] Unit tests for core logic
- [ ] Integration tests with API
- [ ] Backtest with historical data
- [ ] Optimize performance
- [ ] Documentation

---

## 8. Technology Stack

### 8.1 Core Technologies
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript (v5+)
- **Package Manager:** npm or pnpm

### 8.2 Key Libraries

```json
{
  "dependencies": {
    "ethers": "^6.x",           // Blockchain interactions
    "axios": "^1.x",            // HTTP requests
    "better-sqlite3": "^9.x",   // Database (SQLite)
    "dotenv": "^16.x",          // Environment variables
    "zod": "^3.x",              // Schema validation
    "winston": "^3.x",          // Logging
    "date-fns": "^3.x"          // Date utilities
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/better-sqlite3": "^7.x",
    "typescript": "^5.x",
    "tsx": "^4.x",              // TypeScript execution
    "vitest": "^1.x",           // Testing
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

### 8.3 Project Structure

```
copytrading/
├── src/
│   ├── config/
│   │   └── index.ts              # Configuration management
│   ├── services/
│   │   ├── polymarket-api.ts     # API client
│   │   ├── data-fetcher.ts       # Trade monitoring
│   │   └── simulator.ts          # Simulation engine
│   ├── models/
│   │   ├── trade.ts              # Trade model
│   │   ├── position.ts           # Position model
│   │   └── portfolio.ts          # Portfolio model
│   ├── database/
│   │   ├── schema.ts             # DB schema
│   │   └── repository.ts         # Data access
│   ├── analytics/
│   │   ├── calculator.ts         # P&L calculations
│   │   └── reporter.ts           # Report generation
│   ├── utils/
│   │   ├── logger.ts             # Logging utilities
│   │   └── helpers.ts            # Helper functions
│   └── index.ts                  # Main entry point
├── tests/
│   ├── unit/
│   └── integration/
├── data/                          # Database files, logs
├── output/                        # Reports, exports
├── .env.example
├── .env
├── package.json
├── tsconfig.json
├── DESIGN.md                      # This document
└── README.md
```

### 8.4 Database Schema (SQLite)

```sql
-- Trades table
CREATE TABLE trades (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  trader_address TEXT NOT NULL,
  market_id TEXT NOT NULL,
  market_question TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
  shares REAL NOT NULL,
  price REAL NOT NULL,
  total_cost REAL NOT NULL,
  fee REAL NOT NULL,
  transaction_hash TEXT,
  source TEXT NOT NULL CHECK(source IN ('api', 'blockchain')),
  -- Scaling metadata
  original_trade_id TEXT,
  target_trade_percent REAL,
  target_trader_balance REAL,
  our_portfolio_value REAL,
  scaling_ratio REAL,
  -- Slippage metadata
  target_price REAL,
  our_average_price REAL,
  price_impact REAL,
  slippage_cost REAL,
  fills_json TEXT,  -- JSON array of Fill objects
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_trades_timestamp ON trades(timestamp);
CREATE INDEX idx_trades_market ON trades(market_id);
CREATE INDEX idx_trades_trader ON trades(trader_address);

-- Positions table
CREATE TABLE positions (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  market_question TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  shares REAL NOT NULL,
  average_entry_price REAL NOT NULL,
  total_invested REAL NOT NULL,
  current_price REAL NOT NULL,
  unrealized_pnl REAL NOT NULL,
  realized_pnl REAL DEFAULT 0,
  is_open INTEGER NOT NULL DEFAULT 1,
  opened_at INTEGER NOT NULL,
  closed_at INTEGER,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_positions_market ON positions(market_id);
CREATE INDEX idx_positions_open ON positions(is_open);

-- Portfolio snapshots table
CREATE TABLE portfolio_snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  total_invested REAL NOT NULL,
  total_value REAL NOT NULL,
  available_cash REAL NOT NULL,
  total_pnl REAL NOT NULL,
  total_pnl_percent REAL NOT NULL,
  closed_positions_count INTEGER NOT NULL,
  win_rate REAL NOT NULL
);

CREATE INDEX idx_portfolio_timestamp ON portfolio_snapshots(timestamp);

-- Trader balance snapshots table
CREATE TABLE trader_balance_snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  address TEXT NOT NULL,
  total_balance REAL NOT NULL,
  available_cash REAL NOT NULL,
  positions_value REAL NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('api', 'calculated'))
);

CREATE INDEX idx_balance_timestamp ON trader_balance_snapshots(timestamp);
CREATE INDEX idx_balance_address ON trader_balance_snapshots(address);

-- Order book snapshots table (optional, for analysis)
CREATE TABLE order_book_snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  market_id TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  best_bid REAL NOT NULL,
  best_ask REAL NOT NULL,
  spread REAL NOT NULL,
  bid_depth_10 REAL,  -- Total size in top 10 bid levels
  ask_depth_10 REAL,  -- Total size in top 10 ask levels
  book_data_json TEXT -- Full order book as JSON (optional)
);

CREATE INDEX idx_orderbook_market ON order_book_snapshots(market_id, outcome_id);
CREATE INDEX idx_orderbook_timestamp ON order_book_snapshots(timestamp);
```

---

## 9. Configuration Example

```env
# .env
TARGET_TRADER_ADDRESS=0x1234...
TARGET_TRADER_BALANCE=100000
INITIAL_CAPITAL=10000
COPY_RATIO=1.0
POLLING_INTERVAL_MS=60000
UPDATE_BALANCE_INTERVAL_MS=300000
MAX_POSITION_SIZE_PERCENT=25

# Slippage Simulation Settings
ENABLE_SLIPPAGE_SIMULATION=true
MAX_SLIPPAGE_PERCENT=10
SKIP_TRADE_IF_INSUFFICIENT_LIQUIDITY=true
ORDER_BOOK_STALENESS_WARNING_MS=5000

# API Configuration
POLYMARKET_API_URL=https://clob.polymarket.com
POLYMARKET_API_KEY=optional_for_higher_limits

# Logging & Storage
LOG_LEVEL=info
DATABASE_PATH=./data/trades.db
STORE_ORDER_BOOK_SNAPSHOTS=true
```

---

## 10. Key Considerations

### 10.1 Challenges

#### General Challenges
- **Timing Discrepancy:** Can't perfectly replicate timing; accept delays
- **Market Resolution:** Track when markets resolve and settle positions
- **Data Quality:** API might have gaps; implement fallbacks

#### Slippage Simulation Challenges
- **Order Book Snapshots:** Need to fetch order book at exact trade time
  - Solution: Fetch immediately when trade detected
  - Historical mode: May need to estimate if book data unavailable
- **Book Staleness:** Order book changes rapidly
  - Solution: Accept that simulation is approximate
  - Log confidence level based on data freshness
- **Liquidity Depth:** Target's large trades may consume entire book
  - Solution: Handle partial fills, adjust position size
  - Log when we can't match their trade size
- **Market Impact Duration:** Price impact may persist or reverse
  - Simplification: Assume immediate impact, no recovery
  - This makes simulation more conservative (worse prices)
- **Order Type Unknown:** Don't know if target used market or limit order
  - Assumption: Treat all as market orders (worst case)
  - More conservative estimate of slippage

#### Percentage-Based Scaling Challenges
- **Balance Accuracy:** Target trader's balance must be accurately tracked
  - Solution: Periodically recalculate from positions + cash
  - Store balance snapshots for historical accuracy
- **Balance Updates:** Target's balance changes with every trade and price movement
  - Solution: Update balance before processing each trade batch
  - Use time-weighted balance for accuracy
- **Over-Leveraged Scenarios:** Target might have positions > 100% of capital
  - Solution: Set max position size limits
  - Log warnings when target is over-leveraged
- **Withdrawal/Deposit Detection:** Target adds/removes capital
  - Challenge: Hard to detect without transaction history
  - Impact: Throws off percentage calculations
  - Solution: Detect large balance changes, log anomalies
- **Different Portfolio Growth:** Your % returns should match, but absolute values diverge
  - Expected behavior: If target 2x their money, you should too (in %)
  - Monitor correlation to validate scaling accuracy

### 10.2 Risk Management
- Set max position size limits
- Implement capital preservation rules
- Track maximum drawdown
- Alert on unusual patterns

### 10.3 Performance Optimization
- Cache market data
- Batch database writes
- Implement connection pooling
- Use efficient data structures

### 10.4 Monitoring & Alerts
- Log all errors with context
- Alert on API failures
- Track API rate limit usage
- Monitor portfolio health

---

## 11. Success Metrics

### 11.1 System Performance
- Successfully fetch 100% of target trader's trades
- Process trades within 1 minute of detection
- Zero data corruption or loss
- 99%+ uptime during monitoring

### 11.2 Simulation Accuracy
- Accurate P&L calculations (verified against manual calculations)
- Proper position tracking (no orphaned positions)
- Correct fee accounting
- Match trader's actual performance (within timing constraints)

### 11.3 Reporting Quality
- Clear, actionable P&L reports
- Comprehensive trade logs
- Accurate performance metrics
- Exportable data for further analysis

### 11.4 Scaling Accuracy Metrics
- ROI correlation: Your ROI% should match target trader's ROI%
- Position size accuracy: Verify percentage allocations match
- Balance tracking accuracy: Target balance estimates vs actual
- Scaling consistency: All trades scaled by correct ratios

### 11.5 Slippage Metrics
- Average slippage per trade: Track cost vs target's price
- Slippage as % of trade: Average execution cost overhead
- Large trade impact: Slippage on trades >5% of book depth
- Fill rate: % of trades that could be fully executed
- Expected performance gap: Your ROI should be lower due to slippage
  - Example: If target makes +20%, you might make +18% due to slippage costs

---

## 12. Future Enhancements (Post-MVP)

### Core Trading Features
- **Live Trading Mode:** Execute real trades via API
- **Multi-Trader Support:** Track multiple traders simultaneously
- **Smart Order Routing:** Use limit orders instead of market orders to reduce slippage
- **Delayed Execution:** Wait for price to recover after target's impact

### Slippage Optimization
- **Limit Order Strategy:** Place limit orders at better prices, accept partial fills
- **Split Orders:** Break large orders into smaller chunks over time
- **Liquidity Analysis:** Only copy when sufficient liquidity exists
- **Alternative DEXs:** Check other exchanges for better prices
- **Slippage Prediction Model:** ML model to predict execution costs

### Analytics & Intelligence
- **Web Dashboard:** Real-time visualization of portfolio
- **Advanced Analytics:** Sharpe ratio, max drawdown, correlation analysis
- **Backtesting Engine:** Test against historical data with various parameters
- **Slippage Attribution:** Break down P&L into strategy vs execution
- **Trader Quality Scoring:** Rank traders by execution quality

### Automation & Alerts
- **Notification System:** Email/Slack alerts for trades and milestones
- **Strategy Filters:** Only copy trades meeting certain criteria
- **Risk Management:** Stop-loss, position sizing algorithms
- **High Slippage Alerts:** Warn when slippage exceeds threshold

### Advanced Features
- **Market Making:** Provide liquidity instead of taking
- **Machine Learning:** Predict which traders to follow
- **Front-running Detection:** Identify if we're being front-run
- **Optimal Copy Delay:** Find best delay to minimize slippage

---

## 13. Example Log Output

### 13.1 Trade Execution Log

```
[2026-01-23 14:32:01] INFO: Balance Update
  Target Trader: 0x1234...
  Portfolio Value: $87,450.23
  Cash: $12,300.00
  Positions Value: $75,150.23

[2026-01-23 14:32:15] INFO: New Trade Detected
  Market: "Will Trump win 2024?"
  Outcome: YES
  Side: BUY
  Target's Trade: $8,745 (10.00% of portfolio)
  Target's Price: $0.65
  Target's Shares: 13,453.85

[2026-01-23 14:32:15] INFO: Fetching Order Book
  Market: "Will Trump win 2024?" - YES
  Best Ask: $0.650 (75,234 shares)
  Best Bid: $0.648 (82,100 shares)
  Spread: 0.2% ($0.002)
  Total Ask Depth (10 levels): 425,000 shares

[2026-01-23 14:32:15] INFO: Simulating Order Execution
  Target's Trade Impact: Consumed 13,454 shares @ $0.650
  Order Book After Target:
    Ask: 61,780 @ $0.650 (remaining)
    Ask: 50,000 @ $0.651
    Ask: 35,000 @ $0.652
  
[2026-01-23 14:32:15] INFO: Executing Our Scaled Trade
  Our Portfolio Value: $10,523.45
  Desired Trade Size: $1,052.35 (10.00% of portfolio)
  Scaling Ratio: 1:8.31
  
  Our Order Execution:
    Fill 1: 1,619 @ $0.650 = $1,052.35
  
  Target's Price: $0.650
  Our Average Price: $0.650
  Price Impact: 0.00%
  Slippage Cost: $0.00 ✓
  
  Our Shares: 1,619.00
  Fee: $10.52 (1%)
  Total Cost: $1,062.87

[2026-01-23 14:32:15] SUCCESS: Trade Executed
  Position Updated: YES @ $0.65
  Remaining Cash: $9,460.58
  Portfolio Value: $10,523.45
  Total P&L: +$523.45 (+5.23%)

[2026-01-23 14:35:22] INFO: New Trade Detected
  Market: "Will Trump win 2024?"
  Outcome: YES
  Side: SELL
  Target's Trade: $4,372 (50% position close)
  Target's Price: $0.70

[2026-01-23 14:35:22] INFO: Executing Scaled Trade
  Selling 50% of Position
  Our Shares to Sell: 809.50
  Sale Price: $0.70
  Revenue: $566.65
  Realized P&L: +$40.48 (+3.84%)

[2026-01-23 14:35:22] SUCCESS: Position Partially Closed
  Remaining Shares: 809.50
  Cash After Sale: $10,017.71
  Total P&L: +$594.26 (+5.94%)

[2026-01-23 16:42:10] INFO: New Trade Detected (LARGE TRADE)
  Market: "Bitcoin > $100k by EOY?"
  Outcome: YES
  Side: BUY
  Target's Trade: $43,725 (50.00% of portfolio - WHALE TRADE!)
  Target's Price: $0.42 (average)
  Target's Shares: 104,107.14

[2026-01-23 16:42:10] WARN: Large Trade - Expect Significant Slippage
  Target consumed 104,107 shares
  This represents 41% of total order book depth
  
[2026-01-23 16:42:10] INFO: Fetching Order Book
  Best Ask: $0.410 (25,000 shares)
  Spread: 1.2%
  Total Ask Depth: 250,000 shares

[2026-01-23 16:42:10] INFO: Simulating After Target's Impact
  Order Book After Target Consumed 104k shares:
    Ask: $0.450 (12,500 shares)  <- Moved up 4 levels!
    Ask: $0.455 (18,000 shares)
    Ask: $0.460 (22,000 shares)
  Mid-price moved from $0.410 to $0.450 (+9.8%)

[2026-01-23 16:42:10] INFO: Executing Our Scaled Trade
  Our Portfolio Value: $10,594.26
  Desired Trade Size: $5,297.13 (50.00% of portfolio)
  Estimated Shares @ $0.450: 11,771.40
  
  Our Order Execution:
    Fill 1: 11,771 @ $0.450 = $5,297.13
  
  Target's Average Price: $0.420
  Our Average Price: $0.450
  Price Impact: +7.1% ⚠️
  Slippage Cost: -$353.13 (30 basis points worse entry!)
  
  Fee: $52.97 (1%)
  Total Cost: $5,350.10
  
[2026-01-23 16:42:10] WARN: High Slippage Trade
  We paid 7.1% more per share than target
  This will reduce our ROI on this position
  Expected P&L impact: -$353.13

[2026-01-23 16:42:10] SUCCESS: Position Opened
  Cash After Trade: $5,244.16
  Total Positions: 4
  Portfolio Value: $10,594.26
  Total P&L: +$594.26 (+5.94%)
```

### 13.2 Performance Summary Report

```
═══════════════════════════════════════════════════
  COPYTRADING PERFORMANCE SUMMARY
═══════════════════════════════════════════════════

Period: Jan 1, 2026 - Jan 23, 2026 (23 days)
Target Trader: 0x1234...5678

┌─────────────────────────────────────────────────┐
│  PORTFOLIO COMPARISON                           │
├─────────────────────────────────────────────────┤
│                    TARGET        YOU            │
│ Starting Capital   $100,000      $10,000        │
│ Current Value      $124,300      $12,415        │
│ Total P&L          +$24,300      +$2,415        │
│ ROI                +24.30%       +24.15%        │
│ Difference         -             -0.15%         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  TRADE STATISTICS                               │
├─────────────────────────────────────────────────┤
│ Total Trades       42                           │
│ Winning Trades     28 (66.7%)                   │
│ Losing Trades      14 (33.3%)                   │
│ Avg Trade Size     $512.35 (4.8% of portfolio)  │
│ Largest Win        +$234.50 (+2.3%)             │
│ Largest Loss       -$98.23 (-0.98%)             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  SLIPPAGE ANALYSIS                              │
├─────────────────────────────────────────────────┤
│ Avg Slippage       0.31% per trade              │
│ Total Slippage Cost -$142.30 (-1.42%)           │
│ Trades with >1% Slippage: 8 (19%)               │
│ Worst Slippage     7.1% (Bitcoin trade)         │
│ Fill Rate          100% (all orders filled)     │
│                                                  │
│ Performance Gap (vs Target):                    │
│   Expected: -0.15% (mostly slippage)            │
│   ROI Impact: Slippage reduced returns by 1.4%  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  CURRENT POSITIONS                              │
├─────────────────────────────────────────────────┤
│ Market                    Size    P&L           │
│ Trump 2024               8.5%     +$142.30      │
│ Bitcoin > $100k          5.2%     +$67.80       │
│ Fed Rate Cut in March    3.1%     -$23.40       │
└─────────────────────────────────────────────────┘

Performance Correlation: 99.38% ✓
Scaling Accuracy: 99.85% ✓
Balance Tracking Errors: 0
```

---

## 14. Next Steps

1. **Review & Approve Design:** Stakeholder sign-off on this document
2. **Set Up Development Environment:** Initialize repo, install dependencies
3. **Create Project Skeleton:** Set up folder structure, configs
4. **Begin Phase 1 Implementation:** Start with foundation
5. **Iterative Development:** Build, test, refine each phase

---

**Document Version:** 1.0  
**Last Updated:** January 23, 2026  
**Author:** System Architect  
**Status:** Draft - Awaiting Review
