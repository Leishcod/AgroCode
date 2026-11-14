export type SimulationInput = {
  zoneId: string; 
  cropId: string; 
  hectares: number;
  sumInsured: number; // L, S/ por ha
  strikeMm: number; // K
  exitMm: number; // S
  windowStart: string; 
  windowEnd: string;
  adaptation: { drainage: boolean; cover: boolean };
  safetyLoading: number; // lambda
  expenseRatio: number; // g
  scenario: 'normal' | 'nino_debil' | 'nino_fuerte' | 'extraordinario' | 'custom';
  customRainMm?: number;
  portfolio?: { policies: number; fixedCost: number; variableCost: number; adoption: number };
};

export type SimulationResult = {
  premium: number; 
  expectedPayout: number; 
  activationProb: number;
  maxPayout: number; 
  adaptationDiscount: { amount: number; pct: number };
  lossRatio: number; 
  breakEvenPolicies: number;
  payoutCurve: { rainMm: number; payout: number }[];
  dailyRain: { date: string; cumMm: number }[];
  payoutHistogram: { bin: number; count: number }[];
  tail: { var95: number; tvar95: number };
  premiumBreakdown: { label: string; value: number }[];
  scenarioPayout: number;
};

export const DEFAULT_SIMULATION_INPUT: SimulationInput = {
  zoneId: 'piura_medio',
  cropId: 'mango',
  hectares: 1,
  sumInsured: 2000,
  strikeMm: 140,
  exitMm: 200,
  windowStart: '2026-12-01',
  windowEnd: '2027-04-30',
  adaptation: { drainage: false, cover: false },
  safetyLoading: 0.25,
  expenseRatio: 0.30,
  scenario: 'normal',
  customRainMm: 89.47,
  portfolio: { policies: 1000, fixedCost: 60000, variableCost: 20, adoption: 0 }
};
