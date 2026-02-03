import { ClobClient } from '@polymarket/clob-client';
import { Position } from '../models/position.js';
import { Repository } from '../database/repository.js';
import { log } from '../utils/logger.js';

export class PriceUpdater {
  constructor(
    private client: ClobClient,
    private repository: Repository
  ) {}

  /**
   * Update current prices for all open positions
   */
  async updatePositionPrices(): Promise<void> {
    try {
      const openPositions = this.repository.getOpenPositions();
      
      if (openPositions.length === 0) {
        return;
      }

      // Fetch all markets
      const markets = await this.client.getMarkets();
      const marketData = (markets as any)?.data || [];

      let updatedCount = 0;

      for (const position of openPositions) {
        try {
          // Find market by condition ID  
          const market = marketData.find((m: any) => m.condition_id === position.marketId);
          
          if (!market) {
            log.debug('Market not found for position', {
              marketId: position.marketId,
            });
            continue;
          }

          // Find token price
          const token = market.tokens?.find((t: any) => t.token_id === position.outcomeId);
          
          if (token && token.price !== undefined) {
            const newPrice = parseFloat(token.price);
            
            if (newPrice !== position.currentPrice) {
              position.currentPrice = newPrice;
              
              // Recalculate totalInvested from shares and avgEntryPrice to prevent drift
              if (position.shares > 0 && position.averageEntryPrice > 0) {
                position.totalInvested = position.shares * position.averageEntryPrice;
              }
              
              position.unrealizedPnL = (position.shares * newPrice) - position.totalInvested;
              position.updatedAt = new Date();
              
              this.repository.savePosition(position);
              updatedCount++;
              
              log.debug('Position price updated', {
                market: position.marketQuestion.substring(0, 30) + '...',
                newPrice: newPrice.toFixed(4),
                unrealizedPnL: position.unrealizedPnL.toFixed(2),
              });
            }
          }
        } catch (error: any) {
          log.warn('Failed to update price for position', {
            positionId: position.id,
            error: error.message,
          });
        }
      }

      if (updatedCount > 0) {
        log.info('Position prices updated', {
          updated: updatedCount,
          total: openPositions.length,
        });
      }
    } catch (error: any) {
      log.error('Failed to update position prices', {
        error: error.message,
      });
    }
  }
}
