/**
 * ADX Screening Strategy
 * Screens for lateral/ranging markets where ADX is below a threshold
 * Based on the principle that low ADX values indicate weak trend (consolidation)
 */

import { Candle, calculateADX } from '../indicators/adx';

export interface ADXScreeningParams {
  pADXPeriodo: number;      // ADX period (default: 14)
  pADXMaxLateral: number;   // Maximum ADX for lateral market (default: 15.0)
}

export interface ScreeningResult {
  screening: boolean;       // True if passes screening criteria
  adxValue: number;        // Current ADX value
  isLateral: boolean;      // True if market is lateral/ranging
  timestamp: number;       // Timestamp of the signal
}

/**
 * ADX Screening Strategy
 * Returns true when ADX <= pADXMaxLateral (indicating lateral/ranging market)
 */
export class ADXScreeningStrategy {
  private params: ADXScreeningParams;

  constructor(params: Partial<ADXScreeningParams> = {}) {
    this.params = {
      pADXPeriodo: params.pADXPeriodo ?? 14,
      pADXMaxLateral: params.pADXMaxLateral ?? 15.0
    };
  }

  /**
   * Check if the market passes the screening criteria at a given index
   */
  screen(candles: Candle[], index: number): ScreeningResult | undefined {
    // Need enough data to calculate ADX
    if (index < this.params.pADXPeriodo * 2) {
      return undefined;
    }

    // Calculate ADX up to current index
    const adxResults = calculateADX(candles.slice(0, index + 1), this.params.pADXPeriodo);
    const adxResult = adxResults[adxResults.length - 1];

    if (!adxResult || adxResult.adx === 0) {
      return undefined;
    }

    const adxValue = adxResult.adx;
    const isLateral = adxValue <= this.params.pADXMaxLateral;

    return {
      screening: isLateral,
      adxValue,
      isLateral,
      timestamp: candles[index].timestamp
    };
  }

  /**
   * Run screening over entire dataset
   */
  screenAll(candles: Candle[]): (ScreeningResult | undefined)[] {
    const results: (ScreeningResult | undefined)[] = [];

    for (let i = 0; i < candles.length; i++) {
      results.push(this.screen(candles, i));
    }

    return results;
  }

  /**
   * Get strategy parameters
   */
  getParams(): ADXScreeningParams {
    return { ...this.params };
  }

  /**
   * Update strategy parameters
   */
  setParams(params: Partial<ADXScreeningParams>): void {
    this.params = {
      ...this.params,
      ...params
    };
  }
}
