import React, { useMemo } from 'react';
import { calculateMaxDrawdown, calculateSharpeRatio } from '../utils/riskMetrics';

export const RiskMetricsCard = ({ portfolioHistory = [] }) => {
  const { mdd, sharpe } = useMemo(() => {
    const values = portfolioHistory.map(h => h.value);
    const returns = portfolioHistory.map(h => h.dailyReturn);
    
    return {
      mdd: calculateMaxDrawdown(values),
      sharpe: calculateSharpeRatio(returns)
    };
  }, [portfolioHistory]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white h-full">
      <h3 className="text-lg font-semibold mb-4 text-slate-200">Risk Analytics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Max Drawdown</p>
          <p className="text-2xl font-bold text-red-400">
            -{(mdd * 100).toFixed(2)}%
          </p>
        </div>
        
        <div className="bg-slate-800 p-4 rounded-lg">
          <p className="text-sm text-slate-400 mb-1">Sharpe Ratio</p>
          <p className="text-2xl font-bold text-emerald-400">
            {sharpe.toFixed(2)}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        *Sharpe Ratio is annualized assuming a 4% risk-free rate.
      </p>
    </div>
  );
};