#!/usr/bin/env tsx
/**
 * ADX Screening Backtest Example
 *
 * This example demonstrates how to use the ADX screening strategy
 * with the backtesting framework.
 *
 * Usage:
 *   npx tsx examples/adx-backtest-example.ts
 */

import { ADXScreeningStrategy } from '../src/strategies/adx-screening';
import { BacktestEngine } from '../src/backtesting/backtest-engine';
import { generateRealisticMarketData } from '../src/backtesting/market-data-generator';
import { formatBacktestResults, formatEquityCurve } from '../src/backtesting/results-formatter';

// Configuration matching the original strategy parameters
const STRATEGY_CONFIG = {
  pADXPeriodo: 14,        // ADX period
  pADXMaxLateral: 15.0    // Maximum ADX for lateral market
};

const BACKTEST_CONFIG = {
  initialCapital: 10000,
  positionSize: 0.1,      // 10% of capital per trade
  commission: 0.001,      // 0.1% commission
  slippage: 0.0005,       // 0.05% slippage
  maxHoldingPeriod: 50,   // Exit after 50 bars if still in lateral market
  tradingMode: 'long' as const
};

const MARKET_DATA_CONFIG = {
  startPrice: 100,
  numCandles: 1000,
  volatility: 0.5,
  trendStrength: 0.2,
  timeframe: 3600000      // 1 hour candles
};

function runBacktest() {
  console.log('🚀 Starting ADX Screening Backtest...\n');

  // Step 1: Generate market data
  console.log('📊 Generating realistic market data...');
  const marketData = generateRealisticMarketData(MARKET_DATA_CONFIG);
  console.log(`   Generated ${marketData.length} candles\n`);

  // Step 2: Initialize strategy
  console.log('⚙️  Initializing ADX screening strategy...');
  console.log(`   ADX Period: ${STRATEGY_CONFIG.pADXPeriodo}`);
  console.log(`   ADX Max Lateral: ${STRATEGY_CONFIG.pADXMaxLateral}\n`);
  const strategy = new ADXScreeningStrategy(STRATEGY_CONFIG);

  // Step 3: Initialize backtest engine
  console.log('🔧 Configuring backtest engine...');
  console.log(`   Initial Capital: $${BACKTEST_CONFIG.initialCapital}`);
  console.log(`   Position Size: ${BACKTEST_CONFIG.positionSize * 100}%`);
  console.log(`   Commission: ${BACKTEST_CONFIG.commission * 100}%`);
  console.log(`   Max Holding Period: ${BACKTEST_CONFIG.maxHoldingPeriod} bars\n`);
  const backtester = new BacktestEngine(strategy, BACKTEST_CONFIG);

  // Step 4: Run backtest
  console.log('▶️  Running backtest...\n');
  const results = backtester.run(marketData);

  // Step 5: Display results
  console.log(formatBacktestResults(results, { showTrades: true, maxTradesToShow: 5 }));

  // Step 6: Display equity curve
  console.log(formatEquityCurve(results.trades, BACKTEST_CONFIG.initialCapital));

  // Step 7: Provide interpretation
  console.log('\n💡 INTERPRETATION\n');
  console.log('───────────────────────────────────────────────────────');

  if (results.totalTrades === 0) {
    console.log('⚠️  No trades were generated. This could mean:');
    console.log('   - ADX never went below the lateral threshold');
    console.log('   - Not enough historical data');
    console.log('   - Try adjusting pADXMaxLateral parameter');
  } else {
    console.log('Strategy Performance:');

    if (results.winRate >= 60) {
      console.log('   ✅ Strong win rate - strategy shows good signal quality');
    } else if (results.winRate >= 50) {
      console.log('   ⚠️  Moderate win rate - consider optimization');
    } else {
      console.log('   ❌ Low win rate - strategy needs improvement');
    }

    if (results.profitFactor >= 2) {
      console.log('   ✅ Excellent profit factor - wins significantly outweigh losses');
    } else if (results.profitFactor >= 1) {
      console.log('   ⚠️  Positive profit factor - strategy is profitable');
    } else {
      console.log('   ❌ Profit factor below 1 - strategy is losing money');
    }

    if (results.sharpeRatio >= 1) {
      console.log('   ✅ Good risk-adjusted returns');
    } else if (results.sharpeRatio >= 0) {
      console.log('   ⚠️  Moderate risk-adjusted returns');
    } else {
      console.log('   ❌ Poor risk-adjusted returns');
    }

    console.log('\nScreening Effectiveness:');
    console.log(`   - ${results.screeningSignals} lateral market periods detected`);
    console.log(`   - ${results.screeningSuccessRate.toFixed(1)}% of signals resulted in winning trades`);

    if (results.screeningSuccessRate >= 50) {
      console.log('   ✅ ADX screening is effective at identifying opportunities');
    } else {
      console.log('   ⚠️  Consider adjusting ADX threshold or adding filters');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
}

// Run the backtest
runBacktest();

export { runBacktest };
