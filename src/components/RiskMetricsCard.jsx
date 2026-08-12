import React, { useMemo } from 'react';
import { calculateMaxDrawdown, calculateSharpeRatio } from '../utils/riskMetrics';

// Fallback dynamic drawdown calculation if utility function is missing or returns null
const computeDrawdownFallback = (values) => {
  if (!values || values.length < 2) return 0;
  let peak = values[0];
  let maxDD = 0;
  for (let val of values) {
    if (val > peak) peak = val;
    if (peak > 0) {
      const dd = (peak - val) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
};

// Fallback Sharpe Ratio calculation (annualized)
const computeSharpeFallback = (returns, riskFreeRate = 0.04) => {
  if (!returns || returns.length < 2) return 0;
  const mean = returns.reduce((acc, r) => acc + r, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  
  const dailyRiskFree = Math.pow(1 + riskFreeRate, 1 / 365) - 1;
  return ((mean - dailyRiskFree) / stdDev) * Math.sqrt(365);
};

export const RiskMetricsCard = ({ portfolioHistory = [] }) => {
  const { mdd, sharpe } = useMemo(() => {
    const safeHistory = Array.isArray(portfolioHistory) ? portfolioHistory : [];

    if (safeHistory.length === 0) {
      return { mdd: 0, sharpe: 0 };
    }

    // 1. Automatically extract portfolio values supporting multiple common field names
    const values = safeHistory.map((h) => {
      if (typeof h === 'number') return h;
      return h?.value ?? h?.totalValue ?? h?.portfolioValue ?? h?.pnl ?? h?.total ?? 0;
    });

    // 2. Extract or dynamically calculate daily returns
    const returns = safeHistory.map((h, i, arr) => {
      if (typeof h?.dailyReturn === 'number') return h.dailyReturn;
      if (i === 0) return 0;
      
      const prev = arr[i - 1]?.value ?? arr[i - 1]?.totalValue ?? arr[i - 1]?.pnl ?? arr[i - 1] ?? 0;
      const curr = h?.value ?? h?.totalValue ?? h?.pnl ?? h ?? 0;
      
      return prev !== 0 ? (curr - prev) / Math.abs(prev) : 0;
    });

    // 3. Execute calculation using passed functions or internal fallbacks
    const calculatedMdd = typeof calculateMaxDrawdown === 'function' 
      ? (calculateMaxDrawdown(values) ?? computeDrawdownFallback(values)) 
      : computeDrawdownFallback(values);

    const calculatedSharpe = typeof calculateSharpeRatio === 'function' 
      ? (calculateSharpeRatio(returns) ?? computeSharpeFallback(returns)) 
      : computeSharpeFallback(returns);

    return {
      mdd: Math.abs(calculatedMdd),
      sharpe: calculatedSharpe,
    };
  }, [portfolioHistory]);

  const formattedMdd = (mdd * 100).toFixed(2);
  const formattedSharpe = sharpe.toFixed(2);

  return (
    <div
      style={{
        backgroundColor: '#131b2e',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px',
        color: '#ffffff',
        height: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          marginBottom: '16px',
          color: '#ffffff',
          marginTop: 0,
        }}
      >
        Análise de Risco
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            backgroundColor: '#1a233a',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            padding: '14px 16px',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#8b9bb4',
              marginBottom: '6px',
              marginTop: 0,
            }}
          >
            Drawdown Máximo
          </p>
          <p
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: mdd > 0 ? '#ef4444' : '#ffffff',
              margin: 0,
            }}
          >
            {mdd > 0 ? `-${formattedMdd}%` : `${formattedMdd}%`}
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#1a233a',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            padding: '14px 16px',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              color: '#8b9bb4',
              marginBottom: '6px',
              marginTop: 0,
            }}
          >
            Índice Sharpe
          </p>
          <p
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: sharpe >= 1 ? '#10b981' : sharpe < 0 ? '#ef4444' : '#3b82f6',
              margin: 0,
            }}
          >
            {formattedSharpe}
          </p>
        </div>
      </div>

      <p
        style={{
          fontSize: '11px',
          color: '#64748b',
          marginTop: '12px',
          marginBottom: 0,
        }}
      >
        *Índice Sharpe anualizado considerando taxa livre de risco de 4% a.a.
      </p>
    </div>
  );
};