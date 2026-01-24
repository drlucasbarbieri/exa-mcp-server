/**
 * Backtest Results Formatter
 * Formats and displays backtest results in a readable format
 */

import { BacktestResult, Trade } from './backtest-engine';

export function formatBacktestResults(result: BacktestResult, config?: {
  showTrades?: boolean;
  maxTradesToShow?: number;
}): string {
  const showTrades = config?.showTrades ?? true;
  const maxTradesToShow = config?.maxTradesToShow ?? 10;

  let output = '';

  // Header
  output += '═══════════════════════════════════════════════════════\n';
  output += '           ADX SCREENING BACKTEST RESULTS              \n';
  output += '═══════════════════════════════════════════════════════\n\n';

  // Performance Summary
  output += '📊 PERFORMANCE SUMMARY\n';
  output += '───────────────────────────────────────────────────────\n';
  output += `Final Capital:          $${result.finalCapital.toFixed(2)}\n`;
  output += `Total P&L:              $${result.totalPnL.toFixed(2)} (${result.totalPnLPercent >= 0 ? '+' : ''}${result.totalPnLPercent.toFixed(2)}%)\n`;
  output += `Max Drawdown:           $${result.maxDrawdown.toFixed(2)} (${result.maxDrawdownPercent.toFixed(2)}%)\n`;
  output += `Sharpe Ratio:           ${result.sharpeRatio.toFixed(3)}\n`;
  output += '\n';

  // Trade Statistics
  output += '📈 TRADE STATISTICS\n';
  output += '───────────────────────────────────────────────────────\n';
  output += `Total Trades:           ${result.totalTrades}\n`;
  output += `Winning Trades:         ${result.winningTrades}\n`;
  output += `Losing Trades:          ${result.losingTrades}\n`;
  output += `Win Rate:               ${result.winRate.toFixed(2)}%\n`;
  output += `Profit Factor:          ${result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2)}\n`;
  output += '\n';

  // Average Performance
  output += '💰 AVERAGE PERFORMANCE\n';
  output += '───────────────────────────────────────────────────────\n';
  output += `Average P&L:            $${result.averagePnL.toFixed(2)}\n`;
  output += `Average Win:            $${result.averageWin.toFixed(2)}\n`;
  output += `Average Loss:           $${result.averageLoss.toFixed(2)}\n`;
  output += `Largest Win:            $${result.largestWin.toFixed(2)}\n`;
  output += `Largest Loss:           $${result.largestLoss.toFixed(2)}\n`;
  output += '\n';

  // Screening Statistics
  output += '🔍 SCREENING STATISTICS\n';
  output += '───────────────────────────────────────────────────────\n';
  output += `Screening Signals:      ${result.screeningSignals}\n`;
  output += `Signal Success Rate:    ${result.screeningSuccessRate.toFixed(2)}%\n`;
  output += '\n';

  // Individual Trades
  if (showTrades && result.trades.length > 0) {
    output += '📋 TRADES HISTORY\n';
    output += '───────────────────────────────────────────────────────\n';

    const tradesToShow = result.trades.slice(0, maxTradesToShow);

    for (let i = 0; i < tradesToShow.length; i++) {
      const trade = tradesToShow[i];
      const profit = trade.pnl >= 0;
      const emoji = profit ? '✅' : '❌';
      const sign = profit ? '+' : '';

      output += `${emoji} Trade #${i + 1} (${trade.type.toUpperCase()})\n`;
      output += `   Entry:  ${new Date(trade.entryTime).toISOString()} @ $${trade.entryPrice.toFixed(2)}\n`;
      output += `   Exit:   ${new Date(trade.exitTime).toISOString()} @ $${trade.exitPrice.toFixed(2)}\n`;
      output += `   P&L:    ${sign}$${trade.pnl.toFixed(2)} (${sign}${(trade.pnlPercent * 100).toFixed(2)}%)\n`;
      output += `   Duration: ${trade.exitIndex - trade.entryIndex} bars\n`;
      output += '\n';
    }

    if (result.trades.length > maxTradesToShow) {
      output += `... and ${result.trades.length - maxTradesToShow} more trades\n`;
      output += '\n';
    }
  }

  // Footer
  output += '═══════════════════════════════════════════════════════\n';

  return output;
}

/**
 * Format trade list as CSV
 */
export function formatTradesAsCSV(trades: Trade[]): string {
  let csv = 'Trade#,Type,EntryTime,EntryPrice,ExitTime,ExitPrice,Duration,PnL,PnLPercent\n';

  trades.forEach((trade, index) => {
    csv += `${index + 1},`;
    csv += `${trade.type},`;
    csv += `${new Date(trade.entryTime).toISOString()},`;
    csv += `${trade.entryPrice.toFixed(2)},`;
    csv += `${new Date(trade.exitTime).toISOString()},`;
    csv += `${trade.exitPrice.toFixed(2)},`;
    csv += `${trade.exitIndex - trade.entryIndex},`;
    csv += `${trade.pnl.toFixed(2)},`;
    csv += `${(trade.pnlPercent * 100).toFixed(4)}\n`;
  });

  return csv;
}

/**
 * Create a simple equity curve visualization (ASCII art)
 */
export function formatEquityCurve(trades: Trade[], initialCapital: number, width: number = 60): string {
  if (trades.length === 0) {
    return 'No trades to display';
  }

  let output = '\n📈 EQUITY CURVE\n';
  output += '─'.repeat(width) + '\n';

  // Calculate equity at each trade
  const equityPoints: number[] = [initialCapital];
  let currentEquity = initialCapital;

  trades.forEach(trade => {
    currentEquity += trade.pnl;
    equityPoints.push(currentEquity);
  });

  const maxEquity = Math.max(...equityPoints);
  const minEquity = Math.min(...equityPoints);
  const range = maxEquity - minEquity;

  // Create ASCII chart
  const height = 20;
  const lines: string[] = Array(height).fill('');

  for (let i = 0; i < equityPoints.length; i++) {
    const normalized = range > 0 ? (equityPoints[i] - minEquity) / range : 0.5;
    const row = Math.floor((1 - normalized) * (height - 1));

    const col = Math.floor((i / (equityPoints.length - 1)) * (width - 1));

    for (let r = 0; r < height; r++) {
      if (r === row) {
        lines[r] = lines[r].padEnd(col, ' ') + '█';
      } else {
        lines[r] = lines[r].padEnd(col, ' ') + ' ';
      }
    }
  }

  // Add Y-axis labels
  for (let i = 0; i < height; i++) {
    const value = maxEquity - (i / (height - 1)) * range;
    const label = `$${value.toFixed(0)}`.padStart(8, ' ');
    output += `${label} │${lines[i]}\n`;
  }

  output += ' '.repeat(8) + ' └' + '─'.repeat(width) + '\n';
  output += ' '.repeat(10) + `Trade 1${' '.repeat(width - 20)}Trade ${trades.length}\n`;

  return output;
}
