import { Trade, createTradeId } from '../models/trade.js';
import { Position, createPositionId, calculateUnrealizedPnL } from '../models/position.js';
import { Portfolio, updatePortfolioMetrics } from '../models/portfolio.js';
import { OrderBook, getMidPrice } from '../models/orderbook.js';
import { Repository } from '../database/repository.js';
import { SlippageSimulator } from './slippage-simulator.js';
import { PolymarketSDK } from './polymarket-sdk.js';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';

export class TradeExecutor {
  constructor(
    private repository: Repository,
    private slippageSimulator: SlippageSimulator,
    private api: PolymarketSDK
  ) {}

  /**
   * Execute a trade with percentage-based scaling and slippage simulation
   */
  async executeTrade(
    targetTraderTrade: Trade,
    portfolio: Portfolio,
    targetTraderBalance: number
  ): Promise<void> {
    // Calculate trade age
    const tradeAge = Date.now() - targetTraderTrade.timestamp.getTime();
    const twoMinutesMs = 2 * 60 * 1000;

    // For SELL trades, always execute (mirror their exits immediately)
    // For BUY trades, check if trade is too old
    if (targetTraderTrade.side === 'BUY') {
      if (tradeAge > twoMinutesMs) {
        log.warn('BUY trade too old, skipping (no market speed advantage)', {
          tradeAge: `${(tradeAge / 1000).toFixed(0)}s`,
          maxAge: '120s',
          market: targetTraderTrade.marketQuestion,
        });
        return;
      }
    } else {
      log.info('SELL trade detected - executing immediately (mirror exit)', {
        market: targetTraderTrade.marketQuestion,
        tradeAge: `${(tradeAge / 1000).toFixed(0)}s`,
      });
    }

    log.trade('Processing new trade from target trader', {
      marketQuestion: targetTraderTrade.marketQuestion,
      side: targetTraderTrade.side,
      shares: targetTraderTrade.shares,
      price: targetTraderTrade.price,
      totalCost: targetTraderTrade.totalCost,
      tradeAge: `${(tradeAge / 1000).toFixed(0)}s`,
    });

    // 1. Calculate the percentage of target trader's portfolio
    const tradePercentOfTarget = targetTraderTrade.totalCost / targetTraderBalance;

    log.info('Calculating scaled trade size', {
      targetTradePercent: `${(tradePercentOfTarget * 100).toFixed(2)}%`,
      targetTraderBalance: targetTraderBalance,
      ourPortfolioValue: portfolio.totalValue,
    });

    // 2. Calculate our scaled trade size (in dollars, before slippage)
    const ourPortfolioValue = portfolio.totalValue;
    const scaledTradeCost = ourPortfolioValue * tradePercentOfTarget * config.copyRatio;

    let orderBook: OrderBook | null = null;
    let slippageResult: any = null;
    let ourAveragePrice = targetTraderTrade.price;
    let ourShares = scaledTradeCost / targetTraderTrade.price;
    let actualCost = scaledTradeCost;
    let priceImpact = 0;
    let slippageCost = 0;

    // 3. Get current market price to validate trade is still executable
    let currentMarketPrice: number;
    try {
      // Fetch market data to get current price
      const market = await this.api.getMarket(targetTraderTrade.marketId);
      
      if (!market || !market.active || !market.accepting_orders) {
        log.warn('Market not active or not accepting orders - skipping trade', {
          market: targetTraderTrade.marketQuestion,
          active: market?.active,
          acceptingOrders: market?.accepting_orders,
        });
        return;
      }

      // Find current price for the specific token
      const token = market.tokens?.find((t: any) => t.token_id === targetTraderTrade.outcomeId);
      
      if (!token || token.price === undefined) {
        log.warn('No current price available for outcome - skipping trade', {
          market: targetTraderTrade.marketQuestion,
          outcomeId: targetTraderTrade.outcomeId,
        });
        return;
      }

      currentMarketPrice = parseFloat(token.price);

      log.info('Current market price retrieved', {
        market: targetTraderTrade.marketQuestion,
        currentPrice: currentMarketPrice.toFixed(4),
        targetPrice: targetTraderTrade.price.toFixed(4),
      });

    } catch (error: any) {
      log.error('Failed to fetch market data - skipping trade', {
        market: targetTraderTrade.marketQuestion,
        error: error.message,
      });
      return;
    }

    // 4. Check price staleness for BUY trades
    if (targetTraderTrade.side === 'BUY') {
      const priceDifference = Math.abs(currentMarketPrice - targetTraderTrade.price);
      const maxPriceDifference = 0.02; // 2 cents

      if (priceDifference > maxPriceDifference) {
        log.warn('BUY price moved too much, skipping', {
          targetPrice: targetTraderTrade.price.toFixed(4),
          currentPrice: currentMarketPrice.toFixed(4),
          difference: priceDifference.toFixed(4),
          maxAllowed: '0.02',
        });
        return;
      }
    }

    // 5. Calculate execution at current market price
    ourAveragePrice = currentMarketPrice;
    ourShares = scaledTradeCost / currentMarketPrice;
    actualCost = ourShares * currentMarketPrice;
    priceImpact = ((currentMarketPrice - targetTraderTrade.price) / targetTraderTrade.price) * 100;
    slippageCost = (currentMarketPrice - targetTraderTrade.price) * ourShares;

    log.info('Execution price calculated', {
      targetPrice: targetTraderTrade.price.toFixed(4),
      currentPrice: currentMarketPrice.toFixed(4),
      shares: ourShares.toFixed(2),
      priceImpact: `${priceImpact.toFixed(4)}%`,
    });

    // 6. Calculate fees
    const fee = this.slippageSimulator.calculateFee(actualCost, false);
    const totalRequired = actualCost + fee;

    // 7. Validate trade prerequisites
    if (targetTraderTrade.side === 'BUY') {
      // Check sufficient capital for buying
      if (portfolio.availableCash < totalRequired) {
        log.warn('Insufficient capital for BUY trade - SKIPPING', {
          required: totalRequired.toFixed(2),
          available: portfolio.availableCash.toFixed(2),
          shortfall: (totalRequired - portfolio.availableCash).toFixed(2),
        });
        return;
      }
    } else {
      // Check if we own this position before selling
      const positionId = createPositionId(targetTraderTrade.marketId, targetTraderTrade.outcomeId);
      const existingPosition = this.repository.getPosition(positionId);

      if (!existingPosition || !existingPosition.isOpen || existingPosition.shares <= 0) {
        log.warn('Cannot SELL - we do not own this position', {
          market: targetTraderTrade.marketQuestion,
          outcome: targetTraderTrade.outcomeId,
          ourShares: existingPosition?.shares || 0,
          theyAreSelling: ourShares.toFixed(2),
        });
        return;
      }

      // Check if we have enough shares to sell
      if (existingPosition.shares < ourShares) {
        log.warn('Cannot SELL - insufficient shares in position', {
          market: targetTraderTrade.marketQuestion,
          ourShares: existingPosition.shares.toFixed(2),
          needToSell: ourShares.toFixed(2),
          shortfall: (ourShares - existingPosition.shares).toFixed(2),
        });
        // Sell only what we have
        ourShares = existingPosition.shares;
        actualCost = ourShares * ourAveragePrice;
        log.info('Adjusted to sell all available shares', {
          adjustedShares: ourShares.toFixed(2),
        });
      }
    }

    // 8. Create our executed trade
    const ourTrade: Trade = {
      ...targetTraderTrade,
      id: createTradeId(),
      shares: ourShares,
      price: ourAveragePrice,
      totalCost: actualCost,
      fee: fee,
      metadata: {
        originalTradeId: targetTraderTrade.id,
        targetTradePercent: tradePercentOfTarget,
        targetTraderBalance: targetTraderBalance,
        ourPortfolioValue: ourPortfolioValue,
        scalingRatio: actualCost / targetTraderTrade.totalCost,
        targetPrice: targetTraderTrade.price,
        ourAveragePrice: ourAveragePrice,
        priceImpact: priceImpact,
        slippageCost: slippageCost,
        fills: slippageResult?.fills,
      },
    };

    // 7. Update or create position
    await this.updatePosition(ourTrade, portfolio);

    // 8. Update portfolio cash
    const cashBefore = portfolio.availableCash;
    
    if (ourTrade.side === 'BUY') {
      portfolio.availableCash -= totalRequired;
      log.debug('Cash updated (BUY)', {
        before: cashBefore.toFixed(2),
        spent: totalRequired.toFixed(2),
        after: portfolio.availableCash.toFixed(2),
        change: (-totalRequired).toFixed(2),
      });
    } else {
      const cashIncrease = actualCost - fee;
      portfolio.availableCash += cashIncrease;
      log.debug('Cash updated (SELL)', {
        before: cashBefore.toFixed(2),
        proceeds: actualCost.toFixed(2),
        fee: fee.toFixed(2),
        netIncrease: cashIncrease.toFixed(2),
        after: portfolio.availableCash.toFixed(2),
        change: (+cashIncrease).toFixed(2),
      });
    }

    // 9. Update portfolio metrics
    const allPositions = this.repository.getAllPositions();
    updatePortfolioMetrics(portfolio, allPositions, config.initialCapital);

    // 10. Persist changes
    this.repository.saveTrade(ourTrade);
    this.repository.savePortfolioSnapshot(portfolio);

    // 11. Log execution summary
    log.trade('Trade executed successfully', {
      side: ourTrade.side,
      shares: ourTrade.shares.toFixed(2),
      averagePrice: ourAveragePrice.toFixed(4),
      totalCost: actualCost.toFixed(2),
      fee: fee.toFixed(2),
      slippageCost: ourTrade.metadata?.slippageCost?.toFixed(2),
      portfolioCash: portfolio.availableCash.toFixed(2),
      portfolioValue: portfolio.totalValue.toFixed(2),
    });

    log.pnl('Current P&L', {
      totalPnL: `$${portfolio.totalPnL.toFixed(2)}`,
      totalPnLPercent: `${portfolio.totalPnLPercent.toFixed(2)}%`,
      openPositions: portfolio.positions.length,
      winRate: `${portfolio.winRate.toFixed(1)}%`,
    });
  }

