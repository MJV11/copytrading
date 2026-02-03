#!/bin/bash
# Clean restart script

echo "Stopping any running instances..."
pkill -f "tsx src/index.ts" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
sleep 2

echo "Deleting database..."
rm -f data/trades.db*

echo "Starting fresh instance..."
npm run dev
