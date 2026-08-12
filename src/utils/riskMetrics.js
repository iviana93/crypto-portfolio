export function calculateMaxDrawdown(portfolioValues) {
  if (!portfolioValues || portfolioValues.length === 0) return 0;

  let peak = portfolioValues[0];
  let maxDrawdown = 0;

  for (const value of portfolioValues) {
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown;
}

export function calculateSharpeRatio(dailyReturns, annualRiskFreeRate = 0.04) {
  if (!dailyReturns || dailyReturns.length < 2) return 0;

  const dailyRiskFreeRate = annualRiskFreeRate / 365;
  const excessReturns = dailyReturns.map(r => r - dailyRiskFreeRate);
  const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
  
  const variance = excessReturns.reduce((sum, r) => sum + Math.pow(r - meanExcessReturn, 2), 0) / (excessReturns.length - 1);
  const standardDeviation = Math.sqrt(variance);

  if (standardDeviation === 0) return 0;

  const dailySharpe = meanExcessReturn / standardDeviation;
  return dailySharpe * Math.sqrt(365);
}