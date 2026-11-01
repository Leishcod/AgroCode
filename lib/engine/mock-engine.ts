import { SimulationInput, SimulationResult } from '@/lib/api/contract';

/**
 * Motor mock en TypeScript puro.
 * Desacoplado de la UI: calcula salidas en memoria de forma sincrónica e instantánea (<5ms).
 * Eliseo (Sistemas) reemplazará o calibrará estas funciones con el modelo de simulación Monte Carlo.
 */
export function calculateMockSimulation(input: SimulationInput): SimulationResult {
  const K = input.strikeMm;
  const S = Math.max(input.exitMm, K + 1);
  const L = input.sumInsured * input.hectares;

  // Lluvia acumulada según escenario
  let rain = 320;
  if (input.scenario === 'nino_debil') rain = 430;
  if (input.scenario === 'nino_fuerte') rain = 550;
  if (input.scenario === 'extraordinario') rain = 780;
  if (input.scenario === 'custom' && input.customRainMm !== undefined) {
    rain = input.customRainMm;
  }

  // Curva de indemnización paramétrica lineal P(R)
  const calcPayout = (r: number) => {
    if (r <= K) return 0;
    if (r >= S) return L;
    return L * ((r - K) / (S - K));
  };

  const scenarioPayout = calcPayout(rain);

  // Malla para graficar P(R)
  const payoutCurve: { rainMm: number; payout: number }[] = [];
  for (let r = 0; r <= 900; r += 25) {
    payoutCurve.push({ rainMm: r, payout: Math.round(calcPayout(r)) });
  }

  // Bonificación / Descuento por prácticas de adaptación (drenaje, cobertura)
  const hasDrainage = input.adaptation.drainage;
  const hasCover = input.adaptation.cover;
  let adaptationPct = 0;
  if (hasDrainage && hasCover) adaptationPct = 15;
  else if (hasDrainage || hasCover) adaptationPct = 10;

  // Estructura de prima técnica y comercial ilustrativa
  const baseExpectedPayout = 120 * input.hectares;
  const safetyAmount = baseExpectedPayout * input.safetyLoading;
  const variableCost = (input.portfolio?.variableCost ?? 20) * input.hectares;
  const fixedCostShare = 100 * input.hectares;
  const rawPremium = baseExpectedPayout + safetyAmount + variableCost + fixedCostShare;

  const discountAmount = rawPremium * (adaptationPct / 100);
  const finalPremium = rawPremium - discountAmount;

  // Serie temporal de lluvia diaria acumulada ilustrativa
  const dailyRain = [
    { date: '01 Dic', cumMm: Math.min(25, rain * 0.05) },
    { date: '15 Dic', cumMm: Math.min(65, rain * 0.12) },
    { date: '01 Ene', cumMm: Math.min(130, rain * 0.25) },
    { date: '20 Ene', cumMm: Math.min(210, rain * 0.40) },
    { date: '10 Feb', cumMm: Math.min(320, rain * 0.60) },
    { date: '28 Feb', cumMm: Math.min(450, rain * 0.78) },
    { date: '15 Mar', cumMm: Math.min(590, rain * 0.90) },
    { date: '30 Abr', cumMm: rain }
  ];

  // Histograma de distribución de pagos simulados (frecuencia de siniestros)
  const payoutHistogram = [
    { bin: 0, count: 790 },
    { bin: Math.round(L * 0.25), count: 85 },
    { bin: Math.round(L * 0.5), count: 55 },
    { bin: Math.round(L * 0.75), count: 35 },
    { bin: Math.round(L), count: 35 }
  ];

  // Métricas financieras y de cartera
  const portfolioPolicies = input.portfolio?.policies ?? 1000;
  const totalFixedCost = input.portfolio?.fixedCost ?? 60000;
  const unitContribution = finalPremium - baseExpectedPayout - variableCost;
  const breakEven = unitContribution > 0 ? Math.ceil(totalFixedCost / unitContribution) : 0;

  return {
    premium: Math.round(finalPremium * 100) / 100,
    expectedPayout: baseExpectedPayout,
    activationProb: 18.2,
    maxPayout: L,
    adaptationDiscount: { amount: Math.round(discountAmount * 100) / 100, pct: adaptationPct },
    lossRatio: 50.0,
    breakEvenPolicies: breakEven,
    payoutCurve,
    dailyRain,
    payoutHistogram,
    tail: { var95: Math.round(L * 0.9), tvar95: L },
    premiumBreakdown: [
      { label: 'Pago esperado a productores', value: baseExpectedPayout },
      { label: 'Recargo de seguridad (lambda)', value: safetyAmount },
      { label: 'Costos operativos por póliza', value: variableCost },
      { label: 'Reserva y margen', value: Math.max(0, fixedCostShare - discountAmount) }
    ],
    scenarioPayout: Math.round(scenarioPayout * 100) / 100
  };
}
