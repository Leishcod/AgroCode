import { DEFAULT_SIMULATION_INPUT, type SimulationInput } from '@/lib/api/contract';

export function validateSimulationInput(input: SimulationInput): SimulationInput {
  const strikeMm = isFiniteNumber(input.strikeMm) && input.strikeMm >= 0
    ? input.strikeMm
    : DEFAULT_SIMULATION_INPUT.strikeMm;
  const exitMm = isFiniteNumber(input.exitMm) && input.exitMm > strikeMm
    ? input.exitMm
    : strikeMm + 50;

  return {
    ...input,
    hectares: isFiniteNumber(input.hectares) && input.hectares > 0
      ? input.hectares
      : DEFAULT_SIMULATION_INPUT.hectares,
    sumInsured: isFiniteNumber(input.sumInsured) && input.sumInsured > 0
      ? input.sumInsured
      : DEFAULT_SIMULATION_INPUT.sumInsured,
    strikeMm,
    exitMm,
    safetyLoading: isFiniteNumber(input.safetyLoading) && input.safetyLoading >= 0
      ? input.safetyLoading
      : DEFAULT_SIMULATION_INPUT.safetyLoading,
    expenseRatio: isFiniteNumber(input.expenseRatio)
      ? Math.min(Math.max(input.expenseRatio, 0), 0.99)
      : DEFAULT_SIMULATION_INPUT.expenseRatio,
    customRainMm: input.customRainMm !== undefined && isFiniteNumber(input.customRainMm)
      ? Math.min(Math.max(input.customRainMm, 0), 900)
      : undefined,
    adaptation: {
      drainage: input.adaptation?.drainage === true,
      cover: input.adaptation?.cover === true,
    },
    portfolio: input.portfolio
      ? {
          ...input.portfolio,
          policies: isFiniteNumber(input.portfolio.policies) && input.portfolio.policies > 0
            ? Math.max(1, Math.floor(input.portfolio.policies))
            : 1,
          fixedCost: isFiniteNumber(input.portfolio.fixedCost)
            ? Math.max(0, input.portfolio.fixedCost)
            : 0,
          variableCost: isFiniteNumber(input.portfolio.variableCost)
            ? Math.max(0, input.portfolio.variableCost)
            : 0,
        }
      : undefined,
  };
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}
