# ADX Screening Backtest

This module implements an ADX (Average Directional Index) screening strategy with full backtesting capabilities.

## Overview

The ADX screening strategy identifies lateral/ranging markets (low trend strength) by monitoring when the ADX indicator falls below a specified threshold. This can be useful for:

- **Range trading strategies**: Entering positions when markets consolidate
- **Breakout preparation**: Identifying periods before potential breakouts
- **Trend filtering**: Avoiding trades during choppy, directionless markets

## Strategy Logic

```typescript
if ADX(pADXPeriodo) <= pADXMaxLateral then
  Screening := true  // Lateral market detected
else
  Screening := false // Trending market
```

**Parameters:**
- `pADXPeriodo`: ADX calculation period (default: 14)
- `pADXMaxLateral`: Maximum ADX value to consider market as lateral (default: 15.0)

**Interpretation:**
- ADX < 15-20: Weak or absent trend (lateral/ranging)
- ADX 20-25: Emerging trend
- ADX 25-50: Strong trend
- ADX > 50: Very strong trend

## Project Structure

```
src/
├── indicators/
│   └── adx.ts                    # ADX indicator calculation
├── strategies/
│   └── adx-screening.ts          # ADX screening strategy implementation
├── backtesting/
│   ├── backtest-engine.ts        # Main backtesting engine
│   ├── market-data-generator.ts  # Synthetic data generation
│   └── results-formatter.ts      # Results display utilities
examples/
└── adx-backtest-example.ts       # Complete usage example
```

## Installation

The backtesting module is included in the exa-mcp-server repository. No additional dependencies required.

Ensure you have the required dependencies:

```bash
npm install
```

## Quick Start

Run the example backtest:

```bash
npx tsx examples/adx-backtest-example.ts
```

This will:
1. Generate 1000 candles of realistic market data
2. Apply the ADX screening strategy
3. Simulate trades with realistic costs (commission, slippage)
4. Display comprehensive performance metrics

## Usage Examples

### Basic Backtest

```typescript
import { ADXScreeningStrategy } from './src/strategies/adx-screening';
import { BacktestEngine } from './src/backtesting/backtest-engine';
import { generateRealisticMarketData } from './src/backtesting/market-data-generator';

// 1. Generate or load market data
const marketData = generateRealisticMarketData({
  startPrice: 100,
  numCandles: 1000,
  volatility: 0.5,
  trendStrength: 0.2,
  timeframe: 3600000  // 1 hour
});

// 2. Create strategy with your parameters
const strategy = new ADXScreeningStrategy({
  pADXPeriodo: 14,
  pADXMaxLateral: 15.0
});

// 3. Configure backtest
const backtester = new BacktestEngine(strategy, {
  initialCapital: 10000,
  positionSize: 0.1,      // 10% per trade
  commission: 0.001,      // 0.1%
  slippage: 0.0005,       // 0.05%
  maxHoldingPeriod: 50,   // Exit after 50 bars
  tradingMode: 'long'
});

// 4. Run backtest
const results = backtester.run(marketData);

// 5. Display results
import { formatBacktestResults } from './src/backtesting/results-formatter';
console.log(formatBacktestResults(results));
```

### Custom Strategy Parameters

```typescript
// More sensitive screening (catches more lateral markets)
const sensitivStrategy = new ADXScreeningStrategy({
  pADXPeriodo: 14,
  pADXMaxLateral: 20.0  // Higher threshold
});

// More conservative screening (only very lateral markets)
const conservativeStrategy = new ADXScreeningStrategy({
  pADXPeriodo: 14,
  pADXMaxLateral: 12.0  // Lower threshold
});

// Faster ADX calculation
const fastStrategy = new ADXScreeningStrategy({
  pADXPeriodo: 7,       // Shorter period
  pADXMaxLateral: 15.0
});
```

### Using Real Market Data

```typescript
import { parseCSVData } from './src/backtesting/market-data-generator';
import { readFileSync } from 'fs';

// Load CSV with format: timestamp,open,high,low,close
const csvContent = readFileSync('market-data.csv', 'utf-8');
const marketData = parseCSVData(csvContent);

// Run backtest on real data
const results = backtester.run(marketData);
```

### Parameter Optimization

```typescript
// Test multiple parameter combinations
const adxPeriods = [7, 10, 14, 21];
const lateralThresholds = [10, 12, 15, 18, 20];

let bestResult = null;
let bestParams = null;

for (const period of adxPeriods) {
  for (const threshold of lateralThresholds) {
    const strategy = new ADXScreeningStrategy({
      pADXPeriodo: period,
      pADXMaxLateral: threshold
    });

    const backtester = new BacktestEngine(strategy, backtestConfig);
    const result = backtester.run(marketData);

    if (!bestResult || result.totalPnLPercent > bestResult.totalPnLPercent) {
      bestResult = result;
      bestParams = { period, threshold };
    }
  }
}

console.log('Best parameters:', bestParams);
console.log('Best return:', bestResult.totalPnLPercent.toFixed(2) + '%');
```

