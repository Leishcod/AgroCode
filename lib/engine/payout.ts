import type { SimulationInput } from '@/lib/api/contract';
import { PIURA_RAINFALL_CALIBRATION, sampleCalibratedRainfall } from '@/lib/engine/calibration';

const DISTRIBUTION_SAMPLE_SIZE = 5_000;
const PAYOUT_HISTOGRAM_BUCKETS = 100;

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

  const portfolioSize = Math.max(1, Math.floor(input.portfolio?.policies ?? 1000));
  const rainfallSample = sampleCalibratedRainfall(DISTRIBUTION_SAMPLE_SIZE);
  const sampleHistogram = new Map<number, number>();
  for (const sampleRain of rainfallSample) {
    const samplePayout = payoutAtRain(sampleRain);
    const bucket = samplePayout === 0
      ? 0
      : Math.min(
          PAYOUT_HISTOGRAM_BUCKETS,
          Math.ceil((samplePayout / maxPayout) * PAYOUT_HISTOGRAM_BUCKETS),
        );
    const bin = bucket === 0 ? 0 : (bucket / PAYOUT_HISTOGRAM_BUCKETS) * maxPayout;
    sampleHistogram.set(bin, (sampleHistogram.get(bin) ?? 0) + 1);
  }
  const payoutHistogram = [...sampleHistogram.entries()]
    .sort(([left], [right]) => left - right)
    .map(([bin, count]) => ({
      bin: Math.round(bin),
      count: (count / rainfallSample.length) * portfolioSize,
    }));
  const lastEntry = payoutHistogram[payoutHistogram.length - 1];
  lastEntry.count += portfolioSize - payoutHistogram.reduce((sum, entry) => sum + entry.count, 0);

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
  if (input.scenario === 'nino_debil') return PIURA_RAINFALL_CALIBRATION.historicSeasons.nino2022_2023;
  if (input.scenario === 'nino_fuerte') return PIURA_RAINFALL_CALIBRATION.historicSeasons.nino2016_2017;
  if (input.scenario === 'extraordinario') return PIURA_RAINFALL_CALIBRATION.historicSeasons.nino1997_1998;
  if (input.scenario === 'custom' && input.customRainMm !== undefined) {
    return input.customRainMm;
  }
  return PIURA_RAINFALL_CALIBRATION.meanRainMm;
}
