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

    const validReturns = returns.filter(
        (value) => Number.isFinite(value)
    );

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

    if (
        !Number.isFinite(standardDeviation) ||
        standardDeviation === 0
    ) {
        return 0;
    }

    const dailyRiskFreeRate =
        Math.pow(1 + riskFreeRate, 1 / 365) - 1;

    return (
        ((mean - dailyRiskFreeRate) / standardDeviation) *
        Math.sqrt(365)
    );
};

/*
 * Converte uma transação para USD.
 *
 * O App.jsx utiliza a mesma lógica:
 *
 * USD -> USD
 * BRL -> USD usando o câmbio atual
 */
const convertTransactionToUSD = (
    total,
    currency,
    exchangeRate
) => {
    const value = Number(total);

    if (!Number.isFinite(value)) return 0;

    if (currency === 'USD') {
        return value;
    }

    if (currency === 'BRL' && exchangeRate > 0) {
        return value / exchangeRate;
    }

    return 0;
};

/*
 * Retorna todas as transações do portfolio.
 */
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
        (a, b) =>
            new Date(a.date).getTime() -
            new Date(b.date).getTime()
    );
};

export const RiskMetricsCard = ({
    portfolioHistory = [],
    portfolio = [],
    exchangeRate = 0,
}) => {
    const {
        mdd,
        sharpe,
        snapshotCount,
        returnCount,
    } = useMemo(() => {
        if (
            !Array.isArray(portfolioHistory) ||
            portfolioHistory.length === 0
        ) {
            return {
                mdd: 0,
                sharpe: 0,
                snapshotCount: 0,
                returnCount: 0,
            };
        }

        /*
         * ---------------------------------------------------------
         * 1. PREPARA OS SNAPSHOTS
         * ---------------------------------------------------------
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

        if (history.length < 2) {
            return {
                mdd: 0,
                sharpe: 0,
                snapshotCount: history.length,
                returnCount: 0,
            };
        }

        /*
         * ---------------------------------------------------------
         * 2. TODAS AS TRANSAÇÕES
         * ---------------------------------------------------------
         */

        const transactions = getTransactions(portfolio);

        /*
         * O App usa o câmbio atual para converter BRL <-> USD.
         *
         * Como o RiskMetricsCard não possui acesso ao objeto prices
         * nem ao exchangeRate do App, usamos o câmbio implícito
         * disponível nos próprios snapshots apenas se existir.
         *
         * Caso as transações estejam em USD, não há problema.
         *
         * Para BRL, recebemos o câmbio através da prop abaixo,
         * quando disponível.
         */

        /*
         * ---------------------------------------------------------
         * 3. RETORNOS AJUSTADOS POR FLUXO DE CAPITAL
         * ---------------------------------------------------------
         *
         * Fórmula:
         *
         * retorno =
         *
         * (valor_final - fluxo_liquido) /
         * valor_inicial - 1
         *
         * Compra:
         *   fluxo positivo
         *
         * Venda:
         *   fluxo negativo
         *
         * Exemplo:
         *
         * início = $1.000
         * compra = $1.000
         * final = $2.000
         *
         * retorno = (2000 - 1000) / 1000 - 1
         *         = 0%
         */

        const returns = [];

        /*
         * Também construímos uma série de crescimento ajustado.
         *
         * Começamos em 1.
         *
         * Cada retorno multiplica o patrimônio ajustado.
         */
        const adjustedPerformance = [1];

        for (let i = 1; i < history.length; i++) {
            const previousSnapshot = history[i - 1];
            const currentSnapshot = history[i];

            const previousValue = previousSnapshot.value;
            const currentValue = currentSnapshot.value;

            /*
             * Transações ocorridas desde o snapshot anterior
             * até o snapshot atual.
             *
             * Como as transações possuem somente data (sem horário),
             * consideramos a data do snapshot atual como pertencente
             * ao período que termina naquele snapshot.
             */
            const periodTransactions = transactions.filter((tx) => {
                const txTime = new Date(`${tx.date}T00:00:00`).getTime();

                const previousTime = new Date(
                    `${previousSnapshot.date}T00:00:00`
                ).getTime();

                const currentTime = new Date(
                    `${currentSnapshot.date}T23:59:59`
                ).getTime();

                return txTime > previousTime && txTime <= currentTime;
            });

            /*
             * IMPORTANTE:
             *
             * O valor das transações em BRL precisa ser convertido
             * para USD.
             *
             * Como o snapshot já está em USD, precisamos de uma
             * taxa de câmbio.
             *
             * Se não conseguirmos converter uma transação BRL,
             * não a usamos no cálculo para não inventar um valor.
             */

            let netCashFlowUSD = 0;

            periodTransactions.forEach((tx) => {
                /*
                 * O RiskMetricsCard recebe uma taxa de câmbio através
                 * de window.__CRYPTO_TRACKER_EXCHANGE_RATE quando
                 * disponível.
                 *
                 * Caso não exista, transações em USD continuam sendo
                 * calculadas normalmente.
                 */


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

            /*
             * Se não houver patrimônio inicial, não conseguimos
             * calcular um retorno percentual confiável.
             */
            if (previousValue <= 0) {
                continue;
            }

            const adjustedReturn =
                (currentValue - netCashFlowUSD) /
                previousValue -
                1;

            if (Number.isFinite(adjustedReturn)) {
                returns.push(adjustedReturn);

                const previousAdjusted =
                    adjustedPerformance[
                    adjustedPerformance.length - 1
                    ];

                adjustedPerformance.push(
                    previousAdjusted * (1 + adjustedReturn)
                );
            }
        }

        /*
         * ---------------------------------------------------------
         * 4. SHARPE
         * ---------------------------------------------------------
         */

        const calculatedSharpe =
            calculateSharpeRatio(returns);

        /*
         * ---------------------------------------------------------
         * 5. DRAWDOWN
         * ---------------------------------------------------------
         *
         * Agora calculamos sobre a série ajustada.
         *
         * Isso evita considerar aportes como valorização.
         */

        const calculatedMdd =
            calculateMaxDrawdown(adjustedPerformance);

        return {
            mdd: Math.max(0, calculatedMdd),

            sharpe: Number.isFinite(calculatedSharpe)
                ? calculatedSharpe
                : 0,

            snapshotCount: history.length,

            returnCount: returns.length,
        };
    }, [portfolioHistory, portfolio]);

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
                        {returnCount} retornos
                    </span>
                )}
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
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
                            color:
                                mdd > 0
                                    ? '#ef4444'
                                    : '#10b981',
                            fontSize: '20px',
                            fontWeight: '800',
                        }}
                    >
                        {mdd > 0
                            ? `-${formattedMdd}%`
                            : '0.00%'}
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
                *Retornos ajustados por compras e vendas.
                Sharpe anualizado com taxa livre de risco de
                4% a.a.
            </p>
        </div>
    );
};