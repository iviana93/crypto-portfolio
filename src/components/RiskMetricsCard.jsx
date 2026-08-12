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

    const dailyRiskFreeRate = Math.pow(1 + riskFreeRate, 1 / 365) - 1;

    return (
        ((mean - dailyRiskFreeRate) / standardDeviation) * Math.sqrt(365)
    );
};

const convertTransactionToUSD = (total, currency, exchangeRate) => {
    const value = Number(total);

    if (!Number.isFinite(value) || value === 0) return 0;

    if (currency === 'USD') {
        return value;
    }

    if (currency === 'BRL' && Number.isFinite(exchangeRate) && exchangeRate > 0) {
        return value / exchangeRate;
    }

    return 0;
};

const getTransactions = (portfolio) => {
    if (!Array.isArray(portfolio)) return [];

    const transactions = [];

    portfolio.forEach((asset) => {
        if (!Array.isArray(asset?.history)) return;

        asset.history.forEach((tx) => {
            if (!tx?.date) return;

            const total = Number(tx.total);

            if (!Number.isFinite(total)) return;

            transactions.push({
                date: tx.date,
                type: tx.type,
                total,
                currency: tx.currency,
            });
        });
    });

    return transactions.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
};

// Converte strings de data de forma segura para timestamp
const parseToTimestamp = (dateStr, setToEndOfDay = false) => {
    if (!dateStr) return 0;
    const cleanDateStr = String(dateStr).split('T')[0];
    const timeSuffix = setToEndOfDay ? 'T23:59:59' : 'T00:00:00';
    return new Date(`${cleanDateStr}${timeSuffix}`).getTime();
};

export const RiskMetricsCard = ({
    portfolioHistory = [],
    portfolio = [],
    exchangeRate = 0,
}) => {
    const { mdd, sharpe, snapshotCount, returnCount } = useMemo(() => {
        if (!Array.isArray(portfolioHistory) || portfolioHistory.length === 0) {
            return {
                mdd: 0,
                sharpe: 0,
                snapshotCount: 0,
                returnCount: 0,
            };
        }

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
                    new Date(a.date).getTime() - new Date(b.date).getTime()
            );

        if (history.length < 2) {
            return {
                mdd: 0,
                sharpe: 0,
                snapshotCount: history.length,
                returnCount: 0,
            };
        }

        const transactions = getTransactions(portfolio);
        const returns = [];
        const adjustedPerformance = [1];

        for (let i = 1; i < history.length; i++) {
            const previousSnapshot = history[i - 1];
            const currentSnapshot = history[i];

            const previousValue = previousSnapshot.value;
            const currentValue = currentSnapshot.value;

            const periodTransactions = transactions.filter((tx) => {
                const txTime = parseToTimestamp(tx.date);
                const previousTime = parseToTimestamp(previousSnapshot.date);
                const currentTime = parseToTimestamp(currentSnapshot.date, true);

                return txTime > previousTime && txTime <= currentTime;
            });

            let netCashFlowUSD = 0;

            periodTransactions.forEach((tx) => {
                const txUSD = convertTransactionToUSD(
                    tx.total,
                    tx.currency,
                    exchangeRate
                );

                if (tx.type === 'buy') {
                    netCashFlowUSD += txUSD;
                } else if (tx.type === 'sell') {
                    netCashFlowUSD -= txUSD;
                }
            });

            if (previousValue <= 0) continue;

            const adjustedReturn =
                (currentValue - netCashFlowUSD) / previousValue - 1;

            if (Number.isFinite(adjustedReturn)) {
                returns.push(adjustedReturn);

                const previousAdjusted =
                    adjustedPerformance[adjustedPerformance.length - 1];

                adjustedPerformance.push(
                    previousAdjusted * (1 + adjustedReturn)
                );
            }
        }

        const calculatedSharpe = calculateSharpeRatio(returns);
        const calculatedMdd = calculateMaxDrawdown(adjustedPerformance);

        return {
            mdd: Math.max(0, calculatedMdd),
            sharpe: Number.isFinite(calculatedSharpe) ? calculatedSharpe : 0,
            snapshotCount: history.length,
            returnCount: returns.length,
        };
    }, [portfolioHistory, portfolio, exchangeRate]);

    const formattedMdd = (mdd * 100).toFixed(2);
    const formattedSharpe = sharpe.toFixed(2);
    const isMddVisible = Number(formattedMdd) > 0;

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
                        {returnCount} retornos
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
                {/* DRAWDOWN */}
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
                            color: isMddVisible ? '#ef4444' : '#10b981',
                            fontSize: '20px',
                            fontWeight: '800',
                        }}
                    >
                        {isMddVisible ? `-${formattedMdd}%` : '0.00%'}
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
                *Retornos ajustados por compras e vendas. Sharpe anualizado com
                taxa livre de risco de 4% a.a.
            </p>
        </div>
    );
};