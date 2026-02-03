import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';
import { Trade } from '../models/trade.js';
import { OrderBook, OrderLevel } from '../models/orderbook.js';

export class PolymarketAPI {
  private client: AxiosInstance;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 100; // Rate limiting: 100ms between requests

  constructor() {
    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Add API key if available - Polymarket uses X-API-Key header
    if (config.polymarketApiKey) {
      headers['X-API-Key'] = config.polymarketApiKey;
      headers['POLY_API_KEY'] = config.polymarketApiKey; // Try both header formats
    }

    this.client = axios.create({
      baseURL: config.polymarketApiUrl,
      headers,
      timeout: 10000,
    });

    log.info('Polymarket API client initialized', { 
      baseURL: config.polymarketApiUrl,
      hasApiKey: !!config.polymarketApiKey 
    });
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch trades for a specific trader
   */
  async getTradesByTrader(
    address: string,
    afterTimestamp?: Date,
    limit: number = 100
  ): Promise<Trade[]> {
    await this.rateLimit();

    try {
      // Polymarket CLOB API endpoint structure
      const params: any = {
        _limit: limit,
      };

      if (afterTimestamp) {
        params._gt = Math.floor(afterTimestamp.getTime() / 1000);
      }

      // Try the correct endpoint format
      const response = await this.client.get(`/trades/${address}`, { params });
      
      log.debug(`Fetched ${response.data?.length || 0} trades for ${address}`);
      
      if (!response.data || response.data.length === 0) {
        log.warn('No trades found for this address', { address });
        return [];
      }
      
      return response.data.map((trade: any) => this.parseTrade(trade));
    } catch (error: any) {
      if (error.response?.status === 401) {
        log.error('API Authentication required - you may need a Polymarket API key', {
          address,
          status: 401,
        });
      } else if (error.response?.status === 404) {
        log.warn('Trader not found or no trades available', {
          address,
          status: 404,
        });
      } else {
        log.error('Failed to fetch trades', {
          address,
          error: error.message,
          status: error.response?.status,
        });
      }
      // Return empty array instead of throwing to keep app running
      return [];
    }
  }

  /**
   * Fetch order book for a specific market and outcome
   */
  async getOrderBook(marketId: string, outcomeId: string): Promise<OrderBook> {
    await this.rateLimit();

    try {
      // Polymarket uses token_id in their CLOB API
      const response = await this.client.get(`/book`, {
        params: {
          token_id: outcomeId,
        },
      });
      
      return this.parseOrderBook(marketId, outcomeId, response.data);
    } catch (error: any) {
      log.error('Failed to fetch order book', {
        marketId,
        outcomeId,
        error: error.message,
        status: error.response?.status,
      });
      
      throw new Error(`Failed to fetch order book: ${error.message}`);
    }
  }

  /**
   * Fetch current positions for a trader
   */
  async getPositions(address: string): Promise<any[]> {
    await this.rateLimit();

    try {
      // Note: Polymarket may not have a public positions endpoint
      // We may need to use their subgraph or on-chain data
      const response = await this.client.get(`/positions/${address}`);
      
      log.debug(`Fetched ${response.data?.length || 0} positions for ${address}`);
      
      return response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        log.debug('No positions endpoint available, will calculate from trades', {
          address,
        });
        return [];
      }
      
      log.warn('Failed to fetch positions, returning empty', {
        address,
        error: error.message,
        status: error.response?.status,
      });
      return [];
    }
  }

  /**
   * Get market details
   */
  async getMarket(marketId: string): Promise<any> {
    await this.rateLimit();

    try {
      const response = await this.client.get(`/markets/${marketId}`);
      return response.data;
    } catch (error: any) {
      log.error('Failed to fetch market', {
        marketId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse raw trade data from API
   */
  private parseTrade(raw: any): Trade {
    return {
      id: raw.id || `trade_${raw.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(raw.timestamp * 1000),
      traderAddress: raw.trader_address || raw.trader,
      marketId: raw.market_id || raw.market,
      marketQuestion: raw.market_question || raw.question || 'Unknown',
      outcomeId: raw.outcome_id || raw.outcome,
      side: raw.side === 'buy' || raw.side === 'BUY' ? 'BUY' : 'SELL',
      shares: parseFloat(raw.shares || raw.amount || '0'),
      price: parseFloat(raw.price),
      totalCost: parseFloat(raw.total_cost || raw.cost || (raw.shares * raw.price)),
      fee: parseFloat(raw.fee || '0'),
      transactionHash: raw.transaction_hash || raw.tx_hash,
      source: 'api',
    };
  }

  /**
   * Parse raw order book data from API
   */
  private parseOrderBook(marketId: string, outcomeId: string, raw: any): OrderBook {
    const bids = this.parseOrderLevels(raw.bids || []);
    const asks = this.parseOrderLevels(raw.asks || []);

    const spread = asks.length > 0 && bids.length > 0 
      ? asks[0].price - bids[0].price 
      : 0;

    return {
      marketId,
      outcomeId,
      timestamp: new Date(),
      bids,
      asks,
      spread,
    };
  }

  /**
   * Parse and sort order levels
   */
  private parseOrderLevels(levels: any[]): OrderLevel[] {
    const parsed = levels.map((level: any) => ({
      price: parseFloat(level.price || level[0]),
      size: parseFloat(level.size || level[1]),
      cumulativeSize: 0, // Will be calculated
    }));

    // Calculate cumulative sizes
    let cumulative = 0;
    for (const level of parsed) {
      cumulative += level.size;
      level.cumulativeSize = cumulative;
    }

    return parsed;
  }

  /**
   * Calculate trader's portfolio balance
   */
  async calculateTraderBalance(address: string): Promise<number> {
    try {
      const positions = await this.getPositions(address);
      
      // Calculate total value of positions
      const positionsValue = positions.reduce((sum, pos) => {
        const shares = parseFloat(pos.shares || 0);
        const currentPrice = parseFloat(pos.current_price || pos.price || 0);
        return sum + (shares * currentPrice);
      }, 0);

      // Note: Getting cash balance might require different endpoint or on-chain query
      // For now, we'll use positions value as a proxy
      // In production, you'd want to query the blockchain for actual balance
      
      log.debug(`Calculated trader balance: $${positionsValue.toFixed(2)}`, {
        address,
        positionsCount: positions.length,
      });

      return positionsValue;
    } catch (error: any) {
      log.error('Failed to calculate trader balance', {
        address,
        error: error.message,
      });
      throw error;
    }
  }
}
