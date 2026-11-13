import type { SimulationInput } from '@/lib/api/contract';

const simulationParamKeys = [
  'strikeMm',
  'exitMm',
  'sumInsured',
  'scenario',
  'drainage',
  'cover',
] as const;

const scenarios = ['normal', 'nino_debil', 'nino_fuerte', 'extraordinario', 'custom'] as const;

export function serializeSimulationInput(
  input: SimulationInput,
  currentParams: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const params = new URLSearchParams(currentParams);
  simulationParamKeys.forEach((key) => params.delete(key));

  params.set('strikeMm', String(input.strikeMm));
  params.set('exitMm', String(input.exitMm));
  params.set('sumInsured', String(input.sumInsured));
  params.set('scenario', input.scenario);
  params.set('drainage', String(input.adaptation.drainage));
  params.set('cover', String(input.adaptation.cover));

  return params;
}

export function deserializeSimulationInput(
  searchParams: URLSearchParams | string,
): Partial<SimulationInput> {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;
  const input: Partial<SimulationInput> = {};

  const strikeMm = readNumber(params, 'strikeMm', 300, 700);
  const exitMm = readNumber(params, 'exitMm', 400, 900);
  const sumInsured = readNumber(params, 'sumInsured', 500, 5000);
  const scenario = params.get('scenario');
  const drainage = readBoolean(params, 'drainage');
  const cover = readBoolean(params, 'cover');

  if (strikeMm !== undefined) input.strikeMm = strikeMm;
  if (exitMm !== undefined) {
    input.exitMm = Math.max(exitMm, (strikeMm ?? 0) + 50);
  }
  if (sumInsured !== undefined) input.sumInsured = sumInsured;
  if (scenario && scenarios.includes(scenario as (typeof scenarios)[number])) {
    input.scenario = scenario as SimulationInput['scenario'];
  }
  if (drainage !== undefined || cover !== undefined) {
    input.adaptation = {
      drainage: drainage ?? false,
      cover: cover ?? false,
    };
  }

  return input;
}

function readNumber(
  params: URLSearchParams,
  key: string,
  min: number,
  max: number,
): number | undefined {
  const value = params.get(key);
  if (value === null || value.trim() === '') return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : undefined;
}

function readBoolean(params: URLSearchParams, key: string): boolean | undefined {
  const value = params.get(key);
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}
