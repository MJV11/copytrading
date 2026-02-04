# Web Dashboard

A beautiful Next.js dashboard for visualizing your Polymarket copytrading performance in real-time.

## Features

- **Real-time Portfolio Overview**: Track total value, P&L, available cash, and win rate
- **Performance Charts**: Visualize portfolio growth over time
- **Position Management**: View open and closed positions with detailed metrics
- **Trade History**: Monitor all executed trades with slippage analysis
- **Auto-refresh**: Automatic data updates every 10 seconds
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Quick Start

### 1. Start the Copytrading Simulator

First, ensure your copytrading simulator is running and has created a database:

```bash
npm run dev
```

This will create the database at `./data/trades.db` with all your trading data.

### 2. Start the Web Dashboard

In a separate terminal, start the Next.js dashboard:

```bash
npm run web
```

The dashboard will be available at [http://localhost:3000](http://localhost:3000)

### 3. View Your Performance

Open your browser and navigate to `http://localhost:3000` to see:

- Portfolio performance metrics
- Real-time position tracking
- Trade execution history
- Performance charts
- Slippage analysis

## Dashboard Sections

### Portfolio Overview
Displays four key metrics:
- **Total Value**: Current portfolio value
- **Total P&L**: Profit/loss in dollars and percentage
- **Available Cash**: Uninvested capital
- **Win Rate**: Percentage of profitable closed positions

### Statistics
Shows trading activity metrics:
- **Total Trades**: Number of buys and sells
- **Average Slippage**: Cost of execution per trade
- **Average Price Impact**: Market impact of trades

### Performance Chart
Line chart showing:
- Portfolio value over time
- Cumulative P&L trend

### Positions Table
Two tabs for viewing:
- **Open Positions**: Active positions with unrealized P&L
- **Closed Positions**: Completed positions with realized P&L

### Recent Trades
Detailed trade log showing:
- Execution time
- Buy/sell direction
- Market details
- Shares and pricing
- Slippage costs

## Configuration

The dashboard automatically connects to your database. If you need to change the database location, set the `DATABASE_PATH` environment variable:

```bash
# In your .env file
DATABASE_PATH=./data/trades.db
```

## Production Deployment

### Build for Production

```bash
npm run web:build
```

### Start Production Server

```bash
npm run web:start
```

The production server will run on port 3000 by default.

## Technology Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Performance visualization
- **better-sqlite3**: Database access
- **Lucide React**: Beautiful icons

## Auto-Refresh

The dashboard automatically refreshes every 10 seconds to show the latest data. You can:
- Toggle auto-refresh on/off
- Manually refresh using the button in the header

## Browser Support

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Performance

The dashboard is optimized for performance:
- Server-side database queries
- Client-side caching
- Efficient re-renders
- Lazy loading components

## Troubleshooting

### No data showing
- Ensure the simulator has run and created trades
- Check that `DATABASE_PATH` points to the correct database
- Verify the database file exists and has data

### Dashboard won't start
- Make sure port 3000 is not in use
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors with `npm run lint`

### Slow updates
- Database queries are optimized, but very large datasets may be slower
- Consider limiting the history retention in the simulator

## Development

To modify the dashboard:

1. Edit components in `app/components/`
2. Modify API routes in `app/api/`
3. Update styles in `app/globals.css`

Changes will hot-reload automatically in development mode.
