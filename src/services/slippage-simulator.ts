import { OrderBook, OrderLevel, SlippageResult, Fill, getMidPrice } from '../models/orderbook.js';
import { Trade } from '../models/trade.js';
import { log } from '../utils/logger.js';
import { config } from '../config/index.js';

export class SlippageSimulator {
  /**
   * Simulate order execution against the order book
   * Takes into account the target trader's impact on liquidity
   */
  async simulateOrderExecution(
    side: 'BUY' | 'SELL',
    desiredShares: number,
    orderBook: OrderBook,
    afterTargetTrade?: Trade
  ): Promise<SlippageResult> {
    // 1. Get the relevant side of the book
    const levels = side === 'BUY' ? [...orderBook.asks] : [...orderBook.bids];
    
    if (levels.length === 0) {
      throw new Error('Order book is empty - cannot execute trade');
    }

    // 2. Remove liquidity consumed by target trader if applicable
    let availableLevels = levels;
    if (afterTargetTrade) {
      availableLevels = this.removeConsumedLiquidity(levels, afterTargetTrade.shares);
      
      if (availableLevels.length === 0 || availableLevels[0].size === 0) {
        log.warn('Target trade consumed all liquidity in order book', {
          targetShares: afterTargetTrade.shares,
          totalBookDepth: levels.reduce((sum, l) => sum + l.size, 0),
        });
      }
    }

    // 3. Walk through order book levels to fill our order
    const fills: Fill[] = [];
    let remainingShares = desiredShares;
    let totalCost = 0;

    for (const level of availableLevels) {
      if (remainingShares <= 0) break;
      if (level.size <= 0) continue; // Skip empty levels

      const sharesToFill = Math.min(remainingShares, level.size);
      const cost = sharesToFill * level.price;

      fills.push({
        price: level.price,
        shares: sharesToFill,
        cost: cost,
      });

      totalCost += cost;
      remainingShares -= sharesToFill;
    }

    // 4. Check if we could fill the entire order
    const executedShares = desiredShares - remainingShares;
    
    if (remainingShares > 0) {
      const fillPercentage = (executedShares / desiredShares) * 100;
      
      log.warn('Insufficient liquidity - partial fill', {
        requested: desiredShares,
        executed: executedShares,
        unfilled: remainingShares,
        fillPercentage: `${fillPercentage.toFixed(2)}%`,
      });

      // Check if we should skip this trade
      if (config.skipTradeIfInsufficientLiquidity) {
        throw new Error(
          `Insufficient liquidity: only ${fillPercentage.toFixed(1)}% of order could be filled`
        );
      }
    }

    // 5. Calculate metrics
    const averagePrice = executedShares > 0 ? totalCost / executedShares : 0;
    const midPrice = getMidPrice(orderBook);
    const priceImpact = ((averagePrice - midPrice) / midPrice) * 100;

    // Check maximum allowed slippage
    if (Math.abs(priceImpact) > config.maxSlippagePercent) {
      log.warn('Slippage exceeds maximum allowed', {
        priceImpact: `${priceImpact.toFixed(2)}%`,
        maxAllowed: `${config.maxSlippagePercent}%`,
      });

      if (config.skipTradeIfInsufficientLiquidity) {
        throw new Error(
          `Price impact ${priceImpact.toFixed(2)}% exceeds max ${config.maxSlippagePercent}%`
        );
      }
    }

    const result: SlippageResult = {
      requestedShares: desiredShares,
      executedShares,
      averagePrice,
      priceImpact,
      totalCost,
      fills,
    };

    log.debug('Order execution simulated', {
      side,
      requestedShares: desiredShares.toFixed(2),
      executedShares: executedShares.toFixed(2),
      averagePrice: averagePrice.toFixed(4),
      priceImpact: `${priceImpact.toFixed(4)}%`,
      fillsCount: fills.length,
    });

    return result;
  }

  /**
   * Remove liquidity from order book levels that was consumed by a trade
   */
  private removeConsumedLiquidity(
    levels: OrderLevel[],
    sharesConsumed: number
  ): OrderLevel[] {
    const newLevels: OrderLevel[] = [];
    let remaining = sharesConsumed;

    for (const level of levels) {
      if (remaining <= 0) {
        // No more consumption, add remaining levels as-is
        newLevels.push({ ...level });
      } else if (level.size > remaining) {
        // Partial consumption of this level
        newLevels.push({
          price: level.price,
          size: level.size - remaining,
          cumulativeSize: level.cumulativeSize - remaining,
        });
        remaining = 0;
      } else {
        // Entire level consumed, skip it
        remaining -= level.size;
      }
    }

    return newLevels;
  }

  /**
   * Estimate slippage without full order book (fallback method)
   */
  estimateSlippageFromTradeSize(
    tradeSize: number,
    marketVolume24h: number,
    side: 'BUY' | 'SELL'
  ): number {
    // Conservative estimate based on trade size relative to daily volume
    const sizeRatio = tradeSize / marketVolume24h;
    
    // Base slippage + size-based slippage
    // Small trades: ~0.1-0.3%
    // Medium trades: ~0.5-1%
    // Large trades: ~1-5%
    const baseSlippage = 0.005; // 0.5%
    const sizeBasedSlippage = Math.sqrt(sizeRatio) * 0.05; // Square root scaling
    
    const totalSlippage = baseSlippage + sizeBasedSlippage;
    
    log.debug('Estimated slippage (fallback method)', {
      tradeSize,
      marketVolume24h,
      sizeRatio: `${(sizeRatio * 100).toFixed(4)}%`,
      estimatedSlippage: `${(totalSlippage * 100).toFixed(4)}%`,
    });
    
    return totalSlippage;
  }

  /**
   * Calculate the fee for a trade
   */
  calculateFee(totalCost: number, isMaker: boolean = false): number {
    // Polymarket fee structure
    const makerFee = 0.00; // 0% for limit orders
    const takerFee = 0.01; // 1% for market orders
    
    const feeRate = isMaker ? makerFee : takerFee;
    return totalCost * feeRate;
  }
}
