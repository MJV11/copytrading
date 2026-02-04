# Quick Start Guide

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Configuration File

Copy the example environment file:

```bash
cp .env.example .env
```

### 3. Configure Your Simulation

Edit `.env` with your settings:

```bash
# REQUIRED: The Polymarket trader you want to copy
TARGET_TRADER_ADDRESS=0x1234567890abcdef1234567890abcdef12345678

# REQUIRED: Estimate of their current portfolio value
TARGET_TRADER_BALANCE=100000

# REQUIRED: Your starting virtual capital
INITIAL_CAPITAL=10000

# Optional: Scale factor (1.0 = exact percentage match, 0.5 = half size)
COPY_RATIO=1.0

# Optional: Enable realistic slippage simulation (recommended)
ENABLE_SLIPPAGE_SIMULATION=true
```

### 4. Run the Simulation

```bash
# Development mode (with TypeScript)
npm run dev

# Or build and run production version
npm run build
npm start
```

## How to Find a Trader Address

1. Go to [Polymarket](https://polymarket.com)
2. Find a trader's profile
3. Copy their wallet address from the URL or profile

For example, a top trader's address might look like:
`0x1234567890abcdef1234567890abcdef12345678`

## What Happens When You Run It

1. **Connects to Polymarket API** - Fetches target trader's trades
2. **Monitors for New Trades** - Polls every 60 seconds (configurable)
3. **Calculates Position Sizes** - Determines what % of their portfolio each trade represents
4. **Simulates Execution** - Models order book slippage and execution costs
5. **Tracks Performance** - Updates your virtual portfolio and P&L
6. **Generates Reports** - Shows detailed performance metrics

## Example Output

```
═══════════════════════════════════════════════════════════
  COPYTRADING PERFORMANCE SUMMARY
═══════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────┐
│  PORTFOLIO OVERVIEW                             │
├─────────────────────────────────────────────────┤
│ Initial Capital    $            10,000.00 │
│ Current Value      $            10,523.45 │
│ Available Cash     $             5,244.16 │
│ Total P&L          🟢 +$           523.45 │
│ ROI                🟢 +           5.23% │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  SLIPPAGE ANALYSIS                              │
├─────────────────────────────────────────────────┤
│ Avg Slippage/Trade $                  0.12 │
│ Total Slippage Cost $                 5.04 │
│ Avg Price Impact            0.31% │
│ High Slippage (>1%)                  2 │
└─────────────────────────────────────────────────┘
```

## Understanding the Results

### Performance Metrics

- **Total P&L**: Your profit/loss in dollars
- **ROI**: Your return on investment as a percentage
- **Win Rate**: Percentage of closed positions that were profitable

### Slippage Analysis

- **Avg Slippage/Trade**: Average execution cost per trade
- **Total Slippage Cost**: Total cost of slippage (why your ROI < target's)
- **Price Impact**: How much prices moved due to order book depth

### Key Insights

- Your ROI% should closely match the target trader's ROI%
- Slippage cost shows the "tax" of copytrading
- High slippage trades indicate illiquid markets (risky to copy)

## Stopping the Simulation

Press `Ctrl+C` to gracefully stop the simulation. It will:
- Save final portfolio state to database
- Generate a final performance report
- Close all connections cleanly

## Data Files

All data is stored in:
- `data/trades.db` - SQLite database with all trades and positions
- `logs/` - Log files for debugging

## Advanced Configuration

See `.env.example` for all available options including:
- Risk management (max position sizes)
- Slippage thresholds
- API rate limits
- Historical backtest mode

## Troubleshooting

### "Cannot find trader trades"
- Verify the trader address is correct
- Check that the trader has recent trading activity
- Ensure API endpoint is accessible

### "Insufficient liquidity" warnings
- The trader is making very large trades
- Consider lowering `COPY_RATIO`
- Or set `SKIP_TRADE_IF_INSUFFICIENT_LIQUIDITY=false`

### High slippage costs
- Normal for traders who make large trades
- Shows why small traders can't easily copy whales
- Consider finding a smaller trader to copy

## Next Steps

1. Run simulation on historical data (set `START_DATE` in .env)
2. Compare multiple traders
3. Analyze slippage patterns across different markets
4. Use insights to decide if live copytrading is viable
