import type { SimulationInput } from '@/lib/api/contract';
import type { PayoutHistogramEntry } from '@/lib/engine/payout';

type PayoutStatistics = {
  expectedPayout: number;
  standardDeviation: number;
  activationProb: number;
  tail: { var95: number; tvar95: number };
};

export type PremiumCalculation = PayoutStatistics & {
  premium: number;
  adaptationDiscount: { amount: number; pct: number };
  lossRatio: number;
  premiumBreakdown: { label: string; value: number }[];
};

export function calculatePremium(
  input: SimulationInput,
  payoutHistogram: PayoutHistogramEntry[],
): PremiumCalculation {
  const statistics = calculatePayoutStatistics(payoutHistogram);
  const safetyAmount = input.safetyLoading * statistics.standardDeviation;
  const technicalPremium = statistics.expectedPayout + safetyAmount;
  const grossPremium = technicalPremium / (1 - input.expenseRatio);
  const adaptationPct = getAdaptationDiscount(input);
  const discountAmount = grossPremium * adaptationPct / 100;
  const premium = grossPremium - discountAmount;
  const expenseAmount = grossPremium - technicalPremium;

  return {
    ...statistics,
    premium,
    adaptationDiscount: { amount: discountAmount, pct: adaptationPct },
    lossRatio: premium > 0 ? (statistics.expectedPayout / premium) * 100 : 0,
    premiumBreakdown: [
      { label: 'Pago esperado a productores', value: statistics.expectedPayout },
      { label: 'Recargo de seguridad (λ)', value: safetyAmount },
      { label: 'Gastos operativos', value: expenseAmount },
      { label: 'Descuento por adaptación', value: -discountAmount },
    ],
  };
}

function calculatePayoutStatistics(histogram: PayoutHistogramEntry[]): PayoutStatistics {
  const totalCount = histogram.reduce((sum, entry) => sum + entry.count, 0);
  if (totalCount <= 0) {
    return {
      expectedPayout: 0,
      standardDeviation: 0,
      activationProb: 0,
      tail: { var95: 0, tvar95: 0 },
    };
  }

  const expectedPayout = histogram.reduce(
    (sum, entry) => sum + entry.bin * entry.count,
    0,
  ) / totalCount;
  const variance = histogram.reduce(
    (sum, entry) => sum + (entry.bin - expectedPayout) ** 2 * entry.count,
    0,
  ) / totalCount;
  const activationCount = histogram.reduce(
    (sum, entry) => sum + (entry.bin > 0 ? entry.count : 0),
    0,
  );

  return {
    expectedPayout,
    standardDeviation: Math.sqrt(variance),
    activationProb: (activationCount / totalCount) * 100,
    tail: {
      var95: weightedQuantile(histogram, totalCount, 0.95),
      tvar95: weightedTailMean(histogram, totalCount, 0.95),
    },
  };
}

function weightedQuantile(
  histogram: PayoutHistogramEntry[],
  totalCount: number,
  quantile: number,
): number {
  const targetCount = totalCount * quantile;
  let cumulativeCount = 0;

  for (const entry of [...histogram].sort((a, b) => a.bin - b.bin)) {
    cumulativeCount += entry.count;
    if (cumulativeCount >= targetCount) return entry.bin;
  }

  return histogram.reduce((max, entry) => Math.max(max, entry.bin), 0);
}

function weightedTailMean(
  histogram: PayoutHistogramEntry[],
  totalCount: number,
  quantile: number,
): number {
  let remainingTailCount = totalCount * (1 - quantile);
  if (remainingTailCount <= 0) return 0;

  let weightedTailPayout = 0;
  for (const entry of [...histogram].sort((a, b) => b.bin - a.bin)) {
    const includedCount = Math.min(entry.count, remainingTailCount);
    weightedTailPayout += entry.bin * includedCount;
    remainingTailCount -= includedCount;
    if (remainingTailCount <= 0) break;
  }

  return weightedTailPayout / (totalCount * (1 - quantile));
}

function getAdaptationDiscount(input: SimulationInput): number {
  const { drainage, cover } = input.adaptation;
  if (drainage && cover) return 15;
  if (drainage || cover) return 10;
  return 0;
}
