import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';
import { Trade, createTradeId } from '../models/trade.js';

// Polymarket CTF Exchange contract on Polygon
const CTF_EXCHANGE_ADDRESS = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';

// CTF Exchange ABI (relevant events only)
const CTF_EXCHANGE_ABI = [
  'event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAssetId, uint256 takerAssetId, uint256 makerAmountFilled, uint256 takerAmountFilled, uint256 fee)',
  'event TokenTrade(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 tokenId, uint256 makerAmount, uint256 takerAmount, uint256 price, uint8 side)',
];

export class BlockchainMonitor {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private lastBlockChecked: number = 0;
  private maxBlockRange: number = 30; // 1 minute worth of blocks (60 sec / 2 sec per block)
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 200; // 200ms between requests

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.polygonRpcUrl);
    this.contract = new ethers.Contract(
      CTF_EXCHANGE_ADDRESS,
      CTF_EXCHANGE_ABI,
      this.provider
    );

    log.info('Blockchain monitor initialized', {
      network: 'Polygon',
      contract: CTF_EXCHANGE_ADDRESS,
      rpc: config.polygonRpcUrl,
      maxBlockRange: this.maxBlockRange,
      windowSize: '1 minute',
    });
  }

  /**
   * Rate limit RPC requests
   */
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
   * Initialize the starting block
   */
  async initialize(): Promise<void> {
    this.lastBlockChecked = await this.provider.getBlockNumber();
    log.info('Starting block number set', {
      blockNumber: this.lastBlockChecked,
    });
  }

  /**
   * Fetch trades from blockchain events for a specific trader
   * Handles large block ranges by chunking and rate limiting
   */
  async getTradesByTrader(
    address: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<Trade[]> {
    try {
      await this.rateLimit();

      const endBlock = toBlock || await this.provider.getBlockNumber();
      
      // Always query only last 5 minutes (150 blocks)
      // Any trade older than 5 minutes is not worth copying due to slippage
      let startBlock = fromBlock || Math.max(0, endBlock - this.maxBlockRange);

      // If user provides specific fromBlock, still cap at maxBlockRange
      if (fromBlock && (endBlock - fromBlock) > this.maxBlockRange) {
        log.warn('Requested block range exceeds 5 minutes, limiting to recent', {
          requested: endBlock - fromBlock,
          limited: this.maxBlockRange,
          reason: 'Trades older than 1 minute have no copytrading advantage',
        });
        startBlock = endBlock - this.maxBlockRange;
      }

      log.debug('Querying blockchain for trades', {
        address,
        fromBlock: startBlock,
        toBlock: endBlock,
        blocks: endBlock - startBlock,
      });

      // Query OrderFilled events where address is maker
      const filter = this.contract.filters.OrderFilled(null, address, null);
      
      await this.rateLimit();
      const events = await this.contract.queryFilter(filter, startBlock, endBlock);

      log.info(`Found ${events.length} blockchain events for ${address}`, {
        fromBlock: startBlock,
        toBlock: endBlock,
        blocksQueried: endBlock - startBlock,
      });

      const trades: Trade[] = [];

      for (const event of events) {
        try {
          const trade = await this.parseBlockchainEvent(event);
          if (trade) {
            trades.push(trade);
          }
        } catch (error: any) {
          log.warn('Failed to parse blockchain event', {
            txHash: event.transactionHash,
            error: error.message,
          });
        }
      }

      this.lastBlockChecked = endBlock;

      return trades;
    } catch (error: any) {
      // Handle rate limit errors
      if (error.message?.includes('rate limit') || error.message?.includes('Too many requests')) {
        log.warn('RPC rate limit hit, will retry on next poll', {
          address,
          message: 'Rate limited - consider using paid RPC endpoint',
        });
        return [];
      }

      log.error('Failed to fetch trades from blockchain', {
        address,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Parse blockchain event into Trade model
   */
  private async parseBlockchainEvent(event: ethers.Log): Promise<Trade | null> {
    try {
      const parsed = this.contract.interface.parseLog({
        topics: event.topics as string[],
        data: event.data,
      });

      if (!parsed) return null;

      const block = await event.getBlock();
      const timestamp = new Date(block.timestamp * 1000);

      // Determine if this is a buy or sell based on amounts
      const makerAmount = parsed.args.makerAmountFilled;
      const takerAmount = parsed.args.takerAmountFilled;
      const isBuy = makerAmount < takerAmount;

      return {
        id: createTradeId(),
        timestamp,
        traderAddress: parsed.args.maker,
        marketId: parsed.args.makerAssetId?.toString() || '',
        marketQuestion: 'Unknown - fetch from market data',
        outcomeId: parsed.args.makerAssetId?.toString() || '',
        side: isBuy ? 'BUY' : 'SELL',
        shares: parseFloat(ethers.formatUnits(makerAmount, 6)),
        price: this.calculatePriceFromAmounts(makerAmount, takerAmount),
        totalCost: parseFloat(ethers.formatUnits(takerAmount, 6)),
        fee: parseFloat(ethers.formatUnits(parsed.args.fee || 0, 6)),
        transactionHash: event.transactionHash,
        source: 'blockchain',
      };
    } catch (error: any) {
      log.error('Error parsing blockchain event', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Calculate price from maker and taker amounts
   */
  private calculatePriceFromAmounts(makerAmount: bigint, takerAmount: bigint): number {
    if (makerAmount === 0n) return 0;
    const maker = parseFloat(ethers.formatUnits(makerAmount, 6));
    const taker = parseFloat(ethers.formatUnits(takerAmount, 6));
    return taker / maker;
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }
}
