import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `[${timestamp}] ${level}: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }
  
  return msg;
});

// JSON format for file storage (for dashboard logs panel)
const jsonFormat = winston.format.json();

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // File output (human readable)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
    // JSON file for dashboard (easy parsing)
    new winston.transports.File({
      filename: 'logs/trading.log',
      format: combine(
        timestamp(),
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 2,
    }),
  ],
});

// Helper functions for structured logging
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),

  // Specialized logging functions
  trade: (message: string, trade: any) => {
    logger.info(`TRADE: ${message}`, { trade });
  },

  slippage: (message: string, data: any) => {
    logger.info(`SLIPPAGE: ${message}`, { slippage: data });
  },

  position: (message: string, position: any) => {
    logger.info(`POSITION: ${message}`, { position });
  },

  pnl: (message: string, data: any) => {
    logger.info(`PNL: ${message}`, { pnl: data });
  },
};
