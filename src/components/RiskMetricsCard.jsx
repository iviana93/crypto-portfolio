import React, { useMemo } from 'react';

const calculateMaxDrawdown = (values) => {
  if (!Array.isArray(values) || values.length < 2) return 0;

  let peak = values[0];
  let maxDrawdown = 0;

  for (const value of values) {
    if (!Number.isFinite(value)) continue;

    if (value > peak) {
      peak = value;
    }

    if (peak > 0) {
      const drawdown = (peak - value) / peak;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown;
};

const calculateSharpeRatio = (returns, riskFreeRate = 0.04) => {
  if (!Array.isArray(returns) || returns.length < 2) return 0;

  const validReturns = returns.filter((value) => Number.isFinite(value));

  if (validReturns.length < 2) return 0;

  const mean =
    validReturns.reduce((sum, value) => sum + value, 0) /
    validReturns.length;

  const variance =
    validReturns.reduce(
      (sum, value) => sum + Math.pow(value - mean, 2),
      0
    ) /
    (validReturns.length - 1);

  const standardDeviation = Math.sqrt(variance);

  if (!Number.isFinite(standardDeviation) || standardDeviation === 0) {
    return 0;
  }

  // Os snapshots são diários.
  const dailyRiskFreeRate =
    Math.pow(1 + riskFreeRate, 1 / 365) - 1;

  return (
    ((mean - dailyRiskFreeRate) / standardDeviation) *
    Math.sqrt(365)
  );
};

export const RiskMetricsCard = ({ portfolioHistory = [] }) => {
  const { mdd, sharpe, snapshotCount } = useMemo(() => {
    if (!Array.isArray(portfolioHistory) || portfolioHistory.length === 0) {
      return {
        mdd: 0,
        sharpe: 0,
        snapshotCount: 0,
      };
    }

    /*
     * Os dados reais vindos do Supabase são:
     *
     * {
     *   snapshot_date,
     *   total_value_usd,
     *   total_invested_usd
     * }
     *
     * Portanto, usamos total_value_usd para a evolução
     * do patrimônio.
     */

    const history = portfolioHistory
      .map((snapshot) => ({
        date: snapshot?.snapshot_date,
        value: Number(snapshot?.total_value_usd),
      }))
      .filter(
        (snapshot) =>
          snapshot.date &&
          Number.isFinite(snapshot.value) &&
          snapshot.value >= 0
      )
      .sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
      );

    if (history.length === 0) {
      return {
        mdd: 0,
        sharpe: 0,
        snapshotCount: 0,
      };
    }

    const values = history.map((snapshot) => snapshot.value);

    /*
     * DRAWdown
     *
     * Mede a maior queda percentual entre um pico
     * anterior e um valor posterior.
     */
    const calculatedMdd = calculateMaxDrawdown(values);

    /*
     * RETORNOS
     *
     * Cada snapshot representa o patrimônio naquele dia.
     * Calculamos a variação percentual entre snapshots
     * consecutivos.
     *
     * O primeiro snapshot não possui retorno.
     */
    const returns = [];

    for (let i = 1; i < values.length; i++) {
      const previousValue = values[i - 1];
      const currentValue = values[i];

      if (previousValue <= 0) continue;

      const dailyReturn =
        (currentValue - previousValue) / previousValue;

      if (Number.isFinite(dailyReturn)) {
        returns.push(dailyReturn);
      }
    }

    const calculatedSharpe = calculateSharpeRatio(returns);

    return {
      mdd: Math.max(0, calculatedMdd),
      sharpe: Number.isFinite(calculatedSharpe)
        ? calculatedSharpe
        : 0,
      snapshotCount: history.length,
    };
  }, [portfolioHistory]);

  const formattedMdd = (mdd * 100).toFixed(2);
  const formattedSharpe = sharpe.toFixed(2);

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px',
        boxSizing: 'border-box',
        width: '100%',
        color: 'var(--text)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          gap: '10px',
        }}
      >
        <span
          style={{
            color: 'var(--text-muted)',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          Análise de Risco
        </span>

        {snapshotCount > 0 && (
          <span
            style={{
              color: 'var(--text-faint)',
              fontSize: '10px',
            }}
          >
            {snapshotCount} {snapshotCount === 1 ? 'snapshot' : 'snapshots'}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        {/* DRAWdown */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              margin: '0 0 6px 0',
              color: 'var(--text-faint)',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            Drawdown Máximo
          </p>

          <p
            style={{
              margin: 0,
              color: mdd > 0 ? '#ef4444' : '#10b981',
              fontSize: '20px',
              fontWeight: '800',
            }}
          >
            {mdd > 0 ? `-${formattedMdd}%` : '0.00%'}
          </p>
        </div>

        {/* SHARPE */}
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              margin: '0 0 6px 0',
              color: 'var(--text-faint)',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            Índice Sharpe
          </p>

          <p
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '800',
              color:
                sharpe >= 1
                  ? '#10b981'
                  : sharpe < 0
                    ? '#ef4444'
                    : '#3b82f6',
            }}
          >
            {formattedSharpe}
          </p>
        </div>
      </div>

      <p
        style={{
          margin: '10px 0 0 0',
          color: 'var(--text-faint)',
          fontSize: '10px',
          lineHeight: '1.4',
        }}
      >
        *Sharpe anualizado com taxa livre de risco de 4% a.a.
        calculado sobre os retornos dos snapshots disponíveis.
      </p>
    </div>
  );
};