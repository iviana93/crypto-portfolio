import React, { useMemo } from 'react';

const calculateMaxDrawdown = (values) => {
    if (!Array.isArray(values) || values.length < 2) return 0;
    let peak = values[0];
    let maxDrawdown = 0;

    for (const value of values) {
        if (!Number.isFinite(value)) continue;
        if (value > peak) peak = value;
        if (peak > 0) {
            const drawdown = (peak - value) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }
    }
    return maxDrawdown;
};

const calculateRiskStats = (returns, riskFreeRate = 0.04) => {
    if (!Array.isArray(returns) || returns.length < 2) {
        return { sharpe: 0, volatility: 0 };
    }

    const validReturns = returns.filter((v) => Number.isFinite(v));
    if (validReturns.length < 2) return { sharpe: 0, volatility: 0 };

    const mean = validReturns.reduce((a, b) => a + b, 0) / validReturns.length;
    const variance =
        validReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
        (validReturns.length - 1);

    const stdDev = Math.sqrt(variance);
    if (!Number.isFinite(stdDev) || stdDev === 0) {
        return { sharpe: 0, volatility: 0 };
    }

    const annualizedVol = stdDev * Math.sqrt(365);
    const dailyRiskFree = Math.pow(1 + riskFreeRate, 1 / 365) - 1;
    const sharpe = ((mean - dailyRiskFree) / stdDev) * Math.sqrt(365);

    return {
        sharpe: Number.isFinite(sharpe) ? sharpe : 0,
        volatility: Number.isFinite(annualizedVol) ? annualizedVol : 0,
    };
};

const convertTransactionToUSD = (total, currency, exchangeRate) => {
    const value = Number(total);
    if (!Number.isFinite(value) || value === 0) return 0;
    if (currency === 'USD') return value;
    if (currency === 'BRL' && Number.isFinite(exchangeRate) && exchangeRate > 0) {
        return value / exchangeRate;
    }
    return 0;
};

const parseToTimestamp = (dateStr, setToEndOfDay = false) => {
    if (!dateStr) return 0;
    const cleanDateStr = String(dateStr).split('T')[0];
    return new Date(`${cleanDateStr}${setToEndOfDay ? 'T23:59:59' : 'T00:00:00'}`).getTime();
};

