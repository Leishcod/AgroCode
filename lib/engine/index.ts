import type { SimulationInput, SimulationResult } from '@/lib/api/contract';
import { calculatePayoutModel } from '@/lib/engine/payout';
import { calculatePremium } from '@/lib/engine/premium';
import { validateSimulationInput } from '@/lib/engine/validate';

export { calculatePayoutModel } from '@/lib/engine/payout';
export { calculatePremium } from '@/lib/engine/premium';
export { validateSimulationInput } from '@/lib/engine/validate';

export function calculateMockSimulation(input: SimulationInput): SimulationResult {
  const validatedInput = validateSimulationInput(input);
  const payoutModel = calculatePayoutModel(validatedInput);
  const premium = calculatePremium(validatedInput, payoutModel.payoutHistogram);
  const fixedCost = validatedInput.portfolio?.fixedCost ?? 60000;
  const variableCost = validatedInput.portfolio?.variableCost ?? 20;
  const unitContribution = premium.premium - premium.expectedPayout - variableCost;
  const breakEvenPolicies = unitContribution > 0
    ? Math.ceil(fixedCost / unitContribution)
    : 0;

  return {
    premium: roundCurrency(premium.premium),
    expectedPayout: roundCurrency(premium.expectedPayout),
    activationProb: roundCurrency(premium.activationProb),
    maxPayout: roundCurrency(payoutModel.maxPayout),
    adaptationDiscount: {
      amount: roundCurrency(premium.adaptationDiscount.amount),
      pct: premium.adaptationDiscount.pct,
    },
    lossRatio: roundCurrency(premium.lossRatio),
    breakEvenPolicies,
    payoutCurve: payoutModel.payoutCurve,
    dailyRain: payoutModel.dailyRain,
    payoutHistogram: payoutModel.payoutHistogram,
    tail: {
      var95: roundCurrency(premium.tail.var95),
      tvar95: roundCurrency(premium.tail.tvar95),
    },
    premiumBreakdown: premium.premiumBreakdown.map((item) => ({
      ...item,
      value: roundCurrency(item.value),
    })),
    scenarioPayout: roundCurrency(payoutModel.scenarioPayout),
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
