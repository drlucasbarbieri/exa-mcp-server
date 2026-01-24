/**
 * Backtesting Engine
 * Simulates trading strategy performance on historical data
 */

import { Candle } from '../indicators/adx';
import { ADXScreeningStrategy, ScreeningResult } from '../strategies/adx-screening';

export interface Trade {
  entryIndex: number;
  exitIndex: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPercent: number;
  type: 'long' | 'short';
}

export interface BacktestConfig {
  initialCapital: number;
  positionSize: number;        // Percentage of capital per trade (0-1)
  commission: number;           // Commission per trade (percentage)
  slippage: number;            // Slippage per trade (percentage)
  maxHoldingPeriod?: number;   // Maximum bars to hold position (undefined = no limit)
  tradingMode: 'long' | 'short' | 'both';
}

export interface BacktestResult {
  trades: Trade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalPnLPercent: number;
  averagePnL: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  finalCapital: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  screeningSignals: number;
  screeningSuccessRate: number;
}

export class BacktestEngine {
  private config: BacktestConfig;
  private strategy: ADXScreeningStrategy;

  constructor(strategy: ADXScreeningStrategy, config: Partial<BacktestConfig> = {}) {
    this.strategy = strategy;
    this.config = {
      initialCapital: config.initialCapital ?? 10000,
      positionSize: config.positionSize ?? 0.1,
      commission: config.commission ?? 0.001,
      slippage: config.slippage ?? 0.0005,
      maxHoldingPeriod: config.maxHoldingPeriod,
      tradingMode: config.tradingMode ?? 'long'
    };
  }

  /**
   * Run backtest on historical data
   */
  run(candles: Candle[]): BacktestResult {
    const trades: Trade[] = [];
    const screeningResults = this.strategy.screenAll(candles);

    let capital = this.config.initialCapital;
    let peakCapital = capital;
    let maxDrawdown = 0;
    let position: { type: 'long' | 'short', entryIndex: number, entryPrice: number } | null = null;
    let screeningSignals = 0;

    for (let i = 0; i < candles.length; i++) {
      const screening = screeningResults[i];

      if (!screening) continue;

      // Count screening signals
      if (screening.screening) {
        screeningSignals++;
      }

      // Entry logic: Enter when screening is true (lateral market detected)
      if (!position && screening.screening) {
        const tradingMode = this.config.tradingMode;

        if (tradingMode === 'long' || tradingMode === 'both') {
          // Enter long position in lateral market (expecting breakout or mean reversion)
          position = {
            type: 'long',
            entryIndex: i,
            entryPrice: candles[i].close * (1 + this.config.slippage)
          };
        } else if (tradingMode === 'short') {
          // Enter short position
          position = {
            type: 'short',
            entryIndex: i,
            entryPrice: candles[i].close * (1 - this.config.slippage)
          };
        }
        continue;
      }

      // Exit logic: Exit when screening becomes false (trend detected) or max holding period reached
      if (position) {
        const shouldExit =
          !screening.screening ||
          (this.config.maxHoldingPeriod && i - position.entryIndex >= this.config.maxHoldingPeriod);

        if (shouldExit) {
          const exitPrice = position.type === 'long'
            ? candles[i].close * (1 - this.config.slippage)
            : candles[i].close * (1 + this.config.slippage);

          let pnlPercent: number;
          if (position.type === 'long') {
            pnlPercent = (exitPrice - position.entryPrice) / position.entryPrice;
          } else {
            pnlPercent = (position.entryPrice - exitPrice) / position.entryPrice;
          }

          // Apply commission
          pnlPercent -= (this.config.commission * 2);

          const positionValue = capital * this.config.positionSize;
          const pnl = positionValue * pnlPercent;

          capital += pnl;

          trades.push({
            entryIndex: position.entryIndex,
            exitIndex: i,
            entryPrice: position.entryPrice,
            exitPrice,
            entryTime: candles[position.entryIndex].timestamp,
            exitTime: candles[i].timestamp,
            pnl,
            pnlPercent,
            type: position.type
          });

          // Update drawdown
          if (capital > peakCapital) {
            peakCapital = capital;
          }
          const drawdown = peakCapital - capital;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }

          position = null;
        }
      }
    }

    // Close any open position at the end
    if (position && candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const exitPrice = position.type === 'long'
        ? lastCandle.close * (1 - this.config.slippage)
        : lastCandle.close * (1 + this.config.slippage);

      let pnlPercent: number;
      if (position.type === 'long') {
        pnlPercent = (exitPrice - position.entryPrice) / position.entryPrice;
      } else {
        pnlPercent = (position.entryPrice - exitPrice) / position.entryPrice;
      }

      pnlPercent -= (this.config.commission * 2);

      const positionValue = capital * this.config.positionSize;
      const pnl = positionValue * pnlPercent;

      capital += pnl;

      trades.push({
        entryIndex: position.entryIndex,
        exitIndex: candles.length - 1,
        entryPrice: position.entryPrice,
        exitPrice,
        entryTime: candles[position.entryIndex].timestamp,
        exitTime: lastCandle.timestamp,
        pnl,
        pnlPercent,
        type: position.type
      });
    }

    // Calculate performance metrics
    return this.calculateMetrics(trades, capital, maxDrawdown, screeningSignals);
  }

  private calculateMetrics(
    trades: Trade[],
    finalCapital: number,
    maxDrawdown: number,
    screeningSignals: number
  ): BacktestResult {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalPnLPercent = ((finalCapital - this.config.initialCapital) / this.config.initialCapital) * 100;

    const averagePnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);

    const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0;

    const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;

    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const maxDrawdownPercent = (maxDrawdown / this.config.initialCapital) * 100;

    // Simple Sharpe Ratio calculation (assuming risk-free rate = 0)
    const returns = trades.map(t => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
      : 0;
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    const screeningSuccessRate = screeningSignals > 0 ? (winningTrades / screeningSignals) * 100 : 0;

    return {
      trades,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: winRate * 100,
      totalPnL,
      totalPnLPercent,
      averagePnL,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      profitFactor,
      finalCapital,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      screeningSignals,
      screeningSuccessRate
    };
  }
}
