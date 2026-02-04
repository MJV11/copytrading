# Control Panel Guide

The dashboard now includes a full control panel to manage your copytrading bot directly from the web interface!

## Features

### 🎮 Complete Control from Browser

No more switching between terminals! Everything is now in the dashboard:

1. **Configure Trading Settings**
2. **Start/Stop Trading**
3. **Reset Database**
4. **Monitor Performance**

All from **http://localhost:3000**

## How to Use

### 1. Start the Dashboard

```bash
npm run web
```

Open **http://localhost:3000** in your browser.

### 2. Configure Your Bot

At the top of the dashboard, you'll see the **Trading Control** panel.

#### Required Settings:
- **Target Trader Address**: The Ethereum address you want to copy (e.g., `0x1234...`)

#### Optional Settings (Click "Show Settings"):
- **Initial Capital**: Starting balance in dollars (default: $1000)
- **Copy Ratio**: Position size multiplier (default: 1.0)
  - `1.0` = Match their exact position sizes
  - `0.5` = Half their position sizes
  - `2.0` = Double their position sizes
- **Polling Interval**: How often to check for new trades in seconds (default: 10s)
- **Max Slippage**: Maximum acceptable slippage percentage (default: 10%)

### 3. Start Trading

1. Enter the trader address
2. (Optional) Click "Show Settings" to adjust parameters
3. Click **"Start Trading"**

The bot will:
- ✓ Save your configuration
- ✓ Create/update the .env file
- ✓ Start monitoring the target trader
- ✓ Execute copytrading automatically
- ✓ Update the dashboard in real-time

### 4. Monitor Performance

While trading is running:
- Portfolio values update automatically
- New positions appear in the table
- Trades are logged in real-time
- Charts update to show performance

### 5. Stop Trading

Click **"Stop Trading"** to:
- Stop monitoring the target trader
- Halt trade execution
- Preserve all data in the database

### 6. Switch Traders

To copy a different trader:

1. Click **"Stop Trading"**
2. Click **"Reset Database"** (clears old data)
3. Enter new trader address
4. Click **"Start Trading"**

## Status Indicators

### Green Dot (Pulsing)
Trading is **active** - bot is running

### Gray Dot (Static)
Trading is **stopped** - bot is idle

## Settings Explained

### Initial Capital
Your starting virtual balance. This determines:
- How much you can invest
- Position sizing calculations
- P&L percentage calculations

**Example**: With $1000 initial capital and 1.0 copy ratio, if the target trader invests 10% of their portfolio ($10,000 = $1,000 investment), you'll invest 10% of yours ($1,000 = $100 investment).

### Copy Ratio
Controls position sizing relative to the target trader:

- **1.0** (default): Match their exact percentages
- **< 1.0**: Smaller positions (more conservative)
- **> 1.0**: Larger positions (more aggressive)

**Example**:
- Target trader invests 5% of portfolio
- Your copy ratio: 2.0
- You invest: 10% of your portfolio (5% × 2.0)

### Polling Interval
How frequently to check for new trades:

- **Lower** (e.g., 5s): Faster reaction, more API calls
- **Higher** (e.g., 30s): Slower reaction, fewer API calls

**Recommended**: 10-15 seconds balances speed and efficiency

### Max Slippage
Maximum acceptable price movement during execution:

- Trade is **skipped** if expected slippage exceeds this
- Protects against executing in illiquid markets
- Higher values = more aggressive, more trades executed

**Recommended**: 5-10% for most markets

## Database Reset

**⚠️ Warning**: This permanently deletes all:
- Trade history
- Positions (open and closed)
- Portfolio snapshots
- Performance data

Use when:
- Switching to a new trader
- Starting fresh after testing
- Clearing corrupted data

## Advantages Over Old Method

### Before (Two Terminals)
```bash
# Terminal 1
npm run dev

# Terminal 2  
npm run web

# To change settings:
# 1. Stop both
# 2. Edit .env file
# 3. Restart both
```

### Now (One Browser)
```bash
# Just one command
npm run web

# Everything else in the browser!
```

## Troubleshooting

### "Trading is already running"
Another instance is running. Click "Stop Trading" first, or:
```bash
rm .trading.pid
```

### Settings are grayed out
Settings can only be changed when trading is stopped. Click "Stop Trading" first.

### Database won't reset
Make sure trading is stopped first. The reset button is disabled while running.

### Bot doesn't start
Check that:
1. Trader address is valid (starts with 0x, 42 characters)
2. Initial capital is positive
3. All settings are within valid ranges

### No trades appearing
This is normal if:
- Target trader hasn't made any trades recently
- You just started (bot is waiting for new trades)
- Check CURRENT_STATUS.md for data source issues

## Technical Details

### What Happens When You Click "Start"

1. Config saved to `trading-config.json`
2. `.env` file updated with your settings
3. Background process spawned (`npm run dev`)
4. Process ID saved to `.trading.pid`
5. Database initialized (if doesn't exist)
6. Trading loop begins

### What Happens When You Click "Stop"

1. Process ID read from `.trading.pid`
2. SIGTERM signal sent to process
3. Process gracefully shuts down
4. `.trading.pid` file deleted
5. Config updated (isRunning: false)

### Files Created

- `trading-config.json` - Your current settings
- `.trading.pid` - Process ID when running
- `.env` - Environment variables for simulator
- `data/trades.db` - SQLite database

All are in `.gitignore` - won't be committed.

## Best Practices

### 1. Start Conservative
- Use lower copy ratio (0.5 or 0.1)
- Set reasonable max slippage (5-10%)
- Start with smaller initial capital to test

### 2. Monitor Regularly
- Check dashboard periodically
- Watch for high slippage trades
- Review closed positions for patterns

### 3. Adjust Gradually
- Don't change multiple settings at once
- Test each change before further tweaks
- Document what works

### 4. Reset When Needed
- Reset database when switching traders
- Reset if you see accounting discrepancies
- Reset after major setting changes

## Next Steps

1. Enter a trader address and start trading
2. Monitor the dashboard as trades execute
3. Analyze performance in the positions table
4. Adjust settings based on results
5. Iterate and optimize!

Enjoy your fully automated copytrading dashboard! 🚀
