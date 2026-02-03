import { GraphQLClient, gql } from 'graphql-request';
import { log } from '../utils/logger.js';
import { Trade, createTradeId } from '../models/trade.js';

// Polymarket Subgraph endpoint (The Graph Network)
const POLYMARKET_SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/polymarket/matic-markets';

export class PolymarketGraphQL {
  private client: GraphQLClient;

  constructor() {
    this.client = new GraphQLClient(POLYMARKET_SUBGRAPH_URL);
    
    log.info('Polymarket GraphQL client initialized', {
      endpoint: POLYMARKET_SUBGRAPH_URL,
      provider: 'The Graph Network',
    });
  }

  /**
   * Fetch trades for a specific trader using GraphQL
   */
  async getTradesByTrader(
    address: string,
    afterTimestamp?: Date,
    limit: number = 100
  ): Promise<Trade[]> {
    try {
      const timestampFilter = afterTimestamp 
        ? `timestamp_gt: "${Math.floor(afterTimestamp.getTime() / 1000)}"`
        : '';

      const query = gql`
        query GetTrades($user: String!, $limit: Int!) {
          fpmmTrades(
            where: { 
              user: $user
              ${timestampFilter}
            }
            orderBy: timestamp
            orderDirection: desc
            first: $limit
          ) {
            id
            title
            type
            outcomeIndex
            outcomeTokensTraded
            collateralTokenTraded
            outcomeTokenMarginalPrice
            oldOutcomeTokenMarginalPrice
            transactionHash
            timestamp
            fpmm {
              id
              condition {
                id
              }
            }
          }
        }
      `;

      const variables = {
        user: address.toLowerCase(),
        limit,
      };

      log.debug('Querying GraphQL for trades', { address, limit });

      const data: any = await this.client.request(query, variables);
      
      const trades = data.fpmmTrades || [];
      
      log.info(`Fetched ${trades.length} trades from GraphQL`, { address });
      
      return trades.map((trade: any) => this.parseGraphQLTrade(trade));
    } catch (error: any) {
      log.error('GraphQL: Failed to fetch trades', {
        address,
        error: error.message,
        response: error.response?.errors,
      });
      return [];
    }
  }

  /**
   * Get user positions from GraphQL
   */
  async getUserPositions(address: string): Promise<any[]> {
    try {
      const query = gql`
        query GetPositions($user: String!) {
          fpmmParticipations(
            where: { user: $user }
            orderBy: creationTimestamp
            orderDirection: desc
          ) {
            id
            fpmm {
              id
              title
              outcomeTokenAmounts
              outcomeTokenMarginalPrices
              condition {
                id
              }
            }
            fee
            creationTimestamp
          }
        }
      `;

      const variables = {
        user: address.toLowerCase(),
      };

      const data: any = await this.client.request(query, variables);
      
      return data.fpmmParticipations || [];
    } catch (error: any) {
      log.error('GraphQL: Failed to fetch positions', {
        address,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Parse GraphQL trade response to our Trade model
   */
  private parseGraphQLTrade(raw: any): Trade {
    const isBuy = raw.type === 'Buy';
    const shares = parseFloat(raw.outcomeTokensTraded || '0');
    const price = parseFloat(raw.outcomeTokenMarginalPrice || '0');
    const collateral = parseFloat(raw.collateralTokenTraded || '0');

    return {
      id: raw.id || createTradeId(),
      timestamp: new Date(parseInt(raw.timestamp) * 1000),
      traderAddress: raw.user || '',
      marketId: raw.fpmm?.id || '',
      marketQuestion: raw.title || 'Unknown Market',
      outcomeId: raw.outcomeIndex?.toString() || '0',
      side: isBuy ? 'BUY' : 'SELL',
      shares: shares,
      price: price,
      totalCost: collateral,
      fee: 0, // Fee info not directly available in subgraph
      transactionHash: raw.transactionHash,
      source: 'api',
    };
  }

  /**
   * Test the GraphQL connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const query = gql`
        query Test {
          fpmmTrades(first: 1) {
            id
          }
        }
      `;

      await this.client.request(query);
      log.info('GraphQL connection test successful');
      return true;
    } catch (error: any) {
      log.error('GraphQL connection test failed', {
        error: error.message,
      });
      return false;
    }
  }
}