## Backtest Configuration Options

### Strategy Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pADXPeriodo` | number | 14 | ADX calculation period |
| `pADXMaxLateral` | number | 15.0 | Maximum ADX for lateral market |

### Backtest Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `initialCapital` | number | 10000 | Starting capital |
| `positionSize` | number | 0.1 | Position size as fraction of capital (0.1 = 10%) |
| `commission` | number | 0.001 | Commission per trade (0.001 = 0.1%) |
| `slippage` | number | 0.0005 | Slippage per trade (0.0005 = 0.05%) |
| `maxHoldingPeriod` | number | undefined | Max bars to hold (undefined = no limit) |
| `tradingMode` | string | 'long' | 'long', 'short', or 'both' |

### Market Data Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startPrice` | number | - | Initial price |
| `numCandles` | number | - | Number of candles to generate |
| `volatility` | number | - | Price volatility (0-1) |
| `trendStrength` | number | - | Trend strength (-1 to 1) |
| `timeframe` | number | - | Milliseconds per candle |

## Performance Metrics

The backtest provides comprehensive performance metrics:

### Returns
- **Total P&L**: Absolute profit/loss
- **Total P&L %**: Percentage return on initial capital
- **Final Capital**: Ending account balance

### Risk Metrics
- **Max Drawdown**: Largest peak-to-trough decline
- **Max Drawdown %**: Drawdown as percentage
- **Sharpe Ratio**: Risk-adjusted return measure

### Trade Statistics
- **Total Trades**: Number of completed trades
- **Win Rate**: Percentage of profitable trades
- **Profit Factor**: Gross profit / gross loss
- **Average Win/Loss**: Mean profit/loss per trade

### Screening Metrics
- **Screening Signals**: Number of lateral markets detected
- **Signal Success Rate**: Winning trades / total signals

## ADX Indicator Details

The ADX implementation follows Welles Wilder's original calculation:

1. **True Range (TR)**: Maximum of:
   - High - Low
   - |High - Previous Close|
   - |Low - Previous Close|

2. **Directional Movement**:
   - +DM: High - Previous High (if positive and > -DM)
   - -DM: Previous Low - Low (if positive and > +DM)

3. **Smoothed Values**: Wilder's smoothing over period
   - Smoothed TR, +DM, -DM

4. **Directional Indicators**:
   - +DI = (Smoothed +DM / Smoothed TR) × 100
   - -DI = (Smoothed -DM / Smoothed TR) × 100

5. **ADX**:
   - DX = (|+DI - -DI| / (+DI + -DI)) × 100
   - ADX = Smoothed DX over period

## Interpretation Guide

### ADX Values
- **0-20**: No trend or very weak trend (lateral market)
- **20-25**: Trend starting to develop
- **25-50**: Strong trend in place
- **50-75**: Very strong trend
- **75-100**: Extremely strong trend (rare)

### Strategy Applications

**For Range Trading:**
- Enter when ADX < 15-20 (lateral market)
- Exit when ADX > 25 (trend developing)
- Look for mean reversion opportunities

**For Trend Following:**
- Avoid entry when ADX < 20 (use as filter)
- Enter when ADX > 25 and rising
- Stay in trend while ADX remains elevated

**For Breakout Trading:**
- Monitor when ADX < 20 (consolidation)
- Prepare for breakout when ADX starts rising from low levels
- Enter on breakout confirmation

## Tips for Optimization

1. **Period Selection**:
   - Shorter periods (7-10): More sensitive, more signals
   - Medium periods (14-20): Balanced, traditional
   - Longer periods (21-30): Smoother, fewer signals

2. **Threshold Tuning**:
   - Lower threshold (10-12): Very lateral markets only
   - Medium threshold (15-18): Balanced
   - Higher threshold (20-25): Includes weak trends

3. **Exit Strategy**:
   - Set `maxHoldingPeriod` to limit exposure
   - Exit when ADX rises above threshold
   - Combine with other indicators (RSI, Bollinger Bands)

4. **Position Sizing**:
   - Start conservative (5-10% per trade)
   - Adjust based on win rate and drawdown
   - Consider volatility-based sizing

5. **Market Conditions**:
   - Works best in markets with alternating trends/ranges
   - May underperform in persistent trends
   - Test on different timeframes and instruments

## License

This backtesting module is part of the exa-mcp-server project and follows the same license.

## Contributing

Contributions welcome! Areas for improvement:
- Additional technical indicators
- More exit strategies
- Monte Carlo simulation
- Walk-forward optimization
- Real-time data integration

---

**Disclaimer**: This backtesting framework is for educational and research purposes. Past performance does not guarantee future results. Always validate strategies on out-of-sample data before live trading.
