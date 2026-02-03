# Polymarket Copytrading Simulator

A realistic simulation engine for copytrading Polymarket accounts with percentage-based position scaling and order book slippage modeling.

## Features

- 📊 **Percentage-based scaling**: Match trader's position sizes relative to portfolio
- 💹 **Realistic slippage simulation**: Model actual order book execution costs
- 📈 **Comprehensive P&L tracking**: Realized/unrealized gains with slippage attribution
- 🎯 **Accurate position management**: Track entries, exits, and portfolio state
- 📉 **Performance analytics**: Compare your ROI vs target trader's performance

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your target trader address and settings.

### 3. Run Simulation

```bash
# Development mode (with auto-reload)
npm run dev

# Production build
npm run build
npm start
```

## Configuration

Key settings in `.env`:

- `TARGET_TRADER_ADDRESS`: Wallet address to copy
- `INITIAL_CAPITAL`: Your starting virtual capital
- `COPY_RATIO`: Position sizing multiplier (1.0 = exact percentage match)
- `ENABLE_SLIPPAGE_SIMULATION`: Model realistic execution costs

See `.env.example` for all options.

## How It Works

1. **Monitor**: Fetches target trader's trades from Polymarket API
2. **Calculate**: Determines trade size as % of their portfolio
3. **Scale**: Applies same % to your virtual portfolio
4. **Simulate**: Models order book execution with slippage
5. **Execute**: Updates virtual positions and tracks P&L
6. **Report**: Generates detailed performance analytics

## Project Structure

```
src/
├── config/          # Configuration management
├── models/          # Data models (Trade, Position, Portfolio)
├── database/        # SQLite database and repositories
├── services/        # Core business logic
│   ├── polymarket-api.ts    # API client
│   ├── data-fetcher.ts      # Trade monitoring
│   ├── slippage-simulator.ts # Order book simulation
│   └── trade-executor.ts     # Execution engine
├── analytics/       # P&L and performance calculations
├── utils/           # Logging and helpers
└── index.ts         # Main entry point
```

## Design Document

See [DESIGN.md](./DESIGN.md) for complete technical design.

## License

MIT
