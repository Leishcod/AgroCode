import type { SimulationInput } from '@/lib/api/contract';

const histogramWeights = [0.79, 0.085, 0.055, 0.035, 0.035] as const;

export type PayoutHistogramEntry = { bin: number; count: number };

export type PayoutModel = {
  rain: number;
  maxPayout: number;
  scenarioPayout: number;
  payoutCurve: { rainMm: number; payout: number }[];
  payoutHistogram: PayoutHistogramEntry[];
  dailyRain: { date: string; cumMm: number }[];
};

export function calculatePayoutModel(input: SimulationInput): PayoutModel {
  const strikeMm = input.strikeMm;
  const exitMm = Math.max(input.exitMm, strikeMm + 1);
  const maxPayout = input.sumInsured * input.hectares;
  const rain = getScenarioRain(input);
  const payoutAtRain = (rainMm: number) => {
    if (rainMm <= strikeMm) return 0;
    if (rainMm >= exitMm) return maxPayout;
    return maxPayout * ((rainMm - strikeMm) / (exitMm - strikeMm));
  };

  const payoutCurve: PayoutModel['payoutCurve'] = [];
  for (let rainMm = 0; rainMm <= 900; rainMm += 25) {
    payoutCurve.push({ rainMm, payout: Math.round(payoutAtRain(rainMm)) });
  }

  const portfolioSize = input.portfolio?.policies ?? 1000;
  const histogramFractions = [0, 0.25, 0.5, 0.75, 1];
  const payoutHistogram = histogramFractions.map((fraction, index) => {
    const targetPayout = maxPayout * fraction;
    const closestCurvePoint = payoutCurve.reduce((closest, point) =>
      Math.abs(point.payout - targetPayout) < Math.abs(closest.payout - targetPayout)
        ? point
        : closest,
    payoutCurve[0]);

    return {
      bin: closestCurvePoint.payout,
      count: index === histogramFractions.length - 1
        ? 0
        : Math.round(portfolioSize * histogramWeights[index]),
    };
  });
  payoutHistogram[payoutHistogram.length - 1].count = portfolioSize
    - payoutHistogram.slice(0, -1).reduce((sum, entry) => sum + entry.count, 0);

  const dailyRain = [
    { date: '01 Dic', cumMm: Math.min(25, rain * 0.05) },
    { date: '15 Dic', cumMm: Math.min(65, rain * 0.12) },
    { date: '01 Ene', cumMm: Math.min(130, rain * 0.25) },
    { date: '20 Ene', cumMm: Math.min(210, rain * 0.4) },
    { date: '10 Feb', cumMm: Math.min(320, rain * 0.6) },
    { date: '28 Feb', cumMm: Math.min(450, rain * 0.78) },
    { date: '15 Mar', cumMm: Math.min(590, rain * 0.9) },
    { date: '30 Abr', cumMm: rain },
  ];

  return {
    rain,
    maxPayout,
    scenarioPayout: payoutAtRain(rain),
    payoutCurve,
    payoutHistogram,
    dailyRain,
  };
}

function getScenarioRain(input: SimulationInput): number {
  if (input.scenario === 'nino_debil') return 430;
  if (input.scenario === 'nino_fuerte') return 550;
  if (input.scenario === 'extraordinario') return 780;
  if (input.scenario === 'custom' && input.customRainMm !== undefined) {
    return input.customRainMm;
  }
  return 320;
}
