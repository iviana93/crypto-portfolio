import React, { useMemo } from 'react';
import { calculateMaxDrawdown, calculateSharpeRatio } from '../utils/riskMetrics';

export const RiskMetricsCard = ({ portfolioHistory = [] }) => {
  const { mdd, sharpe } = useMemo(() => {
    // Array safety check to prevent e.map is not a function crashes
    const safeHistory = Array.isArray(portfolioHistory) ? portfolioHistory : [];

    if (safeHistory.length === 0) {
      return { mdd: 0, sharpe: 0 };
    }

    const values = safeHistory.map((h) => h?.value ?? 0);
    const returns = safeHistory.map((h) => h?.dailyReturn ?? 0);

    return {
      mdd: typeof calculateMaxDrawdown === 'function' ? (calculateMaxDrawdown(values) ?? 0) : 0,
      sharpe: typeof calculateSharpeRatio === 'function' ? (calculateSharpeRatio(returns) ?? 0) : 0,
    };
  }, [portfolioHistory]);

  const formattedMdd = typeof mdd === 'number' && !isNaN(mdd) ? (mdd * 100).toFixed(2) : '0.00';
  const formattedSharpe = typeof sharpe === 'number' && !isNaN(sharpe) ? sharpe.toFixed(2) : '0.00';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white h-full">
      <h3 className="text-lg font-semibold mb-4 text-slate-200">Risk Analytics</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Max Drawdown</p>
          <p className="text-2xl font-bold text-red-400">
            -{formattedMdd}%
          </p>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Sharpe Ratio</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formattedSharpe}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        *Sharpe Ratio is annualized assuming a 4% risk-free rate.
      </p>
    </div>
  );
};