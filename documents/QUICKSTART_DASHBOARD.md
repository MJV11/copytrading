# Quick Start: Copytrading Dashboard

This guide will help you get both the copytrading simulator and web dashboard running.

## Prerequisites

- Node.js v20 or higher
- npm or yarn
- A Polymarket trader address to copy

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This installs both the simulator and dashboard dependencies.

### 2. Configure Your Settings

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Required: Trader to copy
TARGET_TRADER_ADDRESS=0x1234...

# Your virtual capital
INITIAL_CAPITAL=10000
TARGET_TRADER_BALANCE=100000

# Copy ratio (1.0 = match their position sizes exactly)
COPY_RATIO=1.0

# Database location
DATABASE_PATH=./data/trades.db
```

### 3. Start the Simulator

In your first terminal:

```bash
npm run dev
```

This will:
- Monitor the target trader's trades
- Execute simulated copies with slippage
- Store all data in SQLite database
- Print performance reports to console

### 4. Start the Dashboard

In a second terminal:

```bash
npm run web
```

This will:
- Start Next.js on http://localhost:3000
- Automatically refresh every 10 seconds
- Display all your trading data in a beautiful UI

### 5. View Your Dashboard

Open your browser to:

```
http://localhost:3000
```

## What You'll See

### Portfolio Overview
Four key metrics cards:
- **Total Value**: Current portfolio value
- **Total P&L**: Profit/loss with percentage
- **Available Cash**: Uninvested capital
- **Win Rate**: Success rate of closed positions

### Statistics
- Total trades (buys vs sells)
- Average slippage per trade
- Average price impact

### Performance Chart
Line chart showing:
- Portfolio value over time
- Cumulative P&L

### Positions Table
Switch between:
- **Open Positions**: Current holdings with unrealized P&L
- **Closed Positions**: Completed trades with realized P&L

### Recent Trades
Detailed log of all executed trades with:
- Timestamp
- Buy/Sell side
- Market details
- Execution price
- Slippage costs

## Tips

### Auto-Refresh
The dashboard auto-refreshes every 10 seconds. You can:
- Toggle this on/off with the checkbox
- Manually refresh with the button

### Multiple Windows
Run both terminals side by side to:
- Watch trades execute in real-time
- See the dashboard update immediately

### Database
All data is stored in `./data/trades.db`. You can:
- Keep this file to preserve history
- Delete it to start fresh
- Copy it to analyze elsewhere

## Troubleshooting

### No trades showing up?

The simulator is waiting for new trades. The target trader must execute trades for you to see activity.

### Dashboard shows no data?

Make sure:
1. The simulator has run and created `./data/trades.db`
2. The DATABASE_PATH in .env matches the actual database location
3. At least one trade has been executed

### Port 3000 already in use?

Change the port:
```bash
PORT=3001 npm run web
```

### Simulator not finding trades?

Check [CURRENT_STATUS.md](./CURRENT_STATUS.md) for data source status and solutions.

## Production Deployment

### Build for Production

```bash
# Build the dashboard
npm run web:build

# Start production server
npm run web:start
```

### Long-term Running

Use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start simulator
pm2 start npm --name "copytrading-sim" -- run dev

# Start dashboard
pm2 start npm --name "copytrading-web" -- run web:start

# View logs
pm2 logs

# Save configuration
pm2 save
pm2 startup
```

## Next Steps

- **Monitor Performance**: Watch your portfolio grow (or learn from mistakes)
- **Adjust Copy Ratio**: Fine-tune position sizing
- **Analyze Slippage**: See how execution costs impact returns
- **Compare Traders**: Try different target addresses

## Additional Documentation

- [WEB_DASHBOARD.md](./WEB_DASHBOARD.md) - Detailed dashboard features
- [DESIGN.md](./DESIGN.md) - Technical architecture
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - Data source information
- [README.md](./README.md) - Main project documentation

## Support

For issues or questions:
1. Check the documentation files above
2. Review the terminal output for errors
3. Ensure your .env configuration is correct
4. Verify the target trader address is valid

Happy trading!