export const RiskMetricsCard = ({
    portfolioHistory = [],
    portfolio = [],
    exchangeRate = 0,
}) => {
    const { mdd, sharpe, volatility, snapshotCount, returnCount } = useMemo(() => {
        if (!Array.isArray(portfolioHistory) || portfolioHistory.length === 0) {
            return { mdd: 0, sharpe: 0, volatility: 0, snapshotCount: 0, returnCount: 0 };
        }

        const history = portfolioHistory
            .map((s) => ({ date: s?.snapshot_date, value: Number(s?.total_value_usd) }))
            .filter((s) => s.date && Number.isFinite(s.value) && s.value >= 0)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (history.length < 2) {
            return { mdd: 0, sharpe: 0, volatility: 0, snapshotCount: history.length, returnCount: 0 };
        }

        const transactions = [];
        portfolio.forEach((asset) => {
            asset?.history?.forEach((tx) => {
                if (tx?.date && Number.isFinite(Number(tx.total))) {
                    transactions.push({ ...tx, total: Number(tx.total) });
                }
            });
        });

        const returns = [];
        const adjustedPerformance = [1];

        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];

            if (prev.value <= 0) continue;

            const periodTxs = transactions.filter((tx) => {
                const txTime = parseToTimestamp(tx.date);
                return txTime > parseToTimestamp(prev.date) && txTime <= parseToTimestamp(curr.date, true);
            });

            let netCashFlow = 0;
            periodTxs.forEach((tx) => {
                const usdVal = convertTransactionToUSD(tx.total, tx.currency, exchangeRate);
                if (tx.type === 'buy') netCashFlow += usdVal;
                if (tx.type === 'sell') netCashFlow -= usdVal;
            });

            const adjReturn = (curr.value - netCashFlow) / prev.value - 1;

            if (Number.isFinite(adjReturn)) {
                returns.push(adjReturn);
                const prevPerf = adjustedPerformance[adjustedPerformance.length - 1];
                adjustedPerformance.push(prevPerf * (1 + adjReturn));
            }
        }

        const { sharpe: calcSharpe, volatility: calcVol } = calculateRiskStats(returns);
        const calcMdd = calculateMaxDrawdown(adjustedPerformance);

        return {
            mdd: Math.max(0, calcMdd),
            sharpe: calcSharpe,
            volatility: calcVol,
            snapshotCount: history.length,
            returnCount: returns.length,
        };
    }, [portfolioHistory, portfolio, exchangeRate]);

    const formattedMdd = (mdd * 100).toFixed(2);
    const formattedVol = (volatility * 100).toFixed(1);
    const formattedSharpe = sharpe.toFixed(2);
    const isMddVisible = Number(formattedMdd) > 0;
    const isLowData = returnCount < 30;

    return (
        <div
            style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '16px',
                width: '100%',
                color: 'var(--text)',
                boxSizing: 'border-box',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>
                    Análise de Risco
                </span>
                {returnCount > 0 && (
                    <span
                        style={{
                            fontSize: '10px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '500',
                            background: isLowData ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isLowData ? '#f59e0b' : '#10b981',
                            border: `1px solid ${isLowData ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        }}
                    >
                        {isLowData ? `Amostra pequena (${returnCount}d)` : `${returnCount} dias calculados`}
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                {/* DRAWDOWN */}
                <div
                    title="A maior queda histórica do patrimônio (do topo ao fundo). Indica o seu pior cenário de perda."
                    style={{ 
                        background: 'var(--bg)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '10px', 
                        padding: '10px',
                        cursor: 'help' 
                    }}
                >
                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-faint)', fontSize: '11px', fontWeight: '500' }}>
                        Drawdown Máx.
                    </p>
                    <p style={{ margin: 0, color: isMddVisible ? '#ef4444' : '#10b981', fontSize: '18px', fontWeight: '800' }}>
                        {isMddVisible ? `-${formattedMdd}%` : '0.00%'}
                    </p>
                </div>

                {/* VOLATILIDADE */}
                <div
                    title="Mede a intensidade das oscilações da carteira. Quanto maior, mais 'turbulento' e arriscado é o investimento."
                    style={{ 
                        background: 'var(--bg)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '10px', 
                        padding: '10px',
                        cursor: 'help' 
                    }}
                >
                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-faint)', fontSize: '11px', fontWeight: '500' }}>
                        Volatilidade a.a.
                    </p>
                    <p style={{ margin: 0, color: 'var(--text)', fontSize: '18px', fontWeight: '800' }}>
                        {formattedVol}%
                    </p>
                </div>

                {/* SHARPE */}
                <div
                    title="Mede se o retorno compensa o risco. Valores acima de 1.0 indicam boa eficiência em relação à renda fixa."
                    style={{ 
                        background: 'var(--bg)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '10px', 
                        padding: '10px',
                        cursor: 'help' 
                    }}
                >
                    <p style={{ margin: '0 0 4px 0', color: 'var(--text-faint)', fontSize: '11px', fontWeight: '500' }}>
                        Índice Sharpe
                    </p>
                    <p
                        style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: '800',
                            color: sharpe >= 1 ? '#10b981' : sharpe < 0 ? '#ef4444' : '#3b82f6',
                        }}
                    >
                        {formattedSharpe}
                    </p>
                </div>
            </div>

            <p style={{ margin: '12px 0 0 0', color: 'var(--text-faint)', fontSize: '10px', lineHeight: '1.4' }}>
                {isLowData
                    ? '*Métricas preliminares. O Índice Sharpe e a Volatilidade ganham precisão estatística a partir de 30 a 90 dias de histórico.'
                    : '*Retornos ajustados por aportes/retiradas. Sharpe calculado com taxa livre de risco de 4% a.a.'}
            </p>
        </div>
    );
};