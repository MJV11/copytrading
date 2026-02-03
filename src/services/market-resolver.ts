import { ClobClient } from '@polymarket/clob-client';
import { log } from '../utils/logger.js';
import { Position } from '../models/position.js';
import { Repository } from '../database/repository.js';

export class MarketResolver {
  constructor(
    private client: ClobClient,
    private repository: Repository
  ) {
    log.info('Market resolver initialized');
  }

  /**
   * Check if a market has resolved and settle positions
   */
  async checkAndResolveMarkets(): Promise<void> {
    try {
      const openPositions = this.repository.getOpenPositions();

      if (openPositions.length === 0) {
        return;
      }

      log.info('Checking market resolution status', {
        openPositionsCount: openPositions.length,
      });

      for (const position of openPositions) {
        await this.checkPositionResolution(position);
      }
    } catch (error: any) {
      log.error('Failed to check market resolutions', {
        error: error.message,
      });
    }
  }

  /**
   * Check if a specific position's market has resolved
   */
  private async checkPositionResolution(position: Position): Promise<void> {
    try {
      // Fetch market data
      const market = await this.client.getMarket(position.marketId);

      // Check if market is closed and has a winner
      if (!market.closed) {
        return; // Market still active
      }

      log.info('Market resolved, settling position', {
        market: position.marketQuestion,
        marketId: position.marketId,
      });

      // Find the winning outcome
      const tokens = market.tokens || [];
      const winningToken = tokens.find((t: any) => t.winner === true);

      if (!winningToken) {
        log.warn('Market closed but no winner determined yet', {
          marketId: position.marketId,
        });
        return;
      }

      // Determine if our position won or lost
      const ourTokenId = position.outcomeId;
      const didWeWin = winningToken.token_id === ourTokenId;

      const settlementPrice = didWeWin ? 1.0 : 0.0;
      const settlementValue = position.shares * settlementPrice;
      const finalPnL = settlementValue - position.totalInvested;

      log.info('Position settled', {
        market: position.marketQuestion,
        outcome: didWeWin ? 'WON' : 'LOST',
        shares: position.shares.toFixed(2),
        invested: position.totalInvested.toFixed(2),
        settlementValue: settlementValue.toFixed(2),
        finalPnL: `${finalPnL >= 0 ? '+' : ''}${finalPnL.toFixed(2)}`,
      });

      // Update position with settlement
      position.currentPrice = settlementPrice;
      position.unrealizedPnL = 0;
      position.realizedPnL = finalPnL;
      position.isOpen = false;
      position.closedAt = new Date();
      position.updatedAt = new Date();

      // Save settled position
      this.repository.savePosition(position);

      log.info('Position closed and settled in database', {
        marketId: position.marketId,
        finalRealizedPnL: finalPnL.toFixed(2),
      });
    } catch (error: any) {
      log.error('Failed to check position resolution', {
        positionId: position.id,
        error: error.message,
      });
    }
  }

  /**
   * Get summary of resolved positions
   */
  getResolvedPositionsSummary(): {
    totalResolved: number;
    wins: number;
    losses: number;
    totalPnL: number;
  } {
    const allPositions = this.repository.getAllPositions();
    const closedPositions = allPositions.filter(p => !p.isOpen);

    const wins = closedPositions.filter(p => p.realizedPnL > 0).length;
    const losses = closedPositions.filter(p => p.realizedPnL < 0).length;
    const totalPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);

    return {
      totalResolved: closedPositions.length,
      wins,
      losses,
      totalPnL,
    };
  }
}