  /**
   * Update or create a position based on the trade
   */
  private async updatePosition(trade: Trade, portfolio: Portfolio): Promise<void> {
    const positionId = createPositionId(trade.marketId, trade.outcomeId);
    let position = this.repository.getPosition(positionId);

    if (!position) {
      // Create new position
      position = {
        id: positionId,
        marketId: trade.marketId,
        marketQuestion: trade.marketQuestion,
        outcomeId: trade.outcomeId,
        shares: 0,
        averageEntryPrice: 0,
        totalInvested: 0,
        currentPrice: trade.price,
        unrealizedPnL: 0,
        realizedPnL: 0,
        isOpen: true,
        openedAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (trade.side === 'BUY') {
      // Add to position
      position.shares += trade.shares;
      position.totalInvested += trade.totalCost + trade.fee;
      position.averageEntryPrice = position.totalInvested / position.shares;
      position.currentPrice = trade.price;

      log.position('Position increased', {
        market: position.marketQuestion,
        newShares: position.shares.toFixed(2),
        avgEntryPrice: position.averageEntryPrice.toFixed(4),
        invested: position.totalInvested.toFixed(2),
      });
    } else {
      // Reduce position (sell)
      const saleProceeds = trade.totalCost - trade.fee;
      const costBasis = position.averageEntryPrice * trade.shares;
      const pnlFromSale = saleProceeds - costBasis;

      position.realizedPnL += pnlFromSale;
      position.shares -= trade.shares;
      position.totalInvested -= costBasis; // Reduce invested proportionally
      position.currentPrice = trade.price;

      log.position('Position reduced', {
        market: position.marketQuestion,
        remainingShares: position.shares.toFixed(2),
        realizedPnL: pnlFromSale.toFixed(2),
        totalRealizedPnL: position.realizedPnL.toFixed(2),
      });

      // Close position if fully sold
      if (position.shares <= 0.001) {
        position.isOpen = false;
        position.closedAt = new Date();
        // Store exit price before zeroing shares
        position.averageExitPrice = trade.price;
        position.shares = 0;

        log.position('Position closed', {
          market: position.marketQuestion,
          averageExitPrice: position.averageExitPrice.toFixed(4),
          finalRealizedPnL: position.realizedPnL.toFixed(2),
        });
      }
    }

    // Update unrealized P&L
    position.unrealizedPnL = calculateUnrealizedPnL(position);
    position.updatedAt = new Date();

    // Save position
    this.repository.savePosition(position);
  }
}
