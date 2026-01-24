/**
 * Market Data Generator
 * Generates synthetic OHLC data for backtesting
 */

import { Candle } from '../indicators/adx';

export interface MarketDataConfig {
  startPrice: number;
  numCandles: number;
  volatility: number;       // Price volatility (0-1)
  trendStrength: number;    // Trend strength (-1 to 1, negative = downtrend, positive = uptrend)
  startTimestamp?: number;
  timeframe: number;        // Milliseconds per candle (e.g., 3600000 for 1 hour)
}

/**
 * Generate synthetic market data with realistic OHLC patterns
 */
export function generateMarketData(config: MarketDataConfig): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = config.startPrice;
  const startTime = config.startTimestamp ?? Date.now();

  for (let i = 0; i < config.numCandles; i++) {
    // Add trend component
    const trend = config.trendStrength * config.volatility * config.startPrice * 0.01;

    // Add random walk component
    const randomChange = (Math.random() - 0.5) * config.volatility * config.startPrice * 0.02;

    // Calculate price change
    const priceChange = trend + randomChange;
    currentPrice += priceChange;

    // Generate OHLC
    const open = currentPrice;
    const volatilityRange = config.volatility * config.startPrice * 0.01;

    const high = open + Math.random() * volatilityRange;
    const low = open - Math.random() * volatilityRange;
    const close = low + Math.random() * (high - low);

    candles.push({
      open,
      high,
      low,
      close,
      timestamp: startTime + (i * config.timeframe)
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Generate market data with alternating trending and lateral phases
 */
export function generateRealisticMarketData(config: MarketDataConfig): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = config.startPrice;
  const startTime = config.startTimestamp ?? Date.now();

  // Create phases: lateral -> trending -> lateral -> trending
  const phaseLength = Math.floor(config.numCandles / 8);

  for (let i = 0; i < config.numCandles; i++) {
    const phase = Math.floor(i / phaseLength) % 4;

    // Alternate between lateral (low ADX) and trending (high ADX) markets
    let trendStrength: number;
    let volatility: number;

    if (phase === 0 || phase === 2) {
      // Lateral phase: low trend, moderate volatility
      trendStrength = (Math.random() - 0.5) * 0.2;
      volatility = config.volatility;
    } else if (phase === 1) {
      // Uptrend phase
      trendStrength = 0.5 + Math.random() * 0.3;
      volatility = config.volatility * 0.7;
    } else {
      // Downtrend phase
      trendStrength = -(0.5 + Math.random() * 0.3);
      volatility = config.volatility * 0.7;
    }

    // Add trend component
    const trend = trendStrength * volatility * config.startPrice * 0.01;

    // Add random walk component
    const randomChange = (Math.random() - 0.5) * volatility * config.startPrice * 0.02;

    // Calculate price change
    const priceChange = trend + randomChange;
    currentPrice += priceChange;

    // Ensure price stays positive
    if (currentPrice < config.startPrice * 0.1) {
      currentPrice = config.startPrice * 0.1;
    }

    // Generate OHLC
    const open = currentPrice;
    const volatilityRange = volatility * config.startPrice * 0.01;

    const high = open + Math.random() * volatilityRange;
    const low = Math.max(0.01, open - Math.random() * volatilityRange);
    const close = low + Math.random() * (high - low);

    candles.push({
      open,
      high,
      low,
      close,
      timestamp: startTime + (i * config.timeframe)
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Load market data from CSV (for future use with real data)
 */
export function parseCSVData(csvContent: string): Candle[] {
  const lines = csvContent.trim().split('\n');
  const candles: Candle[] = [];

  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('timestamp') || lines[0].toLowerCase().includes('date') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',');

    if (parts.length < 5) continue;

    // Expected format: timestamp,open,high,low,close
    const timestamp = parseInt(parts[0]) || new Date(parts[0]).getTime();
    const open = parseFloat(parts[1]);
    const high = parseFloat(parts[2]);
    const low = parseFloat(parts[3]);
    const close = parseFloat(parts[4]);

    if (!isNaN(timestamp) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
      candles.push({ timestamp, open, high, low, close });
    }
  }

  return candles;
}
