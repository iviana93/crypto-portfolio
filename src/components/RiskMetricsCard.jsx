import React, { useMemo } from 'react';
import { calculateMaxDrawdown, calculateSharpeRatio } from '../utils/riskMetrics';

export const RiskMetricsCard = ({ portfolioHistory = [] }) => {
  const { mdd, sharpe } = useMemo(() => {
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

  const formattedMdd = typeof mdd === 'number' && !isNaN(mdd) && mdd > 0 
    ? (mdd * 100).toFixed(2) 
    : '0.00';

  const formattedSharpe = typeof sharpe === 'number' && !isNaN(sharpe) 
    ? sharpe.toFixed(2) 
    : '0.00';

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '24px',
        color: '#ffffff',
        height: '100%',
        boxSizing: 'border-box',
        fontFamily: 'sans-serif',
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '16px',
          color: '#e2e8f0',
          marginTop: 0,
        }}
      >
        Risk Analytics
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: '#94a3b8',
              marginBottom: '4px',
              marginTop: 0,
            }}
          >
            Max Drawdown
          </p>
          <p
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#f87171',
              margin: 0,
            }}
          >
            {mdd > 0 ? `-${formattedMdd}%` : `${formattedMdd}%`}
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: '#94a3b8',
              marginBottom: '4px',
              marginTop: 0,
            }}
          >
            Sharpe Ratio
          </p>
          <p
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#34d399',
              margin: 0,
            }}
          >
            {formattedSharpe}
          </p>
        </div>
      </div>

      <p
        style={{
          fontSize: '12px',
          color: '#64748b',
          marginTop: '16px',
          marginBottom: 0,
        }}
      >
        *Sharpe Ratio is annualized assuming a 4% risk-free rate.
      </p>
    </div>
  );
};