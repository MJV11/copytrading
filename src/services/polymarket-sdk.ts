import { ClobClient, Chain, AssetType } from '@polymarket/clob-client';
import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';
import { Trade, createTradeId } from '../models/trade.js';
import { OrderBook, OrderLevel } from '../models/orderbook.js';
import { PolymarketDataAPI } from './polymarket-data-api.js';

export class PolymarketSDK {
  private client: ClobClient;
  private httpClient: AxiosInstance;
  private dataAPI: PolymarketDataAPI;

  constructor() {
    // Initialize the CLOB client for public methods
    this.client = new ClobClient(
      config.polymarketApiUrl,
      Chain.POLYGON
    );

    // Create HTTP client for direct API calls with read-only API key
    this.httpClient = axios.create({
      baseURL: config.polymarketApiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.polymarketApiKey && { 'Authorization': `Bearer ${config.polymarketApiKey}` }),
      },
      timeout: 10000,
    });

    // Initialize data API for trade monitoring (public, no auth needed!)
    this.dataAPI = new PolymarketDataAPI();

    log.info('Polymarket SDK initialized', {
      hasApiKey: !!config.polymarketApiKey,
      chain: 'POLYGON (137)',
      mode: 'Data API',
      dataSource: 'data-api.polymarket.com (public)',
      targetBalanceSource: 'Configured estimate',
    });
  }

  /**
   * Initialize SDK (test connections)
   */
  async initialize(): Promise<void> {
    await this.dataAPI.testConnection();
  }

  /**
   * Fetch trades for a specific trader from Data API
   * Public endpoint, no authentication required
   */
  async getTradesByTrader(
    address: string,
    afterTimestamp?: Date,
    limit: number = 25
  ): Promise<Trade[]> {
    try {
      if (afterTimestamp) {
        // Get only recent trades after specific timestamp
        const trades = await this.dataAPI.getRecentTrades(address, afterTimestamp, limit);
        return trades;
      } else {
        // Get latest trades
        const trades = await this.dataAPI.getActivity(address, limit, 0);
        return trades;
      }
    } catch (error: any) {
      log.error('Failed to fetch trades from Data API', {
        address,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Fetch order book for a specific token using the SDK
   */
  async getOrderBook(tokenId: string): Promise<OrderBook> {
    try {
      const response = await this.client.getOrderBook(tokenId);
      
      if (!response || (!response.bids && !response.asks)) {
        log.error('No order book data available', { tokenId });
        throw new Error(`No order book available for token ${tokenId}`);
      }

      return this.parseOrderBook(tokenId, tokenId, response);
    } catch (error: any) {
      log.error('SDK: Failed to fetch order book', {
        tokenId,
        error: error.message,
      });
      
      throw new Error(`Failed to fetch order book for token ${tokenId}: ${error.message}`);
    }
  }

  /**
   * Get target trader balance - use configured value
   */
  async getBalance(address: string): Promise<number> {
    log.debug('Using configured target trader balance', {
      address,
      balance: config.targetTraderBalance,
    });
    return config.targetTraderBalance;
  }

  /**
   * Get open orders using direct API call
   */
  async getOpenOrders(address: string): Promise<any[]> {
    try {
      // Use direct HTTP call
      const response = await this.httpClient.get('/data/orders', {
        params: { maker: address },
      });
      
      const orders = response.data || [];
      log.debug(`Fetched ${orders.length} open orders for ${address}`);
      return orders;
    } catch (error: any) {
      log.warn('Failed to fetch open orders', {
        address,
        error: error.message,
        status: error.response?.status,
      });
      return [];
    }
  }

  /**
   * Get all markets - returns PaginationPayload
   */
  async getMarkets(): Promise<any[]> {
    try {
      const response = await this.client.getMarkets();
      // PaginationPayload has data property
      return (response as any)?.data || [];
    } catch (error: any) {
      log.error('SDK: Failed to fetch markets', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get a specific market by condition ID
   */
  async getMarket(conditionId: string): Promise<any> {
    try {
      const market = await this.client.getMarket(conditionId);
      return market;
    } catch (error: any) {
      log.error('SDK: Failed to fetch market', {
        conditionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse SDK trade response to our Trade model
   */
  private parseTrade(raw: any): Trade {
    return {
      id: raw.id || createTradeId(),
      timestamp: new Date((raw.timestamp || Date.now() / 1000) * 1000),
      traderAddress: raw.maker || raw.trader_address || '',
      marketId: raw.market || raw.asset_id || '',
      marketQuestion: raw.market_question || 'Unknown',
      outcomeId: raw.outcome || raw.token_id || '',
      side: raw.side?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
      shares: parseFloat(raw.size || raw.shares || '0'),
      price: parseFloat(raw.price || '0'),
      totalCost: parseFloat(raw.price || '0') * parseFloat(raw.size || '0'),
      fee: parseFloat(raw.fee_rate_bps || '0') / 10000 * parseFloat(raw.price || '0') * parseFloat(raw.size || '0'),
      transactionHash: raw.transaction_hash || raw.tx_hash,
      source: 'api',
    };
  }

  /**
   * Parse SDK order book response
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
   * Parse and format order levels
   */
  private parseOrderLevels(levels: any[]): OrderLevel[] {
    const parsed = levels.map((level: any) => ({
      price: parseFloat(level.price || level[0] || '0'),
      size: parseFloat(level.size || level[1] || '0'),
      cumulativeSize: 0,
    }));

    // Calculate cumulative sizes
    let cumulative = 0;
    for (const level of parsed) {
      cumulative += level.size;
      level.cumulativeSize = cumulative;
    }

    return parsed;
  }

}
