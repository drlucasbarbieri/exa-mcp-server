/**
 * ADX (Average Directional Index) Indicator Calculation
 * Measures trend strength on a scale of 0-100
 * Values below 20-25 indicate weak trend (lateral/ranging market)
 */

export interface Candle {
  high: number;
  low: number;
  close: number;
  open: number;
  timestamp: number;
}

export interface ADXResult {
  adx: number;
  plusDI: number;
  minusDI: number;
}

/**
 * Calculate True Range (TR)
 */
function calculateTrueRange(candles: Candle[], index: number): number {
  if (index === 0) {
    return candles[0].high - candles[0].low;
  }

  const current = candles[index];
  const previous = candles[index - 1];

  const tr1 = current.high - current.low;
  const tr2 = Math.abs(current.high - previous.close);
  const tr3 = Math.abs(current.low - previous.close);

  return Math.max(tr1, tr2, tr3);
}

/**
 * Calculate Smoothed Moving Average (Wilder's smoothing)
 */
function smoothedAverage(values: number[], period: number, previousSmoothed?: number): number {
  if (previousSmoothed === undefined) {
    // Initial smoothed value is simple average
    return values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  }

  // Wilder's smoothing: ((previous * (period - 1)) + current) / period
  const current = values[values.length - 1];
  return ((previousSmoothed * (period - 1)) + current) / period;
}

/**
 * Calculate ADX indicator
 * @param candles - Array of OHLC candles
 * @param period - ADX period (typically 14)
 * @returns Array of ADX values (undefined for initial candles until enough data)
 */
export function calculateADX(candles: Candle[], period: number = 14): (ADXResult | undefined)[] {
  if (candles.length < period * 2) {
    return Array(candles.length).fill(undefined);
  }

  const results: (ADXResult | undefined)[] = [];
  const trueRanges: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  // Calculate True Range and Directional Movements
  for (let i = 0; i < candles.length; i++) {
    const tr = calculateTrueRange(candles, i);
    trueRanges.push(tr);

    if (i === 0) {
      plusDM.push(0);
      minusDM.push(0);
      results.push(undefined);
      continue;
    }

    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    // +DM and -DM
    let plusDMValue = 0;
    let minusDMValue = 0;

    if (highDiff > lowDiff && highDiff > 0) {
      plusDMValue = highDiff;
    }
    if (lowDiff > highDiff && lowDiff > 0) {
      minusDMValue = lowDiff;
    }

    plusDM.push(plusDMValue);
    minusDM.push(minusDMValue);
    results.push(undefined);
  }

  // Calculate smoothed values and ADX
  let smoothedTR: number | undefined;
  let smoothedPlusDM: number | undefined;
  let smoothedMinusDM: number | undefined;
  let smoothedDX: number | undefined;

  const dxValues: number[] = [];

  for (let i = period; i < candles.length; i++) {
    // Smoothed True Range
    if (smoothedTR === undefined) {
      smoothedTR = trueRanges.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
      smoothedPlusDM = plusDM.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
      smoothedMinusDM = minusDM.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / period;
    } else {
      smoothedTR = ((smoothedTR * (period - 1)) + trueRanges[i]) / period;
      smoothedPlusDM = ((smoothedPlusDM * (period - 1)) + plusDM[i]) / period;
      smoothedMinusDM = ((smoothedMinusDM * (period - 1)) + minusDM[i]) / period;
    }

    // +DI and -DI
    const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

    // DX
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0;
    dxValues.push(dx);

    // ADX (smoothed DX)
    let adx = 0;
    if (dxValues.length >= period) {
      if (smoothedDX === undefined) {
        smoothedDX = dxValues.slice(dxValues.length - period).reduce((sum, val) => sum + val, 0) / period;
      } else {
        smoothedDX = ((smoothedDX * (period - 1)) + dx) / period;
      }
      adx = smoothedDX;
    }

    results[i] = {
      adx,
      plusDI,
      minusDI
    };
  }

  return results;
}

/**
 * Get ADX value for a specific index
 */
export function getADXValue(candles: Candle[], index: number, period: number = 14): number | undefined {
  const adxResults = calculateADX(candles.slice(0, index + 1), period);
  const result = adxResults[adxResults.length - 1];
  return result?.adx;
}
